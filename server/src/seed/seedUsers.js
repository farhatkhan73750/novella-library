import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import User from "../models/User.js";

// Test accounts for development only. Never use these in production.
const testUsers = [
  { name: "Admin", email: "admin@novella.com", password: "password123", role: "admin" },
  { name: "Reader", email: "reader@novella.com", password: "password123", role: "user" },
  { name: "Subscriber", email: "subscriber@novella.com", password: "password123", role: "subscriber" },
];

const seed = async () => {
  await connectDB();

  // Remove old copies of these accounts, then recreate them
  await User.deleteMany({ email: { $in: testUsers.map((u) => u.email) } });

  // create() runs the pre-save hook, so passwords get hashed
  await User.create(testUsers);

  console.log("Created: admin, reader, subscriber (password: password123)");
  await mongoose.disconnect();
};

seed().catch((err) => {
  console.error("Seeding failed:", err.message);
  process.exit(1);
});