import User from "../models/User.js";
import generateToken from "../utils/generateToken.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";


const userResponse = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
});


export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body || {};

  if (!name || !email || !password) {
    throw new AppError("Name, email and password are required", 400);
  }
  
  if ([name, email, password].some((v) => typeof v !== "string")) {
    throw new AppError("Invalid input", 400);
  }
  if (password.length < 8) {
    throw new AppError("Password must be at least 8 characters", 400);
  }

  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) {
    throw new AppError("Email is already registered", 409);
  }

  
  const user = await User.create({ name, email, password });

  res.status(201).json({
    token: generateToken(user._id),
    user: userResponse(user),
  });
});


export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    throw new AppError("Email and password are required", 400);
  }
  if (typeof email !== "string" || typeof password !== "string") {
    throw new AppError("Invalid input", 400);
  }

  
  const user = await User.findOne({ email: email.toLowerCase() }).select("+password");

  
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError("Invalid email or password", 401);
  }

  res.json({
    token: generateToken(user._id),
    user: userResponse(user),
  });
});


export const getMe = asyncHandler(async (req, res) => {
  res.json({ user: userResponse(req.user) });
});