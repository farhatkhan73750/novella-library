import "./setupEnv.js";
import mongoose from "mongoose";
import User from "../src/models/User.js";
import Book from "../src/models/Book.js";
import ReadingProgress from "../src/models/ReadingProgress.js";
import Subscription from "../src/models/Subscription.js";
import generateToken from "../src/utils/generateToken.js";

const models = [User, Book, ReadingProgress, Subscription];

export const connectTestDb = async () => {
  await mongoose.connect(process.env.MONGO_URI_TEST);

  
  const name = mongoose.connection.name;
  if (!name.endsWith("_test")) {
    await mongoose.disconnect();
    throw new Error(`Refusing to run: "${name}" is not a test database (name must end in _test)`);
  }

 
  await Promise.all(models.map((m) => m.init()));
};

export const disconnectTestDb = () => mongoose.disconnect();

export const clearDb = () => Promise.all(models.map((m) => m.deleteMany({})));

let counter = 0;


export const createUser = async (role = "user", extra = {}) => {
  counter += 1;
  const user = await User.create({
    name: `Test ${role} ${counter}`,
    email: `${role}${counter}@test.com`,
    password: "password123",
    role,
    ...extra,
  });
  return { user, token: generateToken(user._id) };
};


export const createBook = (overrides = {}) => {
  counter += 1;
  return Book.create({
    title: `Book ${counter}`,
    author: "Some Author",
    genres: ["classic"],
    tags: ["test"],
    accessLevel: "free",
    chapters: [
      { title: "Chapter 1", content: "First chapter text." },
      { title: "Chapter 2", content: "Second chapter text." },
    ],
    ...overrides,
  });
};


export const auth = (token) => ({ Authorization: `Bearer ${token}` });