import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import Book from "../models/Book.js";


const sampleChapters = (title) => [
  {
    title: "Chapter 1",
    content: `This is placeholder text for the first chapter of "${title}". The full public-domain text will be imported in a later step.`,
  },
  {
    title: "Chapter 2",
    content: `This is placeholder text for the second chapter of "${title}".`,
  },
];

const books = [
  {
    title: "Pride and Prejudice",
    author: "Jane Austen",
    description: "A witty novel of manners about Elizabeth Bennet, family pressure, and first impressions.",
    genres: ["romance", "classic"],
    tags: ["regency", "family", "society"],
    accessLevel: "free",
  },
  {
    title: "Frankenstein",
    author: "Mary Shelley",
    description: "A young scientist creates life and must face the consequences of his ambition.",
    genres: ["horror", "science fiction", "classic"],
    tags: ["gothic", "monster", "science"],
    accessLevel: "free",
  },
  {
    title: "Dracula",
    author: "Bram Stoker",
    description: "A solicitor's journey to Transylvania unleashes an ancient vampire on England.",
    genres: ["horror", "classic"],
    tags: ["gothic", "vampire", "epistolary"],
    accessLevel: "premium",
  },
  {
    title: "The Adventures of Sherlock Holmes",
    author: "Arthur Conan Doyle",
    description: "Twelve classic cases of the famous detective and his friend Dr. Watson.",
    genres: ["mystery", "classic"],
    tags: ["detective", "short stories", "london"],
    accessLevel: "free",
  },
  {
    title: "Alice's Adventures in Wonderland",
    author: "Lewis Carroll",
    description: "A girl falls down a rabbit hole into a world of nonsense and strange characters.",
    genres: ["fantasy", "classic", "children"],
    tags: ["adventure", "nonsense", "dreams"],
    accessLevel: "free",
  },
  {
    title: "Moby-Dick",
    author: "Herman Melville",
    description: "Captain Ahab's obsessive hunt for the white whale, told by the sailor Ishmael.",
    genres: ["adventure", "classic"],
    tags: ["sea", "whaling", "obsession"],
    accessLevel: "premium",
  },
  {
    title: "The Picture of Dorian Gray",
    author: "Oscar Wilde",
    description: "A beautiful young man stays youthful while his portrait bears the cost of his choices.",
    genres: ["horror", "classic"],
    tags: ["gothic", "vanity", "philosophy"],
    accessLevel: "premium",
  },
  {
    title: "Treasure Island",
    author: "Robert Louis Stevenson",
    description: "Young Jim Hawkins joins a voyage to find buried pirate treasure.",
    genres: ["adventure", "classic"],
    tags: ["pirates", "sea", "treasure"],
    accessLevel: "free",
  },
  {
    title: "The Time Machine",
    author: "H. G. Wells",
    description: "A inventor travels to the distant future and finds a divided humanity.",
    genres: ["science fiction", "classic"],
    tags: ["time travel", "future", "society"],
    accessLevel: "premium",
  },
  {
    title: "A Tale of Two Cities",
    author: "Charles Dickens",
    description: "Lives intertwine in London and Paris during the French Revolution.",
    genres: ["historical", "classic"],
    tags: ["revolution", "london", "paris"],
    accessLevel: "premium",
  },
];

const seed = async () => {
  await connectDB();
  await Book.init(); 

  await Book.deleteMany({});
  await Book.create(
    books.map((b) => ({ ...b, type: "book", chapters: sampleChapters(b.title) }))
  );

  console.log(`Seeded ${books.length} books`);
  await mongoose.disconnect();
};

seed().catch((err) => {
  console.error("Seeding failed:", err.message);
  process.exit(1);
});