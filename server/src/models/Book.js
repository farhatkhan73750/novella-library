import mongoose from "mongoose";

const chapterSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
  },
  { _id: false }
);

const bookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: 200,
    },
    author: {
      type: String,
      required: [true, "Author is required"],
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },
    type: {
      type: String,
      enum: ["book", "webnovel"],
      default: "book",
    },
    status: {
      type: String,
      enum: ["ongoing", "completed"],
      default: "completed",
    },
    genres: { type: [String], default: [] },
    tags: { type: [String], default: [] },
    coverImage: { type: String, default: "" },
    accessLevel: {
      type: String,
      enum: ["free", "premium"],
      default: "free",
    },
    chapters: {
      type: [chapterSchema],
      default: [],
      select: false, 
    },
    chapterCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);


bookSchema.pre("save", function () {
  if (this.isModified("chapters")) {
    this.chapterCount = this.chapters.length;
  }
});


bookSchema.index(
  { title: "text", author: "text", description: "text", tags: "text" },
  { weights: { title: 10, author: 5, tags: 3, description: 1 } }
);
bookSchema.index({ genres: 1 });
bookSchema.index({ accessLevel: 1 });

const Book = mongoose.model("Book", bookSchema);
export default Book;