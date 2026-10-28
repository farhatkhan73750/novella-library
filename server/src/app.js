import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import authRoutes from "./routes/authRoutes.js";
import bookRoutes from "./routes/bookRoutes.js";
import readingRoutes from "./routes/readingRoutes.js";
import subscriptionRoutes from "./routes/subscriptionRoutes.js";
import recommendationRoutes from "./routes/recommendationRoutes.js";
import { apiLimiter } from "./middleware/rateLimiters.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";

const app = express();

// Behind a hosting proxy (Render, Railway, ...) the real visitor IP arrives in a header.
// Trust exactly one proxy in production, so rate limits count the visitor, not the proxy.
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// CLIENT_URL may hold several addresses separated by commas
const allowedOrigins = (process.env.CLIENT_URL || "")
  .split(",")
  .map((origin) => origin.trim().replace(/\/+$/, ""))
  .filter(Boolean);

// ----- Middleware (order matters) -----
app.use(helmet());
app.use(cors({ origin: allowedOrigins }));
if (process.env.NODE_ENV !== "test") app.use(morgan("dev"));
app.use("/api", apiLimiter); // before body parsing, so floods are rejected cheaply
app.use(
  express.json({
    limit: "1mb",
    verify: (req, res, buf) => {
      req.rawBody = buf; // exact bytes, needed to check webhook signatures
    },
  })
);

// ----- Routes -----
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", app: "Novella API" });
});

app.use("/api/auth", authRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/reading", readingRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/recommendations", recommendationRoutes);

// ----- Last: 404, then errors -----
app.use(notFound);
app.use(errorHandler);

export default app;