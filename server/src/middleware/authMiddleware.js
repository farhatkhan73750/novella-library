import jwt from "jsonwebtoken";
import User from "../models/User.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import Subscription from "../models/Subscription.js";


export const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    throw new AppError("Not logged in", 401);
  }

  const token = header.split(" ")[1];

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    throw new AppError("Invalid or expired token", 401);
  }

  const user = await User.findById(decoded.id);
  if (!user) {
    throw new AppError("User no longer exists", 401);
  }
    // Plan ended? Downgrade. (A subscriber with no end date has no expiry.)
  if (
    user.role === "subscriber" &&
    user.subscriptionEndsAt &&
    user.subscriptionEndsAt < new Date()
  ) {
    await User.updateOne({ _id: user._id }, { role: "user" });
    await Subscription.updateMany(
      { user: user._id, status: "active", endsAt: { $lt: new Date() } },
      { status: "expired" }
    );
    user.role = "user";
  }
  req.user = user; 
  next();
});


export const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return next(new AppError("You do not have permission to do this", 403));
  }
  next();
};