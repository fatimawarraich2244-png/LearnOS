const axios = require('axios');

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Generates vector embeddings for an array of text chunks using Voyage AI.
 *
 * NOTE: Voyage AI enforces a maximum batch size limit (up to 128 items per request)
 * and rate limits. For extremely large documents (e.g. thousands of chunks),
 * processing can take several minutes to complete sequentially. This is expected
 * behavior and ensures all chunks are indexed without hitting rate limits or timeouts.
 */
const getEmbeddings = async (chunks) => {
  try {
    if (!chunks || !Array.isArray(chunks) || chunks.length === 0) return [];

    const BATCH_SIZE = 96; // Voyage AI limit is 128 inputs per request; 96 is a safe batch size
    const DELAY_BETWEEN_BATCHES_MS = 250; // Delay between sequential batch requests
    const MAX_RETRIES = 3;

    const allEmbeddings = [];
    const totalBatches = Math.ceil(chunks.length / BATCH_SIZE);

    console.log(`[Embeddings] Starting generation for ${chunks.length} chunks across ${totalBatches} batch(es)...`);

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batchIndex = Math.floor(i / BATCH_SIZE) + 1;
      const batchChunks = chunks.slice(i, i + BATCH_SIZE);

      console.log(`[Embeddings] Processing batch ${batchIndex} of ${totalBatches} (${batchChunks.length} chunks)...`);

      let attempt = 0;
      let success = false;
      let batchEmbeddings = [];

      while (attempt <= MAX_RETRIES && !success) {
        try {
          const response = await axios.post(
            'https://api.voyageai.com/v1/embeddings',
            {
              input: batchChunks,
              model: 'voyage-3-lite',
            },
            {
              headers: {
                Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
                'Content-Type': 'application/json',
              },
              timeout: 60000,
            }
          );

          // Voyage API returns { data: [{ embedding: [...] }, ...] }
          if (response.data && Array.isArray(response.data.data)) {
            batchEmbeddings = response.data.data.map((item) => item.embedding);
            success = true;
          } else {
            throw new Error('Invalid response structure from Voyage AI API');
          }
        } catch (error) {
          const isRateLimit = error.response && error.response.status === 429;
          attempt++;

          if (isRateLimit && attempt <= MAX_RETRIES) {
            const retryDelay = attempt * 2500; // 2.5s, 5.0s, 7.5s
            console.warn(
              `[Embeddings] Rate limit (429) on batch ${batchIndex}/${totalBatches} (attempt ${attempt}/${MAX_RETRIES}). Retrying in ${retryDelay}ms...`
            );
            await delay(retryDelay);
          } else {
            console.error(
              `[Embeddings] Error on batch ${batchIndex}/${totalBatches} (attempt ${attempt}):`,
              error.response?.data || error.message
            );
            if (attempt > MAX_RETRIES) {
              throw new Error(`Batch ${batchIndex} failed after ${MAX_RETRIES} retries: ${error.message}`);
            } else {
              throw error;
            }
          }
        }
      }

      allEmbeddings.push(...batchEmbeddings);

      // Delay between sequential batches to avoid hitting API rate limits
      if (i + BATCH_SIZE < chunks.length) {
        await delay(DELAY_BETWEEN_BATCHES_MS);
      }
    }

    console.log(`[Embeddings] Successfully generated ${allEmbeddings.length} embeddings.`);
    return allEmbeddings;
  } catch (error) {
    console.error('Error fetching embeddings:', error.response?.data || error.message);
    throw new Error(`Failed to generate embeddings: ${error.message}`);
  }
};

module.exports = { getEmbeddings };
