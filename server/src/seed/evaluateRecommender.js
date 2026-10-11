import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import User from "../models/User.js";
import Book from "../models/Book.js";
import ReadingProgress from "../models/ReadingProgress.js";
import { recommendFromHistory } from "../services/recommendationService.js";

const K = 3; 

const run = async () => {
  await connectDB();

  const books = await Book.find()
    .select("title author genres tags accessLevel chapterCount")
    .lean();
  const users = await User.find({ email: /@demo\.novella\.com$/ }).select("_id email");

  let trials = 0;
  let hits = 0;
  let randomExpected = 0;

  for (const user of users) {
    const history = (
      await ReadingProgress.find({ user: user._id })
        .populate("book", "title author genres tags chapterCount")
        .lean()
    ).filter((item) => item.book);

    for (const held of history.filter((item) => item.completed)) {
      const rest = history.filter((item) => item !== held);
      if (rest.length === 0) continue; // nothing left to learn from

      const restIds = new Set(rest.map((item) => String(item.book._id)));
      const candidates = books.filter((b) => !restIds.has(String(b._id)));

      const top = recommendFromHistory(rest, candidates, K).map((r) =>
        String(r.book._id)
      );
      const hit = top.includes(String(held.book._id));

      trials += 1;
      if (hit) hits += 1;
      randomExpected += Math.min(K, candidates.length) / candidates.length;

      console.log(
        `${hit ? "HIT " : "MISS"}  ${user.email}  hidden: ${held.book.title}`
      );
    }
  }

  if (trials === 0) {
    console.log('No trials. Run "npm run seed:history" first.');
  } else {
    console.log("");
    console.log(`Hit rate @${K}: ${hits}/${trials} = ${((hits / trials) * 100).toFixed(0)}%`);
    console.log(`Random guessing would score about ${((randomExpected / trials) * 100).toFixed(0)}%`);
  }

  await mongoose.disconnect();
};

run().catch((err) => {
  console.error("Evaluation failed:", err.message);
  process.exit(1);
});