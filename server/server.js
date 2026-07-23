const dotenv = require('dotenv');
dotenv.config(); // ← Must be FIRST before any other requires that use env vars

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

// Connect to database
if (!process.env.MONGO_URI) {
  console.error('❌ MONGO_URI is not defined in .env');
  process.exit(1);
}
connectDB();

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
// Test route
app.get('/', (req, res) => {
  res.json({ message: 'LearnOS API running' });
});

// API routes (files to be created later)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/semesters', require('./routes/semesters'));
app.use('/api/subjects', require('./routes/subjects'));
app.use('/api/materials', require('./routes/materials'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/quiz', require('./routes/quiz'));
app.use('/api/planner', require('./routes/planner'));

// ── Start server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 LearnOS server running on port ${PORT}`);
});
