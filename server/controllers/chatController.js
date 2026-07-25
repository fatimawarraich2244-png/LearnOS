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

    // Gamification Integration
    const { addXP } = require('../services/gamification');
    await addXP(req.userId, 5);

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

    const topicEmbeddings = await getEmbeddings([topic]);
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

    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Explain ${topic} at ${level} level` }
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
    console.error('Error in explainAtLevel:', error.response?.data || error.message);
    return res.status(500).json({ message: `Error explaining topic: ${error.message}` });
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

    const topicEmbeddings = await getEmbeddings([topic]);
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

    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
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
    console.error('Error in feynmanFeedback:', error.response?.data || error.message);
    return res.status(500).json({ message: `Error evaluating explanation: ${error.message}` });
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
