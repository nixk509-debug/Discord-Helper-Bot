import express, { type Express } from "express";
import fs from "fs";
import path from "path";

function isBlockedStaticPath(requestPath: string) {
  if (requestPath.startsWith("/api/")) return true;
  if (requestPath === "/api") return true;
  if (requestPath.startsWith("/.well-known/")) return false;
  return requestPath.split("/").some((segment) => segment.startsWith(".") && segment.length > 1);
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use((req, res, next) => {
    if (!isBlockedStaticPath(req.path)) return next();
    if (req.path.startsWith("/api")) {
      return res.status(404).json({ message: "Not found" });
    }
    return res.status(404).send("Not found");
  });

  app.use(express.static(distPath, {
    dotfiles: "deny",
    fallthrough: true,
  }));

  // fall through to index.html if the file doesn't exist
  app.use("/{*path}", (req, res) => {
    if (isBlockedStaticPath(req.path)) {
      if (req.path.startsWith("/api")) {
        return res.status(404).json({ message: "Not found" });
      }
      return res.status(404).send("Not found");
    }
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
