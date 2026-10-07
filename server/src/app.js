import authRoutes from "./routes/authRoutes.js";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

const app = express(); 


app.use(helmet());                                   
app.use(cors({ origin: process.env.CLIENT_URL }));   
app.use(express.json());                             
app.use(morgan("dev"));                              


app.get("/api/health", (req, res) => {
  res.json({ status: "ok", app: "Novella API" });
});

app.use("/api/auth", authRoutes);
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});


app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    message: err.message || "Something went wrong",
  });
});

export default app; 