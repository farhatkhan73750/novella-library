import { describe, it, expect, beforeAll, afterAll, beforeEach } from "@jest/globals";
import request from "supertest";
import jwt from "jsonwebtoken";
import { connectTestDb, disconnectTestDb, clearDb, createUser, auth } from "./helpers.js";
import app from "../src/app.js";
import User from "../src/models/User.js";

const newUser = { name: "Ann", email: "ann@test.com", password: "password123" };

describe("authentication and roles", () => {
  beforeAll(connectTestDb);
  afterAll(disconnectTestDb);
  beforeEach(clearDb);

  describe("POST /api/auth/register", () => {
    it("creates a user and never returns the password", async () => {
      const res = await request(app).post("/api/auth/register").send(newUser);
      expect(res.status).toBe(201);
      expect(res.body.token).toBeTruthy();
      expect(res.body.user.role).toBe("user");
      expect(res.body.user.password).toBeUndefined();
    });

    it("stores only a bcrypt hash, never the real password", async () => {
      await request(app).post("/api/auth/register").send(newUser);
      const saved = await User.findOne({ email: newUser.email }).select("+password");
      expect(saved.password).not.toBe(newUser.password);
      expect(saved.password).toMatch(/^\$2[aby]\$12\$/);
    });

    it("ignores a role sent by the client (no self-made admins)", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ ...newUser, role: "admin" });
      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe("user");
    });

    it("rejects a duplicate email, even in different letter case", async () => {
      await request(app).post("/api/auth/register").send(newUser);
      const res = await request(app)
        .post("/api/auth/register")
        .send({ ...newUser, email: "ANN@test.com" });
      expect(res.status).toBe(409);
    });

    it("rejects a short password", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ ...newUser, password: "short" });
      expect(res.status).toBe(400);
    });

    it("rejects missing fields", async () => {
      const res = await request(app).post("/api/auth/register").send({ email: "x@test.com" });
      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/auth/login", () => {
    it("logs in with the right password", async () => {
      const { user } = await createUser();
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: user.email, password: "password123" });
      expect(res.status).toBe(200);
      expect(res.body.token).toBeTruthy();
    });

    it("gives the same message for a wrong password and an unknown email", async () => {
      const { user } = await createUser();
      const wrongPassword = await request(app)
        .post("/api/auth/login")
        .send({ email: user.email, password: "wrongpassword" });
      const unknownEmail = await request(app)
        .post("/api/auth/login")
        .send({ email: "nobody@test.com", password: "password123" });

      expect(wrongPassword.status).toBe(401);
      expect(unknownEmail.status).toBe(401);
      expect(wrongPassword.body.message).toBe(unknownEmail.body.message);
    });

    it("rejects an object where an email string is expected (NoSQL injection)", async () => {
      await createUser();
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: { $gt: "" }, password: "password123" });
      expect(res.status).toBe(400);
      expect(res.body.token).toBeUndefined();
    });
  });

  describe("tokens and the protect middleware", () => {
    it("blocks /me without a token, allows it with one", async () => {
      const { token } = await createUser();

      const guest = await request(app).get("/api/auth/me");
      expect(guest.status).toBe(401);

      const member = await request(app).get("/api/auth/me").set(auth(token));
      expect(member.status).toBe(200);
      expect(member.body.user.email).toMatch(/@test\.com$/);
    });

    it("rejects a tampered token", async () => {
      const { token } = await createUser();
      const res = await request(app).get("/api/auth/me").set(auth(`${token}x`));
      expect(res.status).toBe(401);
    });

    it("rejects an expired token", async () => {
      const { user } = await createUser();
      const expired = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: -10 });
      const res = await request(app).get("/api/auth/me").set(auth(expired));
      expect(res.status).toBe(401);
    });

    it("rejects a token whose user was deleted", async () => {
      const { user, token } = await createUser();
      await User.deleteOne({ _id: user._id });
      const res = await request(app).get("/api/auth/me").set(auth(token));
      expect(res.status).toBe(401);
    });
  });

  describe("role checks (authorize)", () => {
    it("gives a normal user 403 and an admin 200 on the admin test route", async () => {
      const normal = await createUser("user");
      const admin = await createUser("admin");

      const forbidden = await request(app).get("/api/auth/admin-test").set(auth(normal.token));
      expect(forbidden.status).toBe(403);

      const allowed = await request(app).get("/api/auth/admin-test").set(auth(admin.token));
      expect(allowed.status).toBe(200);
    });
  });
});