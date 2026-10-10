import crypto from "crypto";

const hmac = (secret, data) =>
  crypto.createHmac("sha256", secret).update(data).digest("hex");


const safeEqual = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

const randomId = (prefix) => `${prefix}_${crypto.randomBytes(8).toString("hex")}`;

export const createOrder = ({ amount, currency }) => ({
  id: randomId("order"),
  amount,
  currency,
});

export const createPaymentId = () => randomId("pay");


export const signPayment = (orderId, paymentId) =>
  hmac(process.env.PAYMENT_SECRET, `${orderId}|${paymentId}`);

export const verifyPayment = (orderId, paymentId, signature) =>
  safeEqual(signPayment(orderId, paymentId), signature);


export const signWebhook = (rawBody) => hmac(process.env.WEBHOOK_SECRET, rawBody);

export const verifyWebhook = (rawBody, signature) =>
  safeEqual(signWebhook(rawBody), signature);