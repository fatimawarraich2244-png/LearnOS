const axios = require('axios');

const getEmbeddings = async (chunks) => {
  try {
    if (!chunks || chunks.length === 0) return [];
    
    const response = await axios.post(
      'https://api.voyageai.com/v1/embeddings',
      {
        input: chunks,
        model: 'voyage-3-lite',
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.VOYAGE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // Voyage API returns { data: [{ embedding: [...] }, ...] }
    const embeddings = response.data.data.map(item => item.embedding);
    return embeddings;
  } catch (error) {
    console.error('Error fetching embeddings:', error.response?.data || error.message);
    throw new Error(`Failed to generate embeddings: ${error.message}`);
  }
};

module.exports = { getEmbeddings };
