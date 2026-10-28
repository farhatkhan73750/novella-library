import "dotenv/config"; // loads .env FIRST, before anything else
import app from "./app.js";
import { connectDB } from "./config/db.js";
import { validateEnv } from "./config/validateEnv.js";

// Refuse to start with missing or weak settings
try {
  validateEnv().forEach((warning) => console.warn(`Warning: ${warning}`));
} catch (err) {
  console.error(`Startup check failed: ${err.message}`);
  process.exit(1);
}

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});