import "dotenv/config";

if (!process.env.MONGO_URI_TEST) {
  throw new Error("MONGO_URI_TEST is missing in server/.env");
}


process.env.NODE_ENV = "test";
process.env.MONGO_URI = process.env.MONGO_URI_TEST;
process.env.FREE_MONTHLY_LIMIT = "2";
process.env.ALLOW_MOCK_PAYMENTS = "true";


process.env.JWT_SECRET ||= "test_jwt_secret_for_automated_tests_only";
process.env.JWT_EXPIRES_IN ||= "1h";
process.env.PAYMENT_SECRET ||= "test_payment_secret";
process.env.WEBHOOK_SECRET ||= "test_webhook_secret";