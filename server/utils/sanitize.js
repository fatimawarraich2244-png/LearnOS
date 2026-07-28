// ── Strip HTML tags before saving name to DB.
const sanitizeName = (str) => (typeof str === 'string' ? str.replace(/<[^>]*>/g, '').trim() : str);

// ── Recursively sanitize all string values in an object/array
const sanitizeObjectStrings = (obj) => {
  if (typeof obj === 'string') {
    return sanitizeName(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObjectStrings(item));
  }
  if (obj !== null && typeof obj === 'object') {
    const sanitized = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        sanitized[key] = sanitizeObjectStrings(obj[key]);
      }
    }
    return sanitized;
  }
  return obj;
};

module.exports = {
  sanitizeName,
  sanitizeObjectStrings,
};
