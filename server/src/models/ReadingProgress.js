import mongoose from "mongoose";

const readingProgressSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    book: { type: mongoose.Schema.Types.ObjectId, ref: "Book", required: true },
    lastChapter: { type: Number, default: 1 },
    furthestChapter: { type: Number, default: 1 },
    completed: { type: Boolean, default: false },
    unlockedMonth: { type: String, default: null }, // e.g. "2026-10"
    lastReadAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);


readingProgressSchema.index({ user: 1, book: 1 }, { unique: true });

readingProgressSchema.index({ user: 1, unlockedMonth: 1 });

readingProgressSchema.index({ user: 1, lastReadAt: -1 });

const ReadingProgress = mongoose.model("ReadingProgress", readingProgressSchema);
export default ReadingProgress;