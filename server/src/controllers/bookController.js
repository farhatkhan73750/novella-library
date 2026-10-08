import mongoose from "mongoose";
import Book from "../models/Book.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";

const isString = (v) => typeof v === "string";


const toList = (v) =>
  Array.isArray(v)
    ? v
        .filter(isString)
        .map((x) => x.trim().toLowerCase())
        .filter(Boolean)
    : [];


const pickBookFields = (body = {}) => {
  const data = {};

  ["title", "author", "description", "type", "status", "accessLevel", "coverImage"].forEach(
    (field) => {
      if (isString(body[field])) data[field] = body[field];
    }
  );

  if (body.genres !== undefined) data.genres = toList(body.genres);
  if (body.tags !== undefined) data.tags = toList(body.tags);

  if (Array.isArray(body.chapters)) {
    data.chapters = body.chapters
      .filter((c) => c && isString(c.title) && isString(c.content))
      .map((c) => ({ title: c.title, content: c.content }));
  }

  return data;
};

const checkId = (id) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError("Invalid book id", 400);
  }
};


export const getBooks = asyncHandler(async (req, res) => {
  const { search, genre, tag, type, accessLevel, sort } = req.query;

  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 12, 1), 50);

  
  const filter = {};
  if (isString(search) && search.trim()) filter.$text = { $search: search.trim() };
  if (isString(genre) && genre.trim()) filter.genres = genre.trim().toLowerCase();
  if (isString(tag) && tag.trim()) filter.tags = tag.trim().toLowerCase();
  if (isString(type) && ["book", "webnovel"].includes(type)) filter.type = type;
  if (isString(accessLevel) && ["free", "premium"].includes(accessLevel)) {
    filter.accessLevel = accessLevel;
  }

  
  const sortOptions = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    title: { title: 1 },
  };
  const hasSearch = Boolean(filter.$text);
  const sortBy = hasSearch
    ? { score: { $meta: "textScore" } }
    : sortOptions[sort] || sortOptions.newest;

  const projection = hasSearch ? { score: { $meta: "textScore" } } : {};

  const [books, total] = await Promise.all([
    Book.find(filter, projection)
      .sort(sortBy)
      .skip((page - 1) * limit)
      .limit(limit),
    Book.countDocuments(filter),
  ]);

  res.json({
    books,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  });
});


export const getBookById = asyncHandler(async (req, res) => {
  checkId(req.params.id);
  const book = await Book.findById(req.params.id);
  if (!book) throw new AppError("Book not found", 404);
  res.json({ book });
});


export const createBook = asyncHandler(async (req, res) => {
  const data = pickBookFields(req.body);
  if (!data.title || !data.author) {
    throw new AppError("Title and author are required", 400);
  }
  const book = await Book.create(data);
  res.status(201).json({ book });
});


export const updateBook = asyncHandler(async (req, res) => {
  checkId(req.params.id);
  const book = await Book.findById(req.params.id);
  if (!book) throw new AppError("Book not found", 404);

  Object.assign(book, pickBookFields(req.body));
  await book.save();

  res.json({ book });
});


export const deleteBook = asyncHandler(async (req, res) => {
  checkId(req.params.id);
  const book = await Book.findByIdAndDelete(req.params.id);
  if (!book) throw new AppError("Book not found", 404);
  res.json({ message: "Book deleted" });
});