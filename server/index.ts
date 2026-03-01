import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { setupAuth } from "./auth";
import { registerStripeRoutes } from "./stripe";
import { WebhookHandlers } from "./webhookHandlers";
import { startBot, getBotClient } from "./bot/index";
import { WebSocketServer, WebSocket } from "ws";
import { configEvents } from "./configService";
import { pool } from "./db";

const app = express();
const trustProxy = process.env.TRUST_PROXY ?? "1";
app.set("trust proxy", trustProxy === "true" ? true : /^\d+$/.test(trustProxy) ? Number(trustProxy) : 1);
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signature = req.headers["stripe-signature"];
    if (!signature) {
      return res.status(400).json({ error: "Missing stripe-signature" });
    }
    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;
      await WebhookHandlers.processWebhook(req.body as Buffer, sig);
      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error("Webhook error:", error.message);
      res.status(400).json({ error: "Webhook processing error" });
    }
  }
);

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        const compact = JSON.stringify(capturedJsonResponse);
        logLine += ` :: ${compact.length > 400 ? compact.slice(0, 400) + "…" : compact}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await setupAuth(app);

  async function initStripe() {
    try {
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) return;

      // Replit Stripe sync requires Replit connector identity; skip quietly on DO/self-hosted deployments.
      if (!process.env.REPLIT_CONNECTORS_HOSTNAME || (!process.env.REPL_IDENTITY && !process.env.WEB_REPL_RENEWAL)) {
        console.log("Stripe sync init skipped (non-Replit environment)");
        return;
      }

      const { runMigrations } = await import("stripe-replit-sync");
      console.log("Initializing Stripe schema...");
      await (runMigrations as any)({ databaseUrl, schema: "stripe" });
      console.log("Stripe schema ready");

      const { getStripeSync } = await import("./stripeClient");
      const stripeSync = await getStripeSync();

      const domain = process.env.APP_URL || process.env.PUBLIC_BASE_URL || (process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}` : null);
      if (domain) {
        try {
          const whResult = await stripeSync.findOrCreateManagedWebhook(
            `${domain.replace(/\/$/, "")}/api/stripe/webhook`
          );
          const webhook = whResult?.webhook ?? whResult;
          console.log(`Webhook configured: ${webhook?.url ?? "unknown"}`);
        } catch (whErr: any) {
          console.log("Stripe webhook setup skipped:", whErr.message);
        }
      } else {
        console.log("Stripe webhook setup skipped (no public domain)");
      }

      stripeSync
        .syncBackfill()
        .then(() => console.log("Stripe data synced"))
        .catch((err: any) => console.error("Stripe sync error:", err.message));
    } catch (err: any) {
      if (!err.message?.includes("connection not found") && !err.message?.includes("X-Replit-Token")) {
        console.error("Stripe init error (non-fatal):", err.message);
      }
    }
  }

  await initStripe();

  registerStripeRoutes(app);

  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );

  startBot().catch((err) => console.error("Bot startup error:", err));

  // --- GRACEFUL SHUTDOWN ---
  function shutdown() {
    log("Shutting down gracefully...");
    getBotClient()?.destroy();
    httpServer.close(() => {
      pool.end().then(() => process.exit(0)).catch(() => process.exit(0));
    });
    setTimeout(() => process.exit(0), 8000);
  }
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  // --- WEBSOCKET SERVER ---
  // Use noServer:true so we can selectively handle only /ws upgrades,
  // leaving /vite-hmr and other paths untouched for Vite HMR to handle.
  const wss = new WebSocketServer({ noServer: true });
  const wsClients = new Map<number, Set<WebSocket>>();

  httpServer.on("upgrade", (request, socket, head) => {
    const pathname = new URL(request.url || "/", "http://localhost").pathname;
    if (pathname === "/ws") {
      wss.handleUpgrade(request, socket as any, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    }
    // All other paths (e.g. /vite-hmr) are left for Vite to handle.
  });

  wss.on("connection", (ws, req) => {
    const url = new URL(req.url || "/", `http://localhost`);
    const serverIdRaw = url.searchParams.get("serverId");
    const serverId = serverIdRaw ? parseInt(serverIdRaw) : null;
    if (!serverId || isNaN(serverId)) { ws.close(); return; }

    if (!wsClients.has(serverId)) wsClients.set(serverId, new Set());
    wsClients.get(serverId)!.add(ws);

    ws.on("close", () => {
      wsClients.get(serverId)?.delete(ws);
    });
  });

  configEvents.on("config.updated", ({ serverId, moduleId }: { serverId: number; moduleId: string }) => {
    const clients = wsClients.get(serverId);
    if (!clients) return;
    const msg = JSON.stringify({ type: "config.updated", serverId, moduleId });
    for (const ws of clients) {
      if (ws.readyState === WebSocket.OPEN) ws.send(msg);
    }
  });
})();
