import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import User from "../models/User.js";

const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;

const run = async () => {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD before running this script");
  }
  if (ADMIN_PASSWORD.length < 12) {
    throw new Error("Use an admin password of at least 12 characters");
  }

  await connectDB();

  const email = ADMIN_EMAIL.toLowerCase();
  const existing = await User.findOne({ email });

  if (existing) {
    existing.role = "admin";
    await existing.save();
    console.log(`Existing user ${email} is now an admin (password unchanged)`);
  } else {
    await User.create({ name: "Admin", email, password: ADMIN_PASSWORD, role: "admin" });
    console.log(`Created admin ${email}`);
  }

  await mongoose.disconnect();
};

run().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});