// ── Serverless polyfills ──────────────────────────────────────────────────────
// pdf-parse v2.x bundles pdfjs-dist which references browser globals at load
// time. Vercel's Node.js runtime doesn't provide them — stub them out before
// any require() that might trigger pdf-parse to load.
if (typeof globalThis.DOMMatrix === 'undefined') {
  globalThis.DOMMatrix = class DOMMatrix {
    constructor() { this.a=1;this.b=0;this.c=0;this.d=1;this.e=0;this.f=0; }
    invertSelf() { return this; }
    multiplySelf() { return this; }
    static fromMatrix() { return new globalThis.DOMMatrix(); }
  };
}
if (typeof globalThis.ImageData === 'undefined') {
  globalThis.ImageData = class ImageData {
    constructor(w, h) { this.width = w; this.height = h; this.data = new Uint8ClampedArray(w * h * 4); }
  };
}
if (typeof globalThis.Path2D === 'undefined') {
  globalThis.Path2D = class Path2D {};
}

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
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
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
