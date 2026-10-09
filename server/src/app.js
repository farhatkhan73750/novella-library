import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import authRoutes from "./routes/authRoutes.js";
import bookRoutes from "./routes/bookRoutes.js";
import readingRoutes from "./routes/readingRoutes.js";

const app = express();


app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json());
app.use(morgan("dev"));


app.get("/api/health", (req, res) => {
  res.json({ status: "ok", app: "Novella API" });
});

app.use("/api/auth", authRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/reading", readingRoutes);


app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});


app.use((err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Something went wrong";

  
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors).map((e) => e.message).join(", ");
  }

  
  if (err.name === "CastError") {
    statusCode = 400;
    message = "Invalid value provided";
  }

 
  if (err.type === "entity.parse.failed") {
    statusCode = 400;
    message = "Invalid JSON in request body";
  }

  
  if (err.code === 11000) {
    statusCode = 409;
    message = "Duplicate value";
  }

  if (statusCode === 500) console.error(err.stack);

  res.status(statusCode).json({ message });
});

export default app;