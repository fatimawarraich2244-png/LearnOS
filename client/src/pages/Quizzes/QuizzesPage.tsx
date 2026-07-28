import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
// @ts-ignore
import API from '../../api/axios';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import { sanitizeTextForPDF } from '../../utils/pdfSanitizer';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckSquare,
  Download,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  ArrowLeft,
} from 'lucide-react';

interface SubjectOption {
  _id: string;
  name: string;
}

interface QuestionItem {
  question: string;
  options?: string[];
  userAnswer?: string;
  correctAnswer?: string;
  explanation?: string;
  isCorrect?: boolean;
}

interface QuizHistoryItem {
  _id: string;
  subjectId: {
    _id: string;
    name: string;
  } | null;
  score: number;
  difficulty: string;
  examMode?: boolean;
  topic?: string;
  timeTakenSeconds?: number;
  questions?: QuestionItem[];
  takenAt?: string;
  createdAt?: string;
}

export const QuizzesPage: React.FC = () => {
  const [quizzes, setQuizzes] = useState<QuizHistoryItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters & State
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [quizRes, subjRes] = await Promise.all([
          API.get('/quiz/history-all'),
          API.get('/subjects/all'),
        ]);
        console.log('[DEBUG Handoff 4 Frontend Quiz History Fetched]', quizRes.data);
        setQuizzes(quizRes.data);
        setSubjects(subjRes.data);
      } catch (err: any) {
        toast.error('Failed to load quiz history');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredQuizzes = quizzes.filter((q) => {
    if (selectedSubjectFilter === 'all') return true;
    return q.subjectId && q.subjectId._id === selectedSubjectFilter;
  });

  const totalCount = filteredQuizzes.length;
  const avgScore =
    totalCount > 0
      ? Math.round(filteredQuizzes.reduce((acc, curr) => acc + (curr.score || 0), 0) / totalCount)
      : 0;
  const maxScore =
    totalCount > 0 ? Math.max(...filteredQuizzes.map((q) => q.score || 0)) : 0;

  const handleExportPDF = (quizItem: QuizHistoryItem) => {
    if (!quizItem) return;

    console.log('[DEBUG Handoff 5 PDF Generator Input]', {
      quizId: quizItem._id,
      score: quizItem.score,
      questions: quizItem.questions?.map((q, idx) => ({
        idx,
        question: q.question,
        userAnswer: q.userAnswer,
        correctAnswer: q.correctAnswer,
        isCorrect: q.isCorrect,
      })),
    });

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const rawSubjectName = quizItem.subjectId?.name || 'Subject';
    const isExam = quizItem.examMode;
    const rawTitleText = isExam ? `Exam Results - ${rawSubjectName}` : `Quiz Results - ${rawSubjectName}`;
    const cleanTitle = sanitizeTextForPDF(rawTitleText);
    const dateStr = new Date(quizItem.takenAt || quizItem.createdAt || Date.now()).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const scorePct = quizItem.score || 0;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(0, 128, 128);
    doc.text(cleanTitle, 14, 20);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(90, 90, 90);
    doc.text(`Date Taken: ${dateStr}  |  Score: ${scorePct}%`, 14, 28);

    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(14, 32, 196, 32);

    let y = 40;
    const questions = quizItem.questions || [];

    questions.forEach((q: QuestionItem, idx: number) => {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(20, 20, 20);
      const cleanQText = sanitizeTextForPDF(`Q${idx + 1}: ${q.question || ''}`);
      const splitQ = doc.splitTextToSize(cleanQText, 175);
      doc.text(splitQ, 14, y);
      y += splitQ.length * 5 + 2;

      if (Array.isArray(q.options) && q.options.length > 0) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(70, 70, 70);
        q.options.forEach((opt: string, optIdx: number) => {
          if (y > 270) {
            doc.addPage();
            y = 20;
          }
          const optLetter = String.fromCharCode(65 + optIdx);
          const cleanOptText = sanitizeTextForPDF(`   ${optLetter}. ${opt}`);
          const splitOpt = doc.splitTextToSize(cleanOptText, 170);
          doc.text(splitOpt, 16, y);
          y += splitOpt.length * 4.5;
        });
        y += 1;
      }

      const rawUserAns = q.userAnswer || (q.isCorrect ? q.correctAnswer : '');
      const userAnsDisplay = rawUserAns ? rawUserAns : 'No answer';
      const cleanUserAns = sanitizeTextForPDF(userAnsDisplay);
      const cleanCorrectAns = sanitizeTextForPDF(q.correctAnswer || '');
      const isCorrect = q.userAnswer ? q.userAnswer === q.correctAnswer : (q.isCorrect ?? false);

      doc.setFontSize(10);

      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(40, 40, 40);
      doc.text('Your Answer: ', 16, y);
      doc.setFont('helvetica', 'normal');
      const splitUserAns = doc.splitTextToSize(cleanUserAns, 145);
      doc.text(splitUserAns, 44, y);
      y += splitUserAns.length * 4.5 + 1;

      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(40, 40, 40);
      doc.text('Correct Answer: ', 16, y);
      doc.setFont('helvetica', 'normal');
      const splitCorrectAns = doc.splitTextToSize(cleanCorrectAns, 145);
      doc.text(splitCorrectAns, 48, y);
      y += splitCorrectAns.length * 4.5 + 1;

      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFont('helvetica', 'bold');
      if (isCorrect) {
        doc.setTextColor(34, 197, 94);
        doc.text('Result: Correct [PASS]', 16, y);
      } else {
        doc.setTextColor(239, 68, 68);
        doc.text('Result: Incorrect [FAIL]', 16, y);
      }
      y += 5;

      if (q.explanation) {
        if (y > 265) { doc.addPage(); y = 20; }
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(70, 70, 70);
        doc.text('Explanation: ', 16, y);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(90, 90, 90);
        const cleanExplanation = sanitizeTextForPDF(q.explanation);
        const splitExp = doc.splitTextToSize(cleanExplanation, 145);
        doc.text(splitExp, 40, y);
        y += splitExp.length * 4.5 + 2;
      }

      y += 2;
      doc.setDrawColor(230, 230, 230);
      doc.line(14, y, 196, y);
      y += 6;
    });

    const sanitizedSubj = rawSubjectName.replace(/[^a-zA-Z0-9]/g, '_');
    const sanitizedDate = new Date().toISOString().split('T')[0];
    doc.save(`QuizResults-${sanitizedSubj}-${sanitizedDate}.pdf`);
    toast.success('Quiz Results PDF exported!');
  };

  return (
    <div className="min-h-screen font-sans flex bg-[#F0F4F7] text-[#1E3A4A]">
      {/* ── Persistent Sidebar Navigation ── */}
      <Sidebar />

      {/* ── Main Content Area ── */}
      <main className="flex-1 ml-0 md:ml-64 pt-14 md:pt-0 min-h-screen flex flex-col overflow-y-auto bg-[#F0F4F7]">
        <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-4 sm:gap-6">

          {/* Top Header Row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-[#E5E7EB] gap-4">
            <div>
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-1.5 text-xs text-[#2E7C87] font-semibold hover:underline mb-2 no-underline"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Dashboard</span>
              </Link>
              <h1 className="font-sans font-semibold text-[#1E3A4A] text-lg md:text-xl tracking-tight">
                Quiz & Practice History
              </h1>
              <p className="text-sm text-[#6B7B85] mt-0.5 font-normal">
                Review past assessment scores, topic performance, and question explanations.
              </p>
            </div>

            {/* Subject Filter Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#6B7B85]">Subject:</span>
              <select
                value={selectedSubjectFilter}
                onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-xs font-medium text-[#1E3A4A] bg-white focus:outline-none focus:border-[#2E7C87]"
              >
                <option value="all">All Subjects ({quizzes.length})</option>
                {subjects.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Metrics Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-[#E5E7EB] flex flex-col justify-between gap-2 h-full">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#6B7B85]">
                Quizzes Taken
              </span>
              <p className="text-2xl md:text-3xl font-semibold text-[#1E3A4A] leading-none [font-variant-numeric:tabular-nums]">
                {totalCount}
              </p>
              <span className="text-xs text-[#6B7B85] font-normal">Total recorded attempts</span>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-[#E5E7EB] flex flex-col justify-between gap-2 h-full">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#6B7B85]">
                Average Score
              </span>
              <p className="text-2xl md:text-3xl font-semibold text-[#1E3A4A] leading-none [font-variant-numeric:tabular-nums]">
                {avgScore}%
              </p>
              <span className="text-xs text-[#6B7B85] font-normal">Mean performance rate</span>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-[#E5E7EB] flex flex-col justify-between gap-2 h-full">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#6B7B85]">
                Highest Score
              </span>
              <p className="text-2xl md:text-3xl font-semibold text-[#2E7C87] leading-none [font-variant-numeric:tabular-nums]">
                {maxScore}%
              </p>
              <span className="text-xs text-[#6B7B85] font-normal">Best attempt score</span>
            </div>
          </div>

          {/* Quiz Attempts List */}
          <div className="bg-white rounded-2xl p-6 border border-[#E5E7EB] flex flex-col gap-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[#6B7B85]">
                Attempt History
              </h2>
              <span className="text-xs font-semibold text-[#1E3A4A] font-mono [font-variant-numeric:tabular-nums]">
                {filteredQuizzes.length} Results
              </span>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin h-6 w-6 border-2 border-[#2E7C87] border-t-transparent rounded-full" />
              </div>
            ) : filteredQuizzes.length === 0 ? (
              <div className="bg-[#F0F4F7] rounded-xl p-8 border border-dashed border-[#E5E7EB] text-center text-xs text-[#6B7B85]">
                No quiz history available for the selected filter.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {filteredQuizzes.map((item) => {
                  const isExpanded = expandedId === item._id;
                  const formattedDate = new Date(item.takenAt || item.createdAt || Date.now()).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <div
                      key={item._id}
                      className="bg-[#F0F4F7] rounded-xl border border-[#E5E7EB] overflow-hidden transition-colors"
                    >
                      {/* Compact Header Row */}
                      <div
                        onClick={() => setExpandedId(isExpanded ? null : item._id)}
                        className="p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-white/60 transition-colors flex-wrap md:flex-nowrap"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-[#2E7C87]/10 text-[#2E7C87] flex items-center justify-center shrink-0">
                            <CheckSquare className="w-4 h-4" />
                          </div>

                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-sans font-semibold text-xs text-[#1E3A4A] truncate">
                                {item.subjectId?.name || 'Subject'}
                              </span>
                              <div className="flex items-center gap-1 text-xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#2E7C87]" />
                                <span className="text-[#6B7B85] font-normal capitalize">
                                  {item.examMode ? 'Mock Exam' : 'Practice Quiz'} ({item.difficulty})
                                </span>
                              </div>
                            </div>
                            {item.topic && (
                              <span className="text-[11px] text-[#6B7B85] truncate font-normal">
                                Topic: {item.topic}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-4 shrink-0">
                          <span className="font-mono text-sm font-semibold text-[#1E3A4A] [font-variant-numeric:tabular-nums]">
                            {item.score}%
                          </span>

                          <span className="text-xs text-[#6B7B85] font-mono hidden sm:inline">
                            {formattedDate}
                          </span>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExportPDF(item);
                            }}
                            className="p-1.5 rounded-lg border border-[#E5E7EB] bg-white text-[#2E7C87] hover:bg-[#F0F4F7] transition-colors cursor-pointer flex items-center gap-1 text-xs font-medium"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>PDF</span>
                          </button>

                          <button type="button" className="text-[#6B7B85]">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Question Breakdown */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="p-4 border-t border-[#E5E7EB] bg-white flex flex-col gap-3"
                          >
                            <span className="text-xs font-semibold uppercase tracking-wide text-[#6B7B85]">
                              Question Breakdown ({item.questions?.length || 0})
                            </span>

                            <div className="flex flex-col gap-2">
                              {item.questions?.map((q, qIdx) => {
                                const isCorrect = q.userAnswer === q.correctAnswer;
                                return (
                                  <div
                                    key={qIdx}
                                    className="p-3 rounded-lg border border-[#E5E7EB] bg-[#F0F4F7] flex flex-col gap-1.5"
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <p className="text-xs font-semibold text-[#1E3A4A]">
                                        Q{qIdx + 1}: {q.question}
                                      </p>
                                      {isCorrect ? (
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                      ) : (
                                        <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                                      )}
                                    </div>

                                    <div className="flex items-center gap-4 text-xs font-normal text-[#6B7B85]">
                                      <span>Your Answer: <strong className="text-[#1E3A4A] font-medium">{q.userAnswer || 'None'}</strong></span>
                                      <span>Correct: <strong className="text-[#1E3A4A] font-medium">{q.correctAnswer}</strong></span>
                                    </div>

                                    {q.explanation && (
                                      <p className="text-[11px] text-[#6B7B85] italic mt-1">
                                        {q.explanation}
                                      </p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
};

export default QuizzesPage;
