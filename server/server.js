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
const allowedOrigins = [
  process.env.CLIENT_URL,                "https://learn-os-rho.vercel.app",
  'http://localhost:5173',               // local dev
  'http://localhost:3000',               // alternate local dev
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (e.g. Postman, server-to-server)
    if (!origin) return callback(null, true);
    // Allow exact matches
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Allow Vercel preview deployments
    if (origin.endsWith('.vercel.app')) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
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
app.use('/api/brain', require('./routes/brain'));
app.use('/api/exams', require('./routes/exams'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/notifications', require('./routes/notifications'));

// ── Start server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 LearnOS server running on port ${PORT}`);
});
