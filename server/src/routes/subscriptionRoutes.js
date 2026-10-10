import express from "express";
import {
  getPlans,
  checkout,
  confirm,
  handleWebhook,
  getMySubscription,
  mockPay,
  mockWebhook,
  mockExpire,
} from "../controllers/subscriptionController.js";
import { protect } from "../middleware/authMiddleware.js";
import AppError from "../utils/AppError.js";

const router = express.Router();


const mockOnly = (req, res, next) => {
  if (process.env.ALLOW_MOCK_PAYMENTS !== "true") {
    return next(new AppError("Route not found", 404));
  }
  next();
};

router.get("/plans", getPlans);
router.post("/webhook", handleWebhook); 
router.get("/me", protect, getMySubscription);
router.post("/checkout", protect, checkout);
router.post("/confirm", protect, confirm);

router.post("/mock-pay", mockOnly, protect, mockPay);
router.post("/mock-webhook", mockOnly, protect, mockWebhook);
router.post("/mock-expire", mockOnly, protect, mockExpire);

export default router;