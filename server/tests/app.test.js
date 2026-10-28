import "./setupEnv.js";
import { describe, it, expect } from "@jest/globals";
import request from "supertest";
import app from "../src/app.js";

describe("app basics", () => {
  it("answers the health check", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok", app: "Novella API" });
  });

  it("returns a JSON 404 for unknown routes", async () => {
    const res = await request(app).get("/api/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Route not found");
  });

  it("returns 400 for malformed JSON instead of crashing", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send('{"email": ');
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Invalid JSON in request body");
  });

  it("sets security headers and hides the framework name", async () => {
    const res = await request(app).get("/api/health");
    expect(res.headers["x-powered-by"]).toBeUndefined();
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("does not allow an unknown website origin through CORS", async () => {
    const res = await request(app)
      .get("/api/health")
      .set("Origin", "http://evil.example");
    expect(res.headers["access-control-allow-origin"]).not.toBe("http://evil.example");
  });
});