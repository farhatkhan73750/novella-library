import Subscription from "../models/Subscription.js";
import User from "../models/User.js";
import AppError from "../utils/AppError.js";
import { PLANS } from "../config/plans.js";

const DAY_MS = 24 * 60 * 60 * 1000;

export const activateSubscription = async (orderId, paymentId) => {
  const sub = await Subscription.findOne({ orderId });
  if (!sub) throw new AppError("Order not found", 404);

  
  if (sub.status !== "created") return sub;

  const user = await User.findById(sub.user);
  if (!user) throw new AppError("User not found", 404);

  
  const now = new Date();
  const startsAt =
    user.subscriptionEndsAt && user.subscriptionEndsAt > now
      ? user.subscriptionEndsAt
      : now;
  const endsAt = new Date(startsAt.getTime() + PLANS[sub.plan].days * DAY_MS);

  
  const claimed = await Subscription.findOneAndUpdate(
    { _id: sub._id, status: "created" },
    { status: "active", paymentId, startsAt, endsAt },
    { new: true }
  );
  if (!claimed) return Subscription.findById(sub._id); 

  const update = { subscriptionEndsAt: endsAt };
  if (user.role === "user") update.role = "subscriber"; 
  await User.updateOne({ _id: user._id }, update);

  return claimed;
};