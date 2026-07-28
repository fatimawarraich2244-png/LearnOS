const axios = require('axios');
const GlobalBrain = require('../models/GlobalBrain');
const Subject = require('../models/Subject');
const Quiz = require('../models/Quiz');
const { sanitizeObjectStrings } = require('../utils/sanitize');

// ── @desc   Analyze cross-subject knowledge and update GlobalBrain
// ── @route  POST /api/brain/update
// ── @access Private
const updateGlobalBrain = async (req, res) => {
  try {
    // Find all subjects belonging to this user that have a knowledgeMap set
    const subjects = await Subject.find({ userId: req.userId });
    const subjectsWithMap = subjects.filter(
      (s) => s.knowledgeMap && s.knowledgeMap.topics && s.knowledgeMap.topics.length > 0
    );

    if (subjectsWithMap.length < 2) {
      return res.status(400).json({
        message: 'Add knowledge maps to at least 2 subjects to unlock cross-subject insights.',
      });
    }

    // Find all quizzes for this user and group by subjectId (latest score per subject)
    const quizzes = await Quiz.find({ userId: req.userId }).sort({ takenAt: -1, createdAt: -1 });

    const latestScoreBySubject = {};
    for (const quiz of quizzes) {
      const sid = quiz.subjectId.toString();
      if (!(sid in latestScoreBySubject)) {
        latestScoreBySubject[sid] = quiz.score;
      }
    }

    // Build the subject data payload for the prompt
    const subjectData = subjectsWithMap.map((s) => {
      const topics = s.knowledgeMap.topics;
      const allTopicNames = [];
      for (const t of topics) {
        allTopicNames.push(t.name);
        if (t.subtopics && t.subtopics.length > 0) {
          allTopicNames.push(...t.subtopics);
        }
      }

      return {
        subjectName: s.name,
        topics: allTopicNames,
        latestQuizScore: latestScoreBySubject[s._id.toString()] ?? null,
      };
    });

    const subjectDataFormatted = subjectData
      .map(
        (sd) =>
          `Subject: "${sd.subjectName}"\n  Topics/Concepts: ${sd.topics.join(', ')}\n  Latest Quiz Score: ${
            sd.latestQuizScore !== null ? `${sd.latestQuizScore}%` : 'No quiz taken'
          }`
      )
      .join('\n\n');

    const systemPrompt = `You are an expert learning analyst. Analyze the provided multi-subject study data and identify specific CONCEPTS (not full subject names — think specific technical concepts like "recursion", "graph traversal", "neural networks", "linear algebra", "hypothesis testing") that appear as topics or subtopics across MULTIPLE different subjects.

Based on the quiz scores, determine which shared concepts the student is weak in vs strong in.

Rules:
- Only include concepts that appear (by name or close variant) in 2 or more different subjects
- Severity for weak concepts: 1 (barely weak) to 10 (critically weak) — factor in how many subjects it appears in AND the quiz scores
- For weak concepts: lower quiz scores = higher severity
- Do NOT include concepts that appear in only 1 subject

You MUST respond ONLY with a valid JSON object. No additional text outside the JSON.

JSON structure:
{
  "weakConcepts": [
    {
      "concept": "concept name",
      "subjects": ["Subject Name A", "Subject Name B"],
      "severity": 7
    }
  ],
  "strongConcepts": [
    {
      "concept": "concept name",
      "subjects": ["Subject Name A", "Subject Name B"]
    }
  ]
}`;

    const userPrompt = `Student Study Data:\n\n${subjectDataFormatted}\n\nAnalyze and return the cross-subject concept insights JSON now.`;

    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    let rawContent = response.data?.choices?.[0]?.message?.content || '';
    rawContent = rawContent.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(rawContent);
      parsed = sanitizeObjectStrings(parsed);
    } catch (parseErr) {
      console.error('Failed to parse GlobalBrain Groq JSON:', rawContent);
      return res.status(500).json({
        message: 'Failed to parse AI response for GlobalBrain. Please try again.',
        error: parseErr.message,
      });
    }

    const updatedBrain = await GlobalBrain.findOneAndUpdate(
      { userId: req.userId },
      {
        weakConcepts: parsed.weakConcepts || [],
        strongConcepts: parsed.strongConcepts || [],
        updatedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    return res.json({ brain: updatedBrain });
  } catch (error) {
    console.error('Error in updateGlobalBrain:', error.response?.data || error.message);
    return res.status(500).json({ message: `Error updating GlobalBrain: ${error.message}` });
  }
};

module.exports = { updateGlobalBrain };
