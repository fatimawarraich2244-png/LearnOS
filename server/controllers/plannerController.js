const axios = require('axios');
const StudyPlan = require('../models/StudyPlan');
const Subject = require('../models/Subject');

// ── @desc   Generate AI Study Plan based on Knowledge Map
// ── @route  POST /api/planner/generate
// ── @access Private
const generatePlan = async (req, res) => {
  try {
    const { subjectId, examDate, hoursPerDay } = req.body;

    if (!subjectId || !examDate || !hoursPerDay) {
      return res.status(400).json({ message: 'subjectId, examDate, and hoursPerDay are required' });
    }

    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    if (subject.userId.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const topics = subject.knowledgeMap?.topics;
    if (!topics || !Array.isArray(topics) || topics.length === 0) {
      return res.status(400).json({ message: 'Generate a knowledge map first before creating a study plan' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const targetExamDate = new Date(examDate);
    targetExamDate.setHours(0, 0, 0, 0);

    const diffTime = targetExamDate.getTime() - today.getTime();
    const daysUntilExam = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (daysUntilExam <= 0) {
      return res.status(400).json({ message: 'Exam date must be in the future' });
    }

    const totalMinutesPerDay = Math.round(hoursPerDay * 60);

    const topicsFormatted = topics
      .map(
        (t) =>
          `Order ${t.order || 1}: ${t.name} (Subtopics: ${
            t.subtopics && t.subtopics.length > 0 ? t.subtopics.join(', ') : 'None'
          })`
      )
      .join('\n');

    const systemPrompt = `You are an expert study planner. Create a realistic, day-by-day study schedule starting tomorrow up to the exam date (${targetExamDate.toISOString().split('T')[0]}).
Number of study days available: ${daysUntilExam} days.
Daily study goal: ${hoursPerDay} hours (${totalMinutesPerDay} minutes per day).

Distribute all the topics and subtopics sequentially across the available days. Prioritize earlier topics first since they are foundational.

You MUST respond ONLY with a valid JSON object matching this structure:
{
  "schedule": [
    {
      "date": "YYYY-MM-DD",
      "topics": ["Topic name or subtopic name", "Another topic"],
      "durationMinutes": ${totalMinutesPerDay}
    }
  ]
}`;

    const userPrompt = `Subject: ${subject.name}
Topics to cover in order:\n${topicsFormatted}\n\nExam Date: ${targetExamDate.toISOString().split('T')[0]}\nDays Until Exam: ${daysUntilExam}\nHours Per Day: ${hoursPerDay}

Generate the study plan JSON now.`;

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

    let parsedData;
    try {
      parsedData = JSON.parse(rawContent);
    } catch (parseErr) {
      console.error('Failed to parse Groq study plan JSON:', rawContent);
      return res.status(500).json({
        message: 'Failed to parse generated study plan data. Please try again.',
        error: parseErr.message,
      });
    }

    const scheduleArray = Array.isArray(parsedData)
      ? parsedData
      : parsedData.schedule || [];

    const newPlan = await StudyPlan.create({
      subjectId,
      userId: req.userId,
      examDate: targetExamDate,
      hoursPerDay,
      schedule: scheduleArray,
    });

    return res.json({ plan: newPlan });
  } catch (error) {
    console.error('Error in generatePlan:', error.response?.data || error.message);
    return res.status(500).json({ message: `Error generating study plan: ${error.message}` });
  }
};

// ── @desc   Get most recent Study Plan for a subject
// ── @route  GET /api/planner/:subjectId
// ── @access Private
const getPlan = async (req, res) => {
  try {
    const plan = await StudyPlan.findOne({
      subjectId: req.params.subjectId,
      userId: req.userId,
    }).sort({ createdAt: -1 });

    return res.json(plan);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  generatePlan,
  getPlan,
};
