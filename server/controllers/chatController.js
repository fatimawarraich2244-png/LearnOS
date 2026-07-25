const axios = require('axios');
const Material = require('../models/Material');
const ChatMessage = require('../models/ChatMessage');
const { getEmbeddings } = require('../services/embeddings');
const { cosineSimilarity } = require('../services/similarity');

const askQuestion = async (req, res) => {
  try {
    const { subjectId, question } = req.body;
    if (!subjectId || !question) {
      return res.status(400).json({ message: 'subjectId and question are required' });
    }

    // Save user question immediately
    await ChatMessage.create({
      subjectId,
      userId: req.userId,
      role: 'user',
      content: question,
    });

    const materials = await Material.find({
      subjectId,
      userId: req.userId,
      embedded: true,
    });

    if (!materials || materials.length === 0) {
      const fallbackAns = 'No study materials uploaded yet for this subject.';
      await ChatMessage.create({
        subjectId,
        userId: req.userId,
        role: 'assistant',
        content: fallbackAns,
      });
      return res.json({ answer: fallbackAns, sourcesUsed: 0 });
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
      const fallbackAns = 'Study materials found, but they contain no extracted text.';
      await ChatMessage.create({
        subjectId,
        userId: req.userId,
        role: 'assistant',
        content: fallbackAns,
      });
      return res.json({ answer: fallbackAns, sourcesUsed: 0 });
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

    // Save assistant answer
    await ChatMessage.create({
      subjectId,
      userId: req.userId,
      role: 'assistant',
      content: answer,
    });

    return res.json({ answer, sourcesUsed: topChunks.length });

  } catch (error) {
    console.error('Error in askQuestion:', error.response?.data || error.message);
    return res.status(500).json({ message: `Error asking question: ${error.message}` });
  }
};

const detectConfusion = async (req, res) => {
  try {
    const { subjectId, confusedTopic } = req.body;
    if (!subjectId || !confusedTopic) {
      return res.status(400).json({ message: 'subjectId and confusedTopic are required' });
    }

    // Save user message immediately
    await ChatMessage.create({
      subjectId,
      userId: req.userId,
      role: 'user',
      content: `I'm confused about: ${confusedTopic}`,
    });

    const materials = await Material.find({
      subjectId,
      userId: req.userId,
      embedded: true,
    });

    if (!materials || materials.length === 0) {
      const fallbackAns = 'No study materials uploaded yet for this subject.';
      await ChatMessage.create({
        subjectId,
        userId: req.userId,
        role: 'assistant',
        content: fallbackAns,
      });
      return res.json({ answer: fallbackAns, sourcesUsed: 0 });
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
      const fallbackAns = 'Study materials found, but they contain no extracted text.';
      await ChatMessage.create({
        subjectId,
        userId: req.userId,
        role: 'assistant',
        content: fallbackAns,
      });
      return res.json({ answer: fallbackAns, sourcesUsed: 0 });
    }

    const confusedEmbeddings = await getEmbeddings([confusedTopic]);
    const confusedVector = confusedEmbeddings[0];

    if (!confusedVector) {
      return res.status(500).json({ message: 'Failed to generate embedding for the topic.' });
    }

    const scoredChunks = allChunks.map((chunk, index) => {
      const score = cosineSimilarity(confusedVector, allEmbeddings[index]);
      return { chunk, score };
    });

    scoredChunks.sort((a, b) => b.score - a.score);
    const topChunks = scoredChunks.slice(0, 5).map(sc => sc.chunk);

    const contextText = topChunks.join('\n\n');
    const systemPrompt = `You are a diagnostic learning assistant. The student says they are confused about: ${confusedTopic}. Using the context below, do NOT just explain this topic directly. Instead: 1. Identify what foundational concept or prerequisite knowledge is likely missing that's causing this confusion. 2. Briefly explain that prerequisite concept first in simple terms. 3. Then explain how that prerequisite connects to and clarifies ${confusedTopic}. Format your response with clear headers: "Likely Root Cause", "Foundation First", and "Now It Should Click". Context: \n${contextText}`;

    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `I'm confused about: ${confusedTopic}` }
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

    // Save assistant answer
    await ChatMessage.create({
      subjectId,
      userId: req.userId,
      role: 'assistant',
      content: answer,
    });

    return res.json({ answer, sourcesUsed: topChunks.length });

  } catch (error) {
    console.error('Error in detectConfusion:', error.response?.data || error.message);
    return res.status(500).json({ message: `Error detecting confusion: ${error.message}` });
  }
};

const getChatHistory = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const messages = await ChatMessage.find({
      subjectId,
      userId: req.userId,
    }).sort({ createdAt: 1 });

    return res.json(messages);
  } catch (error) {
    console.error('Error in getChatHistory:', error.message);
    return res.status(500).json({ message: `Error fetching chat history: ${error.message}` });
  }
};

module.exports = { askQuestion, detectConfusion, getChatHistory };
