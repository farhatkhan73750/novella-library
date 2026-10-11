import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import User from "../models/User.js";
import Book from "../models/Book.js";
import ReadingProgress from "../models/ReadingProgress.js";

// Every listed book is treated as fully read (completed)
const demos = [
  {
    name: "Horror Fan",
    email: "horrorfan@demo.novella.com",
    reads: ["Frankenstein", "Dracula"],
  },
  {
    name: "Adventure Fan",
    email: "adventurefan@demo.novella.com",
    reads: ["Treasure Island"],
  },
  {
    name: "Sci-Fi Fan",
    email: "scififan@demo.novella.com",
    reads: ["The Time Machine"],
  },
  {
    name: "Classics Reader",
    email: "classicsreader@demo.novella.com",
    reads: [
      "Pride and Prejudice",
      "The Adventures of Sherlock Holmes",
      "A Tale of Two Cities",
      "Treasure Island",
    ],
  },
];

const seed = async () => {
  await connectDB();

  const books = await Book.find().select("title chapterCount");
  const byTitle = new Map(books.map((b) => [b.title, b]));

  // Check every title exists before changing anything
  for (const demo of demos) {
    for (const title of demo.reads) {
      if (!byTitle.has(title)) {
        throw new Error(`Book not found: "${title}". Run "npm run seed" first.`);
      }
    }
  }

  // Remove old demo users and their history, then recreate
  const emails = demos.map((d) => d.email);
  const old = await User.find({ email: { $in: emails } }).select("_id");
  await ReadingProgress.deleteMany({ user: { $in: old.map((u) => u._id) } });
  await User.deleteMany({ email: { $in: emails } });

  for (const demo of demos) {
    const user = await User.create({
      name: demo.name,
      email: demo.email,
      password: "password123",
    });

    const records = demo.reads.map((title) => {
      const book = byTitle.get(title);
      return {
        user: user._id,
        book: book._id,
        lastChapter: book.chapterCount,
        furthestChapter: book.chapterCount,
        completed: true,
        unlockedMonth: null, // demo history must not use up free-tier quota
        lastReadAt: new Date(),
      };
    });
    await ReadingProgress.insertMany(records);
  }

  console.log("Created 4 demo readers (password: password123):");
  demos.forEach((d) => console.log(`  ${d.email}`));
  await mongoose.disconnect();
};

seed().catch((err) => {
  console.error("Seeding failed:", err.message);
  process.exit(1);
});