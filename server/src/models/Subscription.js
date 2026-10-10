import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    plan: { type: String, enum: ["monthly"], default: "monthly" },
    amount: { type: Number, required: true },
    currency: { type: String, required: true },
    orderId: { type: String, required: true, unique: true },
    paymentId: { type: String, default: null },
    status: {
      type: String,
      enum: ["created", "active", "expired"],
      default: "created",
    },
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
  },
  { timestamps: true }
);

subscriptionSchema.index({ user: 1, status: 1 });

const Subscription = mongoose.model("Subscription", subscriptionSchema);
export default Subscription;