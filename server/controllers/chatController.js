const axios = require('axios');
const Material = require('../models/Material');
const { getEmbeddings } = require('../services/embeddings');
const { cosineSimilarity } = require('../services/similarity');

const askQuestion = async (req, res) => {
  try {
    const { subjectId, question } = req.body;
    if (!subjectId || !question) {
      return res.status(400).json({ message: 'subjectId and question are required' });
    }

    const materials = await Material.find({
      subjectId,
      userId: req.userId,
      embedded: true,
    });

    if (!materials || materials.length === 0) {
      return res.json({ answer: 'No study materials uploaded yet for this subject.', sourcesUsed: 0 });
    }

    let allChunks = [];
    let allEmbeddings = [];

    materials.forEach(mat => {
      if (mat.chunks && mat.embeddings && mat.chunks.length === mat.embeddings.length) {
        allChunks = allChunks.concat(mat.chunks);
        allEmbeddings = allEmbeddings.concat(mat.embeddings);
      }
    });

    if (allChunks.length === 0) {
       return res.json({ answer: 'Study materials found, but they contain no extracted text.', sourcesUsed: 0 });
    }

    const questionEmbeddings = await getEmbeddings([question]);
    const questionVector = questionEmbeddings[0];

    if (!questionVector) {
      return res.status(500).json({ message: 'Failed to generate embedding for the question.' });
    }

    const scoredChunks = allChunks.map((chunk, index) => {
      const score = cosineSimilarity(questionVector, allEmbeddings[index]);
      return { chunk, score };
    });

    scoredChunks.sort((a, b) => b.score - a.score);
    const topChunks = scoredChunks.slice(0, 5).map(sc => sc.chunk);

    const contextText = topChunks.join('\n\n');
    const systemPrompt = `You are a helpful study assistant. Answer the student's question using ONLY the context provided below. If the answer isn't in the context, say so clearly. Context: \n${contextText}`;

    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const answer = response.data.choices[0].message.content;

    return res.json({ answer, sourcesUsed: topChunks.length });

  } catch (error) {
    console.error('Error in askQuestion:', error.response?.data || error.message);
    return res.status(500).json({ message: `Error asking question: ${error.message}` });
  }
};

module.exports = { askQuestion };
