import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { setupAuth } from "./auth";
import { startBot, getBotClient } from "./bot/index";
import { WebSocketServer, WebSocket } from "ws";
import { configEvents } from "./configService";
import { pool } from "./db";
import { ensureRuntimeSchema } from "./runtime-schema";
import path from "path";

const app = express();
const trustProxy = process.env.TRUST_PROXY ?? "1";
app.set("trust proxy", trustProxy === "true" ? true : /^\d+$/.test(trustProxy) ? Number(trustProxy) : 1);
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    limit: "15mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));
app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

app.use("/api", (req, res, next) => {
  // Authenticated dashboard data must not be served from a stale browser cache
  // because access can change per session/user and 304 responses can strand the UI
  // on a server it no longer has permission to open.
  req.headers["if-none-match"] = undefined;
  req.headers["if-modified-since"] = undefined;
  res.setHeader("Cache-Control", "private, no-store, no-cache, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.vary("Cookie");
  next();
});

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
  const requestPath = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (requestPath.startsWith("/api")) {
      let logLine = `${req.method} ${requestPath} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        const compact = JSON.stringify(capturedJsonResponse);
        logLine += ` :: ${compact.length > 400 ? compact.slice(0, 400) + "..." : compact}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await ensureRuntimeSchema();
  await setupAuth(app);
  await registerRoutes(httpServer, app);
  app.use("/api", (_req, res) => {
    return res.status(404).json({ message: "Not found" });
  });

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

  const wss = new WebSocketServer({ noServer: true });
  const wsClients = new Map<number, Set<WebSocket>>();

  httpServer.on("upgrade", (request, socket, head) => {
    const pathname = new URL(request.url || "/", "http://localhost").pathname;
    if (pathname === "/ws") {
      wss.handleUpgrade(request, socket as any, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    }
  });

  wss.on("connection", (ws, req) => {
    const url = new URL(req.url || "/", `http://localhost`);
    const serverIdRaw = url.searchParams.get("serverId");
    const serverId = serverIdRaw ? parseInt(serverIdRaw) : null;
    if (!serverId || isNaN(serverId)) {
      ws.close();
      return;
    }

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
    for (const ws of Array.from(clients)) {
      if (ws.readyState === WebSocket.OPEN) ws.send(msg);
    }
  });
})();
