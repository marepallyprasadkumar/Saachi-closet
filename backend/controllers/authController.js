// controllers/authController.js — Register, Login, Profile
const jwt  = require('jsonwebtoken');
const User = require('../models/User');

// Generate signed JWT
const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

// POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const exists = await User.findOne({ email });
    if (exists) {
      res.status(400);
      throw new Error('Email already registered');
    }

    const user = await User.create({ name, email, password });

    res.status(201).json({
      _id:   user._id,
      name:  user.name,
      email: user.email,
      role:  user.role,
      token: signToken(user._id),
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      res.status(401);
      throw new Error('Invalid email or password');
    }

    res.json({
      _id:   user._id,
      name:  user.name,
      email: user.email,
      role:  user.role,
      token: signToken(user._id),
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me  (protected)
const getMe = async (req, res) => {
  const user = await User.findById(req.user._id);
  res.json(user);
};

module.exports = { register, login, getMe };
