import Subscription from "../models/Subscription.js";
import User from "../models/User.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { PLANS } from "../config/plans.js";
import {
  createOrder,
  createPaymentId,
  signPayment,
  verifyPayment,
  signWebhook,
  verifyWebhook,
} from "../services/mockGateway.js";
import { activateSubscription } from "../services/subscriptionService.js";

const isString = (v) => typeof v === "string";


const findMyOrder = async (orderId, userId) => {
  if (!isString(orderId)) throw new AppError("orderId is required", 400);
  const sub = await Subscription.findOne({ orderId, user: userId });
  if (!sub) throw new AppError("Order not found", 404);
  return sub;
};


export const getPlans = (req, res) => {
  res.json({ plans: PLANS });
};


export const checkout = asyncHandler(async (req, res) => {
  const planKey = req.body?.plan ?? "monthly";
  if (!isString(planKey) || !Object.hasOwn(PLANS, planKey)) {
    throw new AppError("Unknown plan", 400);
  }
  const plan = PLANS[planKey];

  const order = createOrder(plan);
  await Subscription.create({
    user: req.user._id,
    plan: planKey,
    amount: plan.amount,
    currency: plan.currency,
    orderId: order.id,
  });

  res.status(201).json({ order, plan: { key: planKey, ...plan } });
});


export const confirm = asyncHandler(async (req, res) => {
  const { orderId, paymentId, signature } = req.body || {};
  if (![orderId, paymentId, signature].every(isString)) {
    throw new AppError("orderId, paymentId and signature are required", 400);
  }

  await findMyOrder(orderId, req.user._id);

  if (!verifyPayment(orderId, paymentId, signature)) {
    throw new AppError("Invalid payment signature", 400);
  }

  const sub = await activateSubscription(orderId, paymentId);
  const user = await User.findById(req.user._id);

  res.json({
    message: "Subscription active",
    subscription: { status: sub.status, startsAt: sub.startsAt, endsAt: sub.endsAt },
    role: user.role,
  });
});


export const handleWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers["x-webhook-signature"];

  if (!req.rawBody || !isString(signature) || !verifyWebhook(req.rawBody, signature)) {
    throw new AppError("Invalid webhook signature", 400);
  }

  const { event, data } = req.body || {};
  if (event === "payment.captured" && isString(data?.orderId) && isString(data?.paymentId)) {
    await activateSubscription(data.orderId, data.paymentId);
  }

  
  res.json({ received: true });
});


export const getMySubscription = asyncHandler(async (req, res) => {
  const active = await Subscription.findOne({
    user: req.user._id,
    status: "active",
  }).sort({ endsAt: -1 });

  res.json({
    role: req.user.role,
    subscriptionEndsAt: req.user.subscriptionEndsAt,
    subscription: active
      ? { plan: active.plan, status: active.status, startsAt: active.startsAt, endsAt: active.endsAt }
      : null,
  });
});

// ------------- TESTING ONLY (the fake payment terminal) -------------


export const mockPay = asyncHandler(async (req, res) => {
  const sub = await findMyOrder(req.body?.orderId, req.user._id);
  if (sub.status !== "created") throw new AppError("Order is already paid", 400);

  const paymentId = createPaymentId();
  res.json({
    orderId: sub.orderId,
    paymentId,
    signature: signPayment(sub.orderId, paymentId),
  });
});


export const mockWebhook = asyncHandler(async (req, res) => {
  const sub = await findMyOrder(req.body?.orderId, req.user._id);

  const body = JSON.stringify({
    event: "payment.captured",
    data: { orderId: sub.orderId, paymentId: sub.paymentId || createPaymentId() },
  });

  const response = await fetch(
    `http://localhost:${process.env.PORT || 5000}/api/subscriptions/webhook`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-webhook-signature": signWebhook(body),
      },
      body,
    }
  );

  res.json({ webhookStatus: response.status, webhookResponse: await response.json() });
});


export const mockExpire = asyncHandler(async (req, res) => {
  await User.updateOne(
    { _id: req.user._id },
    { subscriptionEndsAt: new Date(Date.now() - 60 * 1000) }
  );
  res.json({ message: "Plan set to expired. Your next request will downgrade you." });
});