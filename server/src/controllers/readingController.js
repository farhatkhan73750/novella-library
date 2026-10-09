import mongoose from "mongoose";
import Book from "../models/Book.js";
import ReadingProgress from "../models/ReadingProgress.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { FREE_MONTHLY_LIMIT } from "../config/limits.js";


const currentMonth = () => new Date().toISOString().slice(0, 7);

const hasFullAccess = (user) => user.role === "subscriber" || user.role === "admin";

const countUsed = (userId) =>
  ReadingProgress.countDocuments({ user: userId, unlockedMonth: currentMonth() });


export const readChapter = asyncHandler(async (req, res) => {
  const { bookId, number } = req.params;

  if (!mongoose.isValidObjectId(bookId)) {
    throw new AppError("Invalid book id", 400);
  }
  const chapterNumber = Number(number);
  if (!Number.isInteger(chapterNumber) || chapterNumber < 1) {
    throw new AppError("Chapter must be a positive whole number", 400);
  }

  
  const book = await Book.findById(bookId).select("+chapters");
  if (!book) throw new AppError("Book not found", 404);

  const fullAccess = hasFullAccess(req.user);

 
  if (book.accessLevel === "premium" && !fullAccess) {
    throw new AppError("This book is for subscribers only", 403);
  }

  const chapter = book.chapters[chapterNumber - 1];
  if (!chapter) throw new AppError("Chapter not found", 404);

  const month = currentMonth();
  let progress = await ReadingProgress.findOne({
    user: req.user._id,
    book: book._id,
  });

  
  if (!fullAccess && progress?.unlockedMonth !== month) {
    const used = await countUsed(req.user._id);
    if (used >= FREE_MONTHLY_LIMIT) {
      throw new AppError(
        `Free limit reached (${FREE_MONTHLY_LIMIT} books per month). Subscribe for unlimited reading.`,
        403
      );
    }
  }

  
  if (!progress) {
    progress = new ReadingProgress({ user: req.user._id, book: book._id });
  }
  if (!fullAccess) progress.unlockedMonth = month;
  progress.lastChapter = chapterNumber;
  progress.furthestChapter = Math.max(progress.furthestChapter, chapterNumber);
  progress.completed =
    progress.completed || progress.furthestChapter >= book.chapters.length;
  progress.lastReadAt = new Date();
  await progress.save();

  res.json({
    book: {
      id: book._id,
      title: book.title,
      author: book.author,
      totalChapters: book.chapters.length,
    },
    chapter: {
      number: chapterNumber,
      title: chapter.title,
      content: chapter.content,
    },
    hasPrevious: chapterNumber > 1,
    hasNext: chapterNumber < book.chapters.length,
    progress: {
      lastChapter: progress.lastChapter,
      furthestChapter: progress.furthestChapter,
      completed: progress.completed,
    },
    quota: fullAccess
      ? null
      : { used: await countUsed(req.user._id), limit: FREE_MONTHLY_LIMIT },
  });
});

// GET /api/reading/quota
export const getQuota = asyncHandler(async (req, res) => {
  if (hasFullAccess(req.user)) {
    return res.json({ unlimited: true });
  }
  const used = await countUsed(req.user._id);
  res.json({
    unlimited: false,
    used,
    limit: FREE_MONTHLY_LIMIT,
    remaining: Math.max(FREE_MONTHLY_LIMIT - used, 0),
    month: currentMonth(),
  });
});

// GET /api/reading/history
export const getHistory = asyncHandler(async (req, res) => {
  const items = await ReadingProgress.find({ user: req.user._id })
    .sort({ lastReadAt: -1 })
    .limit(50)
    .populate("book", "title author coverImage type accessLevel chapterCount");

  const history = items
    .filter((item) => item.book) // skip books that were deleted
    .map((item) => ({
      book: item.book,
      lastChapter: item.lastChapter,
      furthestChapter: item.furthestChapter,
      completed: item.completed,
      lastReadAt: item.lastReadAt,
    }));

  res.json({ history });
});