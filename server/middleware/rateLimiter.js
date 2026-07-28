const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');

const aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30, // 30 requests per window per user
  // Use the library's ipKeyGenerator helper to correctly handle both IPv4 and
  // IPv6 addresses (including ::ffff:-mapped addresses), fixing ERR_ERL_KEY_GEN_IPV6.
  // Prefer per-user keying for authenticated requests; fall back to IP.
  keyGenerator: (req) => req.userId || ipKeyGenerator(req),
  message: {
    message: 'You have reached the hourly limit for AI requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { aiRateLimiter };
