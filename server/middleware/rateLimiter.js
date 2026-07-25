const rateLimit = require('express-rate-limit');

const aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30, // 30 requests per window per user
  keyGenerator: (req) => {
    return req.userId || req.ip;
  },
  message: {
    message: 'You have reached the hourly limit for AI requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { aiRateLimiter };
