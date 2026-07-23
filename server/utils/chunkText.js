const chunkText = (text, chunkSize = 1000, overlap = 100) => {
  if (!text || typeof text !== 'string') return [];
  if (text.length <= chunkSize) return [text];

  const chunks = [];
  let i = 0;

  while (i < text.length) {
    const chunk = text.slice(i, i + chunkSize);
    chunks.push(chunk);
    if (i + chunkSize >= text.length) break;
    i += (chunkSize - overlap);
  }

  return chunks;
};

module.exports = { chunkText };
