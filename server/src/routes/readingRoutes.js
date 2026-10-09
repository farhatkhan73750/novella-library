import express from "express";
import {
  readChapter,
  getQuota,
  getHistory,
} from "../controllers/readingController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();


router.use(protect);

router.get("/quota", getQuota);
router.get("/history", getHistory);
router.get("/:bookId/chapters/:number", readChapter);

export default router;