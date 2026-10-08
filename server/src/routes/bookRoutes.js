import express from "express";
import {
  getBooks,
  getBookById,
  createBook,
  updateBook,
  deleteBook,
} from "../controllers/bookController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();


router.get("/", getBooks);
router.get("/:id", getBookById);


router.post("/", protect, authorize("admin"), createBook);
router.put("/:id", protect, authorize("admin"), updateBook);
router.delete("/:id", protect, authorize("admin"), deleteBook);

export default router;