import "./setupEnv.js";
import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { jest } from "@jest/globals";
import request from "supertest";
import app from "../src/app.js";
import { errorHandler } from "../src/middleware/errorHandler.js";
import { validateEnv } from "../src/config/validateEnv.js";

// Run a function with some environment variables changed, then put them back
const withEnv = (changes, fn) => {
  const saved = {};
  for (const key of Object.keys(changes)) {
    saved[key] = process.env[key];
    if (changes[key] === undefined) delete process.env[key];
    else process.env[key] = changes[key];
  }
  try {
    return fn();
  } finally {
    for (const key of Object.keys(saved)) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
};

describe("request body size limit", () => {
  it("rejects a body over 1 MB with 413 and a JSON message", async () => {
    const huge = JSON.stringify({ email: "a".repeat(1_200_000), password: "x" });
    const res = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send(huge);
    expect(res.status).toBe(413);
    expect(res.body.message).toMatch(/too large/i);
  });
});

describe("global rate limit", () => {
  beforeAll(() => {
    process.env.ENABLE_RATE_LIMIT_IN_TEST = "true";
    process.env.API_RATE_LIMIT = "3";
  });
  afterAll(() => {
    delete process.env.ENABLE_RATE_LIMIT_IN_TEST;
    delete process.env.API_RATE_LIMIT;
  });

  it("returns 429 after the limit, but keeps the health check open", async () => {
    for (let i = 0; i < 3; i++) {
      const ok = await request(app).get("/api/subscriptions/plans");
      expect(ok.status).toBe(200);
    }

    const blocked = await request(app).get("/api/subscriptions/plans");
    expect(blocked.status).toBe(429);
    expect(blocked.body.message).toMatch(/too many/i);

    const health = await request(app).get("/api/health");
    expect(health.status).toBe(200);
  });
});

describe("error handler", () => {
  let spy;
  beforeAll(() => {
    spy = jest.spyOn(console, "error").mockImplementation(() => {});
  });
  afterAll(() => spy.mockRestore());

  // Call the handler directly with a fake response object
  const run = (err, nodeEnv = "development") =>
    withEnv({ NODE_ENV: nodeEnv }, () => {
      const res = {
        statusCode: null,
        body: null,
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(body) {
          this.body = body;
          return this;
        },
      };
      errorHandler(err, {}, res, () => {});
      return res;
    });

  it("shows the real message for server faults in development", () => {
    const res = run(new Error("db password is hunter2"));
    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe("db password is hunter2");
  });

  it("hides the details of server faults in production", () => {
    const res = run(new Error("db password is hunter2"), "production");
    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe("Something went wrong");
  });

  it("keeps deliberate client-error messages in production", () => {
    const err = Object.assign(new Error("Invalid email or password"), { statusCode: 401 });
    const res = run(err, "production");
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe("Invalid email or password");
  });

  it("turns Mongoose validation errors into one 400 message", () => {
    const err = {
      name: "ValidationError",
      errors: { a: { message: "Title is required" }, b: { message: "Author is required" } },
    };
    const res = run(err);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Title is required, Author is required");
  });

  it("maps an oversized body to 413", () => {
    const res = run(Object.assign(new Error("too big"), { type: "entity.too.large" }));
    expect(res.statusCode).toBe(413);
  });
});

describe("startup checks (validateEnv)", () => {
  const good = {
    MONGO_URI: "mongodb://localhost/x",
    JWT_SECRET: "a".repeat(40),
    CLIENT_URL: "http://localhost:5173",
    PAYMENT_SECRET: "p",
    WEBHOOK_SECRET: "w",
    NODE_ENV: "production",
    ALLOW_MOCK_PAYMENTS: "false",
  };

  it("accepts a complete, strong configuration", () => {
    expect(withEnv(good, () => validateEnv())).toEqual([]);
  });

  it("names the missing variables", () => {
    expect(() => withEnv({ ...good, JWT_SECRET: undefined }, () => validateEnv())).toThrow(
      /JWT_SECRET/
    );
  });

  it("refuses a short JWT secret in production, and warns about mock payments", () => {
    expect(() => withEnv({ ...good, JWT_SECRET: "short" }, () => validateEnv())).toThrow(
      /at least 32/
    );

    const warnings = withEnv({ ...good, ALLOW_MOCK_PAYMENTS: "true" }, () => validateEnv());
    expect(warnings).toHaveLength(1);
  });
});