import "dotenv/config";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import Book from "../models/Book.js";
import { stripGutenberg, splitChapters, DEFAULT_HEADING } from "./gutenbergParser.js";

const CACHE_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../data/gutenberg");

// title must match the seed data exactly. id is the Project Gutenberg ebook number.
const BOOKS = [
  { title: "Pride and Prejudice", id: 1342 },
  { title: "Frankenstein", id: 84 },
  { title: "Dracula", id: 345 },
  { title: "The Adventures of Sherlock Holmes", id: 1661, heading: /^[IVX]+\.\s+\S.{2,60}$/m },
  { title: "Alice's Adventures in Wonderland", id: 11 },
  { title: "Moby-Dick", id: 2701 },
  { title: "The Picture of Dorian Gray", id: 174 },
  {
    title: "Treasure Island",
    id: 120,
    heading: /^(?:chapter\s+[\divxlcdm]+\b.*|\d{1,2}\.\s+[A-Z].{3,80})$/im,
  },
  { title: "The Time Machine", id: 35, heading: /^[IVXL]+\.?\s*$/m },
  { title: "A Tale of Two Cities", id: 98 },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Use the saved copy if we have one. Otherwise download once and save it.
const getText = async (id) => {
  const file = path.join(CACHE_DIR, `${id}.txt`);

  try {
    return await fs.readFile(file, "utf8");
  } catch {
    // not saved yet, so download it below
  }

  const url = `https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt`;
  console.log(`  downloading ${url}`);
  const response = await fetch(url, {
    headers: { "User-Agent": "NovellaPortfolioProject/1.0 (learning project)" },
  });
  if (!response.ok) {
    throw new Error(
      `download failed (HTTP ${response.status}). Save the book's "Plain Text UTF-8" file as ${file} and run again`
    );
  }

  const text = await response.text();
  await fs.mkdir(CACHE_DIR, { recursive: true });
  await fs.writeFile(file, text);
  await sleep(1500); // be gentle with the free service
  return text;
};

const run = async () => {
  await connectDB();
  let failed = 0;

  for (const entry of BOOKS) {
    console.log(`\n${entry.title}`);
    try {
      const book = await Book.findOne({ title: entry.title }).select("+chapters");
      if (!book) {
        console.log('  skipped: not in the database. Run "npm run seed" first');
        failed += 1;
        continue;
      }

      const text = stripGutenberg(await getText(entry.id));
      const chapters = splitChapters(text, entry.heading || DEFAULT_HEADING);

      book.chapters = chapters;
      await book.save(); // the save hook updates chapterCount

      const words = chapters.reduce((n, c) => n + c.content.split(/\s+/).length, 0);
      console.log(`  ${chapters.length} chapters, about ${words.toLocaleString()} words`);
      console.log(`  first: ${chapters[0].title}`);
      console.log(`  last:  ${chapters[chapters.length - 1].title}`);
    } catch (err) {
      console.log(`  FAILED: ${err.message}`);
      failed += 1;
    }
  }

  console.log(failed === 0 ? "\nAll books imported." : `\nFinished with ${failed} problem(s).`);
  await mongoose.disconnect();
  if (failed > 0) process.exit(1);
};

run().catch((err) => {
  console.error("Import failed:", err.message);
  process.exit(1);
});