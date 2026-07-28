const axios = require('axios');
const Material = require('../models/Material');
const ChatMessage = require('../models/ChatMessage');
const { getEmbeddings } = require('../services/embeddings');
const { cosineSimilarity } = require('../services/similarity');

/**
 * Returns true when the error is a transient network/DNS failure talking to
 * an external API (Voyage AI, Groq, etc.) rather than a logic error.
 */
const isNetworkError = (err) => {
  const networkCodes = ['EAI_AGAIN', 'ENOTFOUND', 'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT'];
  return networkCodes.includes(err.code);
};

const NETWORK_ERROR_MSG =
  'Unable to reach the AI service right now — please check your internet connection and try again.';

const sendSSEFallback = async (res, subjectId, userId, fallbackAns) => {
  await ChatMessage.create({
    subjectId,
    userId,
    role: 'assistant',
    content: fallbackAns,
  });
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.write(`data: ${JSON.stringify({ content: fallbackAns })}\n\n`);
  res.write('data: [DONE]\n\n');
  res.end();
};

const handleGroqStream = async ({
  req,
  res,
  subjectId,
  systemPrompt,
  userPrompt,
  onComplete,
}) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        stream: true,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        responseType: 'stream',
      }
    );

    let fullAnswer = '';
    let buffer = '';

    response.data.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      const lines = buffer.split('\n');
      buffer = lines.pop(); // save trailing partial line in buffer

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;
        if (trimmed === 'data: [DONE]') continue;

        try {
          const jsonStr = trimmed.replace(/^data:\s*/, '');
          const parsed = JSON.parse(jsonStr);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            fullAnswer += delta;
            res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
          }
        } catch (e) {
          // ignore partial json parse error
        }
      }
    });

    response.data.on('end', async () => {
      if (buffer.trim()) {
        const trimmed = buffer.trim();
        if (trimmed.startsWith('data:') && trimmed !== 'data: [DONE]') {
          try {
            const jsonStr = trimmed.replace(/^data:\s*/, '');
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              fullAnswer += delta;
              res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
            }
          } catch (e) {}
        }
      }

      if (fullAnswer) {
        await ChatMessage.create({
          subjectId,
          userId: req.userId,
          role: 'assistant',
          content: fullAnswer,
        });

        if (onComplete) {
          await onComplete();
        }
      }

      res.write('data: [DONE]\n\n');
      res.end();
    });

    response.data.on('error', (err) => {
      console.error('Groq stream error:', err);
      res.write('data: [DONE]\n\n');
      res.end();
    });
  } catch (error) {
    console.error('Error in Groq stream setup:', error.response?.data || error.message);
    if (!res.headersSent) {
      return res.status(500).json({ message: `Error generating response: ${error.message}` });
    }
    res.write(`data: ${JSON.stringify({ content: `Error: ${error.message}` })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
};

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
      return sendSSEFallback(res, subjectId, req.userId, fallbackAns);
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
      return sendSSEFallback(res, subjectId, req.userId, fallbackAns);
    }

    let questionEmbeddings;
    try {
      questionEmbeddings = await getEmbeddings([question]);
    } catch (embErr) {
      const msg = isNetworkError(embErr) ? NETWORK_ERROR_MSG : `Failed to generate embedding: ${embErr.message}`;
      console.error('[askQuestion] Embedding error:', embErr.code || embErr.message);
      return sendSSEFallback(res, subjectId, req.userId, msg);
    }
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

    const { addXP } = require('../services/gamification');

    await handleGroqStream({
      req,
      res,
      subjectId,
      systemPrompt,
      userPrompt: question,
      onComplete: async () => {
        await addXP(req.userId, 5);
      },
    });

  } catch (error) {
    console.error('Error in askQuestion:', error.response?.data || error.message);
    if (!res.headersSent) {
      return res.status(500).json({ message: `Error asking question: ${error.message}` });
    }
    res.write(`data: ${JSON.stringify({ content: `Error asking question: ${error.message}` })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
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
      return sendSSEFallback(res, subjectId, req.userId, fallbackAns);
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
      return sendSSEFallback(res, subjectId, req.userId, fallbackAns);
    }

    let confusedEmbeddings;
    try {
      confusedEmbeddings = await getEmbeddings([confusedTopic]);
    } catch (embErr) {
      const msg = isNetworkError(embErr) ? NETWORK_ERROR_MSG : `Failed to generate embedding: ${embErr.message}`;
      console.error('[detectConfusion] Embedding error:', embErr.code || embErr.message);
      return sendSSEFallback(res, subjectId, req.userId, msg);
    }
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

    await handleGroqStream({
      req,
      res,
      subjectId,
      systemPrompt,
      userPrompt: `I'm confused about: ${confusedTopic}`,
    });

  } catch (error) {
    console.error('Error in detectConfusion:', error.response?.data || error.message);
    if (!res.headersSent) {
      return res.status(500).json({ message: `Error detecting confusion: ${error.message}` });
    }
    res.write(`data: ${JSON.stringify({ content: `Error detecting confusion: ${error.message}` })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
};

const explainAtLevel = async (req, res) => {
  try {
    const { subjectId, topic, level = 'university' } = req.body;
    if (!subjectId || !topic) {
      return res.status(400).json({ message: 'subjectId and topic are required' });
    }

    const levelPrompts = {
      eli6: 'Explain this to a 6 year old using very simple words and fun analogies',
      highschool: 'Explain this the way a high school teacher would, clear and approachable',
      university: 'Explain this at university level with proper technical terminology',
      exam: 'Explain this as a model exam answer, structured and precise, the way a top student would write it',
      interview: 'Explain this as if answering a technical interview question, confident and concise with the key points a candidate should hit',
    };

    const selectedPromptInstruction = levelPrompts[level] || levelPrompts.university;

    // Save user message immediately
    await ChatMessage.create({
      subjectId,
      userId: req.userId,
      role: 'user',
      content: `Explain ${topic} at ${level} level`,
    });

    const materials = await Material.find({
      subjectId,
      userId: req.userId,
      embedded: true,
    });

    if (!materials || materials.length === 0) {
      const fallbackAns = 'No study materials uploaded yet for this subject.';
      return sendSSEFallback(res, subjectId, req.userId, fallbackAns);
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
      return sendSSEFallback(res, subjectId, req.userId, fallbackAns);
    }

    let topicEmbeddings;
    try {
      topicEmbeddings = await getEmbeddings([topic]);
    } catch (embErr) {
      const msg = isNetworkError(embErr) ? NETWORK_ERROR_MSG : `Failed to generate embedding: ${embErr.message}`;
      console.error('[explainAtLevel] Embedding error:', embErr.code || embErr.message);
      return sendSSEFallback(res, subjectId, req.userId, msg);
    }
    const topicVector = topicEmbeddings[0];

    if (!topicVector) {
      return res.status(500).json({ message: 'Failed to generate embedding for the topic.' });
    }

    const scoredChunks = allChunks.map((chunk, index) => {
      const score = cosineSimilarity(topicVector, allEmbeddings[index]);
      return { chunk, score };
    });

    scoredChunks.sort((a, b) => b.score - a.score);
    const topChunks = scoredChunks.slice(0, 5).map(sc => sc.chunk);

    const contextText = topChunks.join('\n\n');
    const systemPrompt = `${selectedPromptInstruction}. Answer the student's request about "${topic}" using the context provided below. Context: \n${contextText}`;

    await handleGroqStream({
      req,
      res,
      subjectId,
      systemPrompt,
      userPrompt: `Explain ${topic} at ${level} level`,
    });

  } catch (error) {
    console.error('Error in explainAtLevel:', error.response?.data || error.message);
    if (!res.headersSent) {
      return res.status(500).json({ message: `Error explaining topic: ${error.message}` });
    }
    res.write(`data: ${JSON.stringify({ content: `Error explaining topic: ${error.message}` })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
};

const feynmanFeedback = async (req, res) => {
  try {
    const { subjectId, topic, studentExplanation } = req.body;
    if (!subjectId || !topic || !studentExplanation) {
      return res.status(400).json({ message: 'subjectId, topic, and studentExplanation are required' });
    }

    const rawUserContent = `Teaching: ${topic} - ${studentExplanation}`;
    const userContent = rawUserContent.length > 300 ? rawUserContent.slice(0, 300) + '...' : rawUserContent;

    // Save user message immediately
    await ChatMessage.create({
      subjectId,
      userId: req.userId,
      role: 'user',
      content: userContent,
    });

    const materials = await Material.find({
      subjectId,
      userId: req.userId,
      embedded: true,
    });

    if (!materials || materials.length === 0) {
      const fallbackAns = 'No study materials uploaded yet for this subject to evaluate your explanation.';
      return sendSSEFallback(res, subjectId, req.userId, fallbackAns);
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
      return sendSSEFallback(res, subjectId, req.userId, fallbackAns);
    }

    let topicEmbeddings;
    try {
      topicEmbeddings = await getEmbeddings([topic]);
    } catch (embErr) {
      const msg = isNetworkError(embErr) ? NETWORK_ERROR_MSG : `Failed to generate embedding: ${embErr.message}`;
      console.error('[feynmanFeedback] Embedding error:', embErr.code || embErr.message);
      return sendSSEFallback(res, subjectId, req.userId, msg);
    }
    const topicVector = topicEmbeddings[0];

    if (!topicVector) {
      return res.status(500).json({ message: 'Failed to generate embedding for the topic.' });
    }

    const scoredChunks = allChunks.map((chunk, index) => {
      const score = cosineSimilarity(topicVector, allEmbeddings[index]);
      return { chunk, score };
    });

    scoredChunks.sort((a, b) => b.score - a.score);
    const topChunks = scoredChunks.slice(0, 5).map(sc => sc.chunk);

    const contextText = topChunks.join('\n\n');
    const systemPrompt = `You are evaluating a student's explanation of a concept using the Feynman technique. The student is trying to explain: ${topic}. Their explanation is: ${studentExplanation}. Using the reference material as ground truth, evaluate their explanation and respond with these sections: "What You Got Right" (specific things they explained correctly), "Missing Pieces" (important aspects they left out or got wrong), "Clarity Score" (a number out of 10 with brief reasoning), "Try Again?" (one specific suggestion to improve their explanation). Be encouraging but honest. Reference material: \n${contextText}`;

    await handleGroqStream({
      req,
      res,
      subjectId,
      systemPrompt,
      userPrompt: userContent,
    });

  } catch (error) {
    console.error('Error in feynmanFeedback:', error.response?.data || error.message);
    if (!res.headersSent) {
      return res.status(500).json({ message: `Error evaluating explanation: ${error.message}` });
    }
    res.write(`data: ${JSON.stringify({ content: `Error evaluating explanation: ${error.message}` })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
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

module.exports = { askQuestion, detectConfusion, explainAtLevel, feynmanFeedback, getChatHistory };
