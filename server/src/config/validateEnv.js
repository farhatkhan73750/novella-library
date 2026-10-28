const REQUIRED = [
  "MONGO_URI",
  "JWT_SECRET",
  "CLIENT_URL",
  "PAYMENT_SECRET",
  "WEBHOOK_SECRET",
];

// Throws if the app must not start. Returns a list of warnings otherwise.
export const validateEnv = () => {
  const missing = REQUIRED.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(", ")}`);
  }

  const warnings = [];

  if (process.env.NODE_ENV === "production") {
    if (process.env.JWT_SECRET.length < 32) {
      throw new Error("JWT_SECRET must be at least 32 characters in production");
    }
    if (process.env.ALLOW_MOCK_PAYMENTS === "true") {
      warnings.push(
        "ALLOW_MOCK_PAYMENTS is true. The simulated payment routes are enabled. Fine for a demo, never for real money."
      );
    }
  }

  return warnings;
};