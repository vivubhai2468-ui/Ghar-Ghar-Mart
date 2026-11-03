import "dotenv/config";
import express from "express";
import { rateLimit } from "express-rate-limit";
import { createServer } from "http";
import path from "path";
import { randomUUID } from "crypto";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { getHTTPStatusCodeFromError } from "@trpc/server/http";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { logServerError } from "./logger";
import { getDb, getProductImageBlob } from "../db";
import { ADMIN_PREVIEW_OPEN_ID_PREFIX, sdk } from "./sdk";

async function startServer() {
  const app = express();
  const server = createServer(app);
  const adminLoginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: "Too many login attempts. Please try again later.",
    },
  });

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

  app.post("/api/admin/preview-login", adminLoginLimiter, async (req, res) => {
    const username =
      typeof req.body?.username === "string"
        ? req.body.username.trim()
        : "";

    const password =
      typeof req.body?.password === "string"
        ? req.body.password
        : "";

    const expectedUsername = process.env.ADMIN_PREVIEW_USERNAME;
    const expectedPassword = process.env.ADMIN_PREVIEW_PASSWORD;

    // Fail closed if administrator credentials are not configured.
    if (!expectedUsername || !expectedPassword) {
      console.error("Admin login is disabled: credentials are not configured.");
      res.status(503).json({
        error: "Administrator login is temporarily unavailable",
      });
      return;
    }

    if (username !== expectedUsername || password !== expectedPassword) {
      res.status(401).json({
        error: "Invalid administrator credentials",
      });
      return;
    }

    const token = await sdk.createSessionToken(
      `${ADMIN_PREVIEW_OPEN_ID_PREFIX}${username}`,
      {
        name: "Ghar Ghar Mart Administrator",
        expiresInMs: 8 * 60 * 60 * 1000,
      },
    );
    res.json({ token });
  });

  app.get("/api/admin/session", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);

      if (!user || user.role !== "admin") {
        res.status(401).json({
          error: "Invalid or expired administrator session",
        });
        return;
      }

      res.json({
        authenticated: true,
        name: user.name,
      });
    } catch (error) {
      console.error("Admin session verification failed.");

      res.status(401).json({
        error: "Invalid or expired administrator session",
      });
    }
  });

  const webDist = path.resolve(process.cwd(), "dist-web");
  app.use(express.static(webDist, { extensions: ["html"] }));

  registerStorageProxy(app);
  registerOAuthRoutes(app);

  app.get("/api/product-images/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);

      if (!Number.isSafeInteger(id) || id <= 0) {
        res.status(400).send("Invalid image ID");
        return;
      }

      const image = await getProductImageBlob(id);

      if (!image) {
        res.status(404).send("Image not found");
        return;
      }

      res.set({
        "Content-Type": image.mimeType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      });

      res.send(image.imageData);
    } catch (error) {
      console.error("[ProductImage] Failed to serve image:", error);
      res.status(500).send("Could not load image");
    }
  });

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

  const port = Number(process.env.PORT || 3000);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT configuration: ${process.env.PORT}`);
  }

  app.use((error: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logServerError({ req, res, error });
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error", requestId: String(res.locals.requestId ?? "unknown") });
    }
  });

  server.listen(port, "0.0.0.0", () => {
    console.log(`[api] server listening on 0.0.0.0:${port}`);
  });
}

startServer().catch(console.error);
