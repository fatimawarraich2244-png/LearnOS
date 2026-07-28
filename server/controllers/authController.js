const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ── Helper ────────────────────────────────────────────────────────────────────
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// ── @desc   Register a new user
// ── @route  POST /api/auth/signup
// ── @access Public
const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please fill all fields' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({ name, email: email.toLowerCase(), password: hashedPassword });

    return res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      token: generateToken(user._id),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ── @desc   Login existing user
// ── @route  POST /api/auth/login
// ── @access Public
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    return res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      token: generateToken(user._id),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ── @desc   Update user profile (name, email)
// ── @route  PUT /api/auth/profile
// ── @access Private
const updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (email && email.toLowerCase() !== user.email.toLowerCase()) {
      const existingUser = await User.findOne({
        email: email.toLowerCase(),
        _id: { $ne: req.userId },
      });
      if (existingUser) {
        return res.status(400).json({ message: 'Email is already taken by another user' });
      }
      user.email = email.toLowerCase();
    }

    if (name) {
      user.name = name.trim();
    }

    await user.save();

    return res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ── @desc   Change user password
// ── @route  PUT /api/auth/change-password
// ── @access Private
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new passwords are required' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    return res.json({ message: 'Password changed successfully' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ── @desc   Delete account & cascade delete all user data
// ── @route  DELETE /api/auth/account
// ── @access Private
const deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ message: 'Password confirmation is required' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect password' });
    }

    const Semester = require('../models/Semester');
    const Subject = require('../models/Subject');
    const Material = require('../models/Material');
    const Quiz = require('../models/Quiz');
    const ChatMessage = require('../models/ChatMessage');
    const UserStats = require('../models/UserStats');
    const Exam = require('../models/Exam');
    const StudyPlan = require('../models/StudyPlan');
    const GlobalBrain = require('../models/GlobalBrain');

    await Promise.all([
      Semester.deleteMany({ userId: req.userId }),
      Subject.deleteMany({ userId: req.userId }),
      Material.deleteMany({ userId: req.userId }),
      Quiz.deleteMany({ userId: req.userId }),
      ChatMessage.deleteMany({ userId: req.userId }),
      UserStats.deleteMany({ userId: req.userId }),
      Exam.deleteMany({ userId: req.userId }),
      StudyPlan.deleteMany({ userId: req.userId }),
      GlobalBrain.deleteMany({ userId: req.userId }),
      User.findByIdAndDelete(req.userId),
    ]);

    return res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  updateProfile,
  changePassword,
  deleteAccount,
};
