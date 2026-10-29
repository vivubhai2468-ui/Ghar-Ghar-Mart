import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import path from "path";
import { randomUUID } from "crypto";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { getHTTPStatusCodeFromError } from "@trpc/server/http";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { logServerError } from "./logger";
import { getDb } from "../db";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  app.use((req, res, next) => {
    const incomingRequestId = req.header("x-request-id")?.trim();
    const requestId = incomingRequestId ? incomingRequestId.slice(0, 128) : randomUUID();
    res.locals.requestId = requestId;
    res.locals.requestStartedAt = Date.now();
    res.setHeader("x-request-id", requestId);
    next();
  });

  // Enable CORS for all routes - reflect the request origin to support credentials
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.header("Access-Control-Allow-Origin", origin);
    }
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization",
    );
    res.header("Access-Control-Allow-Credentials", "true");

    // Handle preflight requests
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  const webDist = path.resolve(process.cwd(), "dist-web");
  app.use(express.static(webDist, { extensions: ["html"] }));

  registerStorageProxy(app);
  registerOAuthRoutes(app);

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, timestamp: Date.now() });
  });

  app.get("/api/ready", async (_req, res) => {
    try {
      const db = await getDb();
      if (!db) {
        res.status(503).json({ ok: false, database: "not_configured" });
        return;
      }
      await db.execute("SELECT 1");
      res.json({ ok: true, database: "connected" });
    } catch (error) {
      console.error("[api] readiness check failed", error);
      res.status(503).json({ ok: false, database: "unavailable" });
    }
  });

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
      onError({ error, req, ctx, path }) {
        if (ctx?.res) {
          logServerError({ req, res: ctx.res, error, statusCode: getHTTPStatusCodeFromError(error), trpcPath: path });
        } else {
          console.error(JSON.stringify({ event: "server_error", requestId: "unknown", method: req.method, path: req.path, statusCode: getHTTPStatusCodeFromError(error), durationMs: 0, errorName: error.name, errorMessage: error.message, trpcPath: path }));
        }
      },
    }),
  );

  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/") || req.path === "/api") return next();
    res.sendFile(path.join(webDist, "index.html"), (error) => {
      if (error && !res.headersSent) next();
    });
  });

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  app.use((error: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logServerError({ req, res, error });
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error", requestId: String(res.locals.requestId ?? "unknown") });
    }
  });

  server.listen(port, () => {
    console.log(`[api] server listening on port ${port}`);
  });
}

startServer().catch(console.error);
