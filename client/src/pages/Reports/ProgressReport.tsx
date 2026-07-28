import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
// @ts-ignore
import API from '../../api/axios';
import toast from 'react-hot-toast';
import {
  BarChart2,
  Clock,
  CheckSquare,
  FileText,
  MessageSquare,
  Award,
  ArrowLeft,
} from 'lucide-react';

interface ReportSummary {
  totalStudyTimeMinutes: number;
  totalQuizzesTaken: number;
  totalMaterialsUploaded: number;
  totalQuestionsAsked: number;
  totalSubjects: number;
}

interface ScoreTrendPoint {
  date: string;
  score: number;
}

interface SubjectReportItem {
  subjectId: string;
  name: string;
  studyTimeMinutes: number;
  weakTopics: string[];
  strongTopics: string[];
  quizCount: number;
  averageScore: number;
  scoresTrend: ScoreTrendPoint[];
}

interface MostActiveSubject {
  subjectId: string;
  name: string;
  studyTimeMinutes: number;
  chatCount: number;
  quizCount: number;
  activityScore: number;
}

interface FullReportData {
  summary: ReportSummary;
  mostActiveSubject: MostActiveSubject | null;
  subjects: SubjectReportItem[];
}

const ProgressReport: React.FC = () => {
  const [report, setReport] = useState<FullReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await API.get('/subjects/report/full');
        if (res.data) {
          setReport(res.data);
        }
      } catch (err: any) {
        toast.error('Failed to load progress report');
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, []);

  const formatStudyTime = (minutes: number) => {
    if (!minutes || minutes <= 0) return { hours: 0, mins: 0 };
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return { hours, mins };
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
                Academic Progress & Analytics
              </h1>
              <p className="text-sm text-[#6B7B85] mt-0.5 font-normal">
                Comprehensive overview of your study metrics, subject performance, and activity trends.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin h-6 w-6 border-2 border-[#2E7C87] border-t-transparent rounded-full" />
            </div>
          ) : !report ? (
            <div className="bg-white rounded-2xl p-8 border border-dashed border-[#E5E7EB] text-center text-xs text-[#6B7B85]">
              No progress report data available yet.
            </div>
          ) : (
            <div className="flex flex-col gap-6">

              {/* ── Overall Summary Cards Grid ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-2xl p-6 border border-[#E5E7EB] flex flex-col justify-between gap-4 h-full">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-[#6B7B85]">Total Study Time</span>
                    <Clock className="w-4 h-4 text-[#2E7C87]" />
                  </div>
                  {(() => {
                    const { hours, mins } = formatStudyTime(report.summary.totalStudyTimeMinutes);
                    return (
                      <div>
                        <p className="text-2xl md:text-3xl font-semibold text-[#1E3A4A] leading-none [font-variant-numeric:tabular-nums]">
                          {String(hours).padStart(2, '0')}:{String(mins).padStart(2, '0')}
                        </p>
                        <p className="text-xs text-[#6B7B85] mt-2 font-normal">Hours and minutes logged</p>
                      </div>
                    );
                  })()}
                </div>

                <div className="bg-white rounded-2xl p-6 border border-[#E5E7EB] flex flex-col justify-between gap-4 h-full">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-[#6B7B85]">Quizzes Taken</span>
                    <CheckSquare className="w-4 h-4 text-[#2E7C87]" />
                  </div>
                  <div>
                    <p className="text-2xl md:text-3xl font-semibold text-[#1E3A4A] leading-none [font-variant-numeric:tabular-nums]">
                      {report.summary.totalQuizzesTaken}
                    </p>
                    <p className="text-xs text-[#6B7B85] mt-2 font-normal">Total completed attempts</p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-[#E5E7EB] flex flex-col justify-between gap-4 h-full">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-[#6B7B85]">Course Materials</span>
                    <FileText className="w-4 h-4 text-[#2E7C87]" />
                  </div>
                  <div>
                    <p className="text-2xl md:text-3xl font-semibold text-[#1E3A4A] leading-none [font-variant-numeric:tabular-nums]">
                      {report.summary.totalMaterialsUploaded}
                    </p>
                    <p className="text-xs text-[#6B7B85] mt-2 font-normal">Uploaded & indexed files</p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-[#E5E7EB] flex flex-col justify-between gap-4 h-full">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-[#6B7B85]">AI Questions Asked</span>
                    <MessageSquare className="w-4 h-4 text-[#2E7C87]" />
                  </div>
                  <div>
                    <p className="text-2xl md:text-3xl font-semibold text-[#1E3A4A] leading-none [font-variant-numeric:tabular-nums]">
                      {report.summary.totalQuestionsAsked}
                    </p>
                    <p className="text-xs text-[#6B7B85] mt-2 font-normal">AI chat interactions</p>
                  </div>
                </div>
              </div>

              {/* ── Most Active Subject Card ── */}
              {report.mostActiveSubject && (
                <div className="bg-white rounded-2xl p-6 border border-[#E5E7EB] flex flex-col gap-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-[#2E7C87]" />
                      <h2 className="text-sm font-semibold uppercase tracking-wide text-[#6B7B85]">
                        Most Active Subject
                      </h2>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-[#6B7B85] font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#2E7C87]" />
                      <span>Highest engagement</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <h3 className="font-sans font-semibold text-base text-[#1E3A4A]">
                        {report.mostActiveSubject.name}
                      </h3>
                      <p className="text-xs text-[#6B7B85] mt-0.5">
                        Logged {Math.round(report.mostActiveSubject.studyTimeMinutes)} mins of study time
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex flex-col items-end">
                        <span className="font-mono font-semibold text-[#1E3A4A] [font-variant-numeric:tabular-nums]">
                          {report.mostActiveSubject.chatCount}
                        </span>
                        <span className="text-[#6B7B85]">Chat queries</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="font-mono font-semibold text-[#1E3A4A] [font-variant-numeric:tabular-nums]">
                          {report.mostActiveSubject.quizCount}
                        </span>
                        <span className="text-[#6B7B85]">Quizzes</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Subject Performance Breakdown Grid ── */}
              <div className="bg-white rounded-2xl p-6 border border-[#E5E7EB] flex flex-col gap-6">
                <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
                  <div className="flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-[#2E7C87]" />
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-[#6B7B85]">
                      Subject Breakdown ({report.subjects.length})
                    </h2>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {report.subjects.map((subj) => (
                    <div
                      key={subj.subjectId}
                      className="bg-[#F0F4F7] rounded-xl p-4 border border-[#E5E7EB] flex flex-col justify-between gap-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-sans font-semibold text-sm text-[#1E3A4A] truncate">
                            {subj.name}
                          </h4>
                          <p className="text-xs text-[#6B7B85] mt-0.5">
                            {Math.round(subj.studyTimeMinutes)} mins studied
                          </p>
                        </div>
                        <span className="font-mono text-xs font-semibold text-[#2E7C87] [font-variant-numeric:tabular-nums]">
                          {subj.averageScore}% avg
                        </span>
                      </div>

                      <div className="w-full h-1.5 rounded-full bg-white overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#2E7C87]"
                          style={{ width: `${Math.min(subj.averageScore, 100)}%` }}
                        />
                      </div>

                      <div className="flex flex-col gap-1 text-xs">
                        {subj.weakTopics.length > 0 && (
                          <div className="flex items-center gap-1 text-[#6B7B85]">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                            <span className="truncate">Focus: {subj.weakTopics.slice(0, 2).join(', ')}</span>
                          </div>
                        )}
                        {subj.strongTopics.length > 0 && (
                          <div className="flex items-center gap-1 text-[#6B7B85]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#2E7C87] shrink-0" />
                            <span className="truncate">Strong: {subj.strongTopics.slice(0, 2).join(', ')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default ProgressReport;
