import express from "express";
import rateLimit from "express-rate-limit";
import { register, login, getMe } from "../controllers/authController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();


const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  message: { message: "Too many attempts, please try again later" },
});

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.get("/me", protect, getMe);


router.get("/admin-test", protect, authorize("admin"), (req, res) => {
  res.json({ message: `Welcome admin ${req.user.name}` });
});

export default router;