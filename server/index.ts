import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { setupAuth } from "./auth";
import { registerStripeRoutes } from "./stripe";
import { WebhookHandlers } from "./webhookHandlers";
import { startBot } from "./bot/index";
import { WebSocketServer, WebSocket } from "ws";
import { configEvents } from "./configService";

const app = express();
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

setupAuth(app);

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
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  async function initStripe() {
    try {
      const { runMigrations } = await import("stripe-replit-sync");
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) return;

      console.log("Initializing Stripe schema...");
      await (runMigrations as any)({ databaseUrl, schema: "stripe" });
      console.log("Stripe schema ready");

      const { getStripeSync } = await import("./stripeClient");
      const stripeSync = await getStripeSync();

      const domain = process.env.REPLIT_DOMAINS?.split(",")[0];
      if (domain) {
        const webhookBaseUrl = `https://${domain}`;
        try {
          const { webhook } = await stripeSync.findOrCreateManagedWebhook(
            `${webhookBaseUrl}/api/stripe/webhook`
          );
          console.log(`Webhook configured: ${webhook.url}`);
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
      console.error("Stripe init error (non-fatal):", err.message);
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

  // --- WEBSOCKET SERVER ---
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  const wsClients = new Map<number, Set<WebSocket>>();

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
