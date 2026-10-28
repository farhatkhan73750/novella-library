import rateLimit from "express-rate-limit";

// A generous limit for the whole API (the strict login limit lives in authRoutes.js)
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  // A function, so the value is read on each request (tests change it)
  limit: () => Number(process.env.API_RATE_LIMIT) || 600,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many requests, please slow down and try again shortly" },
  skip: (req) =>
    // Off while testing, unless a test switches it on
    (process.env.NODE_ENV === "test" && process.env.ENABLE_RATE_LIMIT_IN_TEST !== "true") ||
    // Hosting platforms ping /health, and the payment gateway calls the webhook
    req.path === "/health" ||
    req.path === "/subscriptions/webhook",
});