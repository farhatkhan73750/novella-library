import { describe, it, expect, beforeAll, afterAll, beforeEach } from "@jest/globals";
import request from "supertest";
import {
  connectTestDb,
  disconnectTestDb,
  clearDb,
  createUser,
  createBook,
  auth,
} from "./helpers.js";
import app from "../src/app.js";
import User from "../src/models/User.js";
import Subscription from "../src/models/Subscription.js";
import { signWebhook } from "../src/services/mockGateway.js";

const DAY = 24 * 60 * 60 * 1000;

const checkout = (token, body = {}) =>
  request(app).post("/api/subscriptions/checkout").set(auth(token)).send(body);

// The full purchase: order, fake terminal receipt, confirmation
const buy = async (token) => {
  const order = await checkout(token);
  const orderId = order.body.order.id;
  const receipt = await request(app)
    .post("/api/subscriptions/mock-pay")
    .set(auth(token))
    .send({ orderId });
  const confirm = await request(app)
    .post("/api/subscriptions/confirm")
    .set(auth(token))
    .send(receipt.body);
  return { orderId, receipt: receipt.body, confirm };
};

// A webhook call signed the way the gateway would sign it
const sendWebhook = (body, signature = signWebhook(body)) =>
  request(app)
    .post("/api/subscriptions/webhook")
    .set("Content-Type", "application/json")
    .set("x-webhook-signature", signature)
    .send(body);

describe("subscriptions and payments", () => {
  beforeAll(connectTestDb);
  afterAll(disconnectTestDb);
  beforeEach(clearDb);

  it("shows the plans publicly, with the price in paise", async () => {
    const res = await request(app).get("/api/subscriptions/plans");
    expect(res.status).toBe(200);
    expect(res.body.plans.monthly.amount).toBe(19900);
  });

  describe("checkout", () => {
    it("requires a login", async () => {
      const res = await request(app).post("/api/subscriptions/checkout").send({});
      expect(res.status).toBe(401);
    });

    it("uses the server's price and ignores any amount from the client", async () => {
      const { token } = await createUser("user");
      const res = await checkout(token, { plan: "monthly", amount: 1 });
      expect(res.status).toBe(201);

      const saved = await Subscription.findOne({ orderId: res.body.order.id });
      expect(saved.amount).toBe(19900);
      expect(saved.status).toBe("created");
    });

    it("rejects unknown plans, including tricky names", async () => {
      const { token } = await createUser("user");
      expect((await checkout(token, { plan: "free" })).status).toBe(400);
      expect((await checkout(token, { plan: "constructor" })).status).toBe(400);
    });
  });

  describe("confirming a payment", () => {
    it("rejects a forged signature and changes nothing", async () => {
      const { user, token } = await createUser("user");
      const order = await checkout(token);

      const res = await request(app)
        .post("/api/subscriptions/confirm")
        .set(auth(token))
        .send({ orderId: order.body.order.id, paymentId: "pay_fake", signature: "abc" });

      expect(res.status).toBe(400);
      expect((await User.findById(user._id)).role).toBe("user");
    });

    it("upgrades the user after a valid payment", async () => {
      const { user, token } = await createUser("user");
      const { confirm } = await buy(token);

      expect(confirm.status).toBe(200);
      expect(confirm.body.role).toBe("subscriber");
      expect(new Date(confirm.body.subscription.endsAt).getTime()).toBeGreaterThan(Date.now());

      const saved = await User.findById(user._id);
      expect(saved.role).toBe("subscriber");
      expect(saved.subscriptionEndsAt).toBeTruthy();
    });

    it("is idempotent: confirming twice does not extend the plan", async () => {
      const { token } = await createUser("user");
      const { receipt, confirm } = await buy(token);

      const again = await request(app)
        .post("/api/subscriptions/confirm")
        .set(auth(token))
        .send(receipt);

      expect(again.status).toBe(200);
      expect(again.body.subscription.endsAt).toBe(confirm.body.subscription.endsAt);
    });

    it("does not let one user confirm or pay another user's order", async () => {
      const owner = await createUser("user");
      const thief = await createUser("user");
      const order = await checkout(owner.token);

      const res = await request(app)
        .post("/api/subscriptions/mock-pay")
        .set(auth(thief.token))
        .send({ orderId: order.body.order.id });
      expect(res.status).toBe(404);
    });

    it("stacks a second month after the first", async () => {
      const { token } = await createUser("user");
      const first = await buy(token);
      const second = await buy(token);

      const gap =
        new Date(second.confirm.body.subscription.endsAt) -
        new Date(first.confirm.body.subscription.endsAt);
      expect(gap).toBeGreaterThan(29 * DAY);
      expect(gap).toBeLessThan(31 * DAY);
    });

    it("keeps admins as admins", async () => {
      const { user, token } = await createUser("admin");
      await buy(token);
      expect((await User.findById(user._id)).role).toBe("admin");
    });
  });

  describe("webhook", () => {
    it("rejects a missing or wrong signature", async () => {
      const body = JSON.stringify({ event: "payment.captured", data: {} });

      const noSignature = await request(app)
        .post("/api/subscriptions/webhook")
        .set("Content-Type", "application/json")
        .send(body);
      expect(noSignature.status).toBe(400);

      expect((await sendWebhook(body, "wrong")).status).toBe(400);
    });

    it("rejects a body that was changed after signing", async () => {
      const signed = JSON.stringify({ event: "payment.captured", data: { orderId: "a" } });
      const tampered = JSON.stringify({ event: "payment.captured", data: { orderId: "b" } });
      const res = await sendWebhook(tampered, signWebhook(signed));
      expect(res.status).toBe(400);
    });

    it("activates the plan from a correctly signed event, and ignores repeats", async () => {
      const { user, token } = await createUser("user");
      const order = await checkout(token);
      const body = JSON.stringify({
        event: "payment.captured",
        data: { orderId: order.body.order.id, paymentId: "pay_test_1" },
      });

      const first = await sendWebhook(body);
      expect(first.status).toBe(200);
      const afterFirst = await User.findById(user._id);
      expect(afterFirst.role).toBe("subscriber");

      const repeat = await sendWebhook(body);
      expect(repeat.status).toBe(200);
      const afterRepeat = await User.findById(user._id);
      expect(afterRepeat.subscriptionEndsAt.getTime()).toBe(afterFirst.subscriptionEndsAt.getTime());
      expect(await Subscription.countDocuments({ status: "active" })).toBe(1);
    });
  });

  describe("expiry", () => {
    it("downgrades an expired subscriber on their next request", async () => {
      const { user, token } = await createUser("subscriber", {
        subscriptionEndsAt: new Date(Date.now() - 1000),
      });
      const premium = await createBook({ accessLevel: "premium" });

      const res = await request(app)
        .get(`/api/reading/${premium._id}/chapters/1`)
        .set(auth(token));
      expect(res.status).toBe(403);
      expect((await User.findById(user._id)).role).toBe("user");
    });

    it("keeps a subscriber whose plan has not ended", async () => {
      const { token } = await createUser("subscriber", {
        subscriptionEndsAt: new Date(Date.now() + DAY),
      });
      const premium = await createBook({ accessLevel: "premium" });

      const res = await request(app)
        .get(`/api/reading/${premium._id}/chapters/1`)
        .set(auth(token));
      expect(res.status).toBe(200);
    });
  });

  describe("testing-only routes", () => {
    it("are hidden (404) when ALLOW_MOCK_PAYMENTS is not true", async () => {
      const { token } = await createUser("user");
      process.env.ALLOW_MOCK_PAYMENTS = "false";
      try {
        const res = await request(app)
          .post("/api/subscriptions/mock-pay")
          .set(auth(token))
          .send({ orderId: "anything" });
        expect(res.status).toBe(404);
      } finally {
        process.env.ALLOW_MOCK_PAYMENTS = "true";
      }
    });
  });
});