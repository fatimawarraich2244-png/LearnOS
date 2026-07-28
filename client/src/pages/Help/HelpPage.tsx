import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  HelpCircle,
  Map,
  Calendar,
  CheckSquare,
  Search,
  ChevronDown,
  ChevronUp,
  Mail,
} from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

const FAQS: FAQItem[] = [
  {
    question: 'How do I generate a Knowledge Map for my subject?',
    answer:
      'Upload course materials (PDF, DOCX, TXT) in the Subject page, then click "Generate Knowledge Map". LearnOS will analyze your files and construct a structured topic tree.',
  },
  {
    question: 'How does the AI Study Planner work?',
    answer:
      'Once a Knowledge Map is created, enter your target exam date and daily study capacity (hours/day). The AI will generate a day-by-day schedule with topic assignments.',
  },
  {
    question: 'How are XP points and Streaks calculated?',
    answer:
      'You earn XP by uploading study materials (+15 XP), completing quizzes (+25 XP), logging study sessions (+20 XP), and generating study plans (+30 XP). Daily study activity increments your streak.',
  },
  {
    question: 'How do I export my Study Plans or Quiz Results as PDF?',
    answer:
      'In the AI Study Planner card, click "Download as PDF". In the Quiz History section, click the "PDF" button on any attempt row to generate a styled report document.',
  },
  {
    question: 'Is there a limit on AI requests?',
    answer:
      'To protect server resources, AI-generation endpoints (knowledge maps, quizzes, study plans) are rate-limited to 30 requests per hour per user.',
  },
];

export const HelpPage: React.FC = () => {
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);

  return (
    <div className="min-h-screen font-sans flex bg-[#F0F4F7] text-[#1E3A4A]">
      {/* ── Persistent Sidebar Navigation ── */}
      <Sidebar />

      {/* ── Main Content Area ── */}
      <main className="flex-1 ml-0 md:ml-64 pt-14 md:pt-0 min-h-screen flex flex-col overflow-y-auto bg-[#F0F4F7]">
        <div className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-4 sm:gap-6">
          {/* Top Header Row with Back to Dashboard Link */}
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-[#E5E7EB] gap-4">
            <div>
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-1.5 text-xs text-[#2E7C87] font-semibold hover:underline mb-2 no-underline"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Dashboard</span>
              </Link>
              <h1 className="font-sans font-semibold text-[#1E3A4A] text-lg md:text-xl tracking-tight flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-[#2E7C87]" />
                <span>Help & Support Center</span>
              </h1>
              <p className="text-xs text-[#6B7B85] mt-0.5 font-normal">
                Platform guides, feature walkthroughs, and answers to common questions.
              </p>
            </div>
          </div>

          {/* Quick Feature Guides Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-[#E5E7EB] flex flex-col gap-2">
              <div className="w-9 h-9 rounded-xl bg-[#2E7C87]/10 text-[#2E7C87] flex items-center justify-center shrink-0">
                <Map className="w-4 h-4" />
              </div>
              <h3 className="font-sans font-semibold text-sm text-[#1E3A4A]">Knowledge Mapping</h3>
              <p className="text-xs text-[#6B7B85] leading-relaxed">
                Upload course syllabi, lecture notes, or textbooks. The AI automatically breaks down complex subjects into key topics and subtopics.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-[#E5E7EB] flex flex-col gap-2">
              <div className="w-9 h-9 rounded-xl bg-[#2E7C87]/10 text-[#2E7C87] flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <h3 className="font-sans font-semibold text-sm text-[#1E3A4A]">Smart Study Planner</h3>
              <p className="text-xs text-[#6B7B85] leading-relaxed">
                Input your exam date and daily study capacity. LearnOS balances topic difficulty across available days to optimize retention.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-[#E5E7EB] flex flex-col gap-2">
              <div className="w-9 h-9 rounded-xl bg-[#2E7C87]/10 text-[#2E7C87] flex items-center justify-center shrink-0">
                <CheckSquare className="w-4 h-4" />
              </div>
              <h3 className="font-sans font-semibold text-sm text-[#1E3A4A]">Quizzes & Mock Exams</h3>
              <p className="text-xs text-[#6B7B85] leading-relaxed">
                Test your mastery with AI-generated multiple choice questions. Receive instant scoring, checkmark breakdown, and explanations.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-[#E5E7EB] flex flex-col gap-2">
              <div className="w-9 h-9 rounded-xl bg-[#2E7C87]/10 text-[#2E7C87] flex items-center justify-center shrink-0">
                <Search className="w-4 h-4" />
              </div>
              <h3 className="font-sans font-semibold text-sm text-[#1E3A4A]">Global Workspace Search</h3>
              <p className="text-xs text-[#6B7B85] leading-relaxed">
                Use the search bar at the top of the sidebar or dashboard to instantly locate subjects, uploaded materials, and past AI chat prompts.
              </p>
            </div>
          </div>

          {/* Frequently Asked Questions Section */}
          <div className="bg-white rounded-2xl p-6 border border-[#E5E7EB] flex flex-col gap-4">
            <div>
              <h3 className="font-sans font-semibold text-base text-[#1E3A4A]">
                Frequently Asked Questions
              </h3>
              <p className="text-xs text-[#6B7B85] mt-0.5">
                Click any question below to expand details
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              {FAQS.map((faq, idx) => {
                const isOpen = openFaqIdx === idx;
                return (
                  <div
                    key={idx}
                    className="border border-[#E5E7EB] bg-[#F0F4F7]/60 rounded-xl overflow-hidden transition-all"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                      className="w-full text-left p-4 flex items-center justify-between gap-4 font-sans font-semibold text-xs text-[#1E3A4A] hover:text-[#2E7C87] transition-colors cursor-pointer"
                    >
                      <span>{faq.question}</span>
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-[#2E7C87] shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-[#6B7B85] shrink-0" />
                      )}
                    </button>

                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="px-4 pb-4 text-xs text-[#6B7B85] leading-relaxed border-t border-[#E5E7EB] pt-3"
                        >
                          {faq.answer}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Support Banner */}
          <div className="bg-[#1E3A4A] rounded-2xl p-6 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h4 className="font-sans font-semibold text-sm text-white">Need Additional Help?</h4>
              <p className="text-xs text-white/70 mt-0.5">Our support team is available for platform assistance and feature inquiries.</p>
            </div>
            <a
              href="mailto:support@learnos.ai"
              className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#2E7C87] hover:bg-[#256770] transition-colors no-underline flex items-center gap-1.5 shrink-0"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Contact Support</span>
            </a>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HelpPage;
