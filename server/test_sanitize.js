const { sanitizeObjectStrings } = require('./utils/sanitize');

const testInput = {
  weakConcepts: [
    {
      concept: '<script>alert("XSS")</script>Graph Traversal',
      subjects: ['Subject <b>A</b>', 'Subject B'],
      severity: 7
    }
  ],
  message: 'This is a <img src=x onerror=alert(1)> test'
};

const sanitized = sanitizeObjectStrings(testInput);

console.log(JSON.stringify(sanitized, null, 2));

if (JSON.stringify(sanitized).includes('<script>') || JSON.stringify(sanitized).includes('<img')) {
  console.log('❌ BUG: Sanitizer failed to strip HTML tags');
} else {
  console.log('✅ PASS: Sanitizer correctly stripped HTML tags from nested objects');
}
