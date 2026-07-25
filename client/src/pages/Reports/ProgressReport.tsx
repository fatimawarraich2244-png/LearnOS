import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
// @ts-ignore
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import logo from '../../assets/logo.png';

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

/* ─── Icon Badge Helper ─── */
const IconBadge = ({ children, bg, glow, color, size = 48 }: { children: React.ReactNode; bg: string; glow: string; color: string; size?: number }) => (
  <div style={{ width: size, height: size, background: bg, boxShadow: `0 0 18px ${glow}`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
    <div style={{ width: 22, height: 22 }}>{children}</div>
  </div>
);

/* ─── SVG Polyline Trend Chart ─── */
const ScoreTrendChart = ({ trend }: { trend: ScoreTrendPoint[] }) => {
  if (!trend || trend.length === 0) {
    return (
      <div className="h-28 flex items-center justify-center text-xs text-[#346659] border border-dashed border-[#1a3a38] rounded-2xl">
        No quiz score data available yet
      </div>
    );
  }

  const width = 320;
  const height = 90;

  const points = trend.map((p, idx) => {
    const x = trend.length > 1 ? (idx / (trend.length - 1)) * (width - 40) + 20 : width / 2;
    const y = height - (Math.min(100, Math.max(0, p.score)) / 100) * (height - 30) - 15;
    return { x, y, score: p.score };
  });

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs text-[#8EB69B]">
        <span>Quiz Performance Trend ({trend.length} attempts)</span>
        <span className="font-semibold text-emerald-400">Latest Score: {trend[trend.length - 1].score}%</span>
      </div>
      <div className="relative rounded-2xl p-4 bg-[#061012] border border-white/5 overflow-hidden">
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
          <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
          {points.length > 1 && (
            <polyline
              fill="none"
              stroke="#4EC9D4"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={polylinePoints}
            />
          )}
          {points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="4.5" fill="#4EC9D4" stroke="#061012" strokeWidth="2" />
          ))}
        </svg>
      </div>
    </div>
  );
};

/* ─── Main Component ─── */
const ProgressReport: React.FC = () => {
  const [reportData, setReportData] = useState<FullReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const { user, logoutUser } = useAuth();

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await API.get('/subjects/report/full');
        setReportData(res.data);
      } catch (err: any) {
        console.error('Failed to fetch progress report:', err);
        setError(err.response?.data?.message || 'Failed to load progress report');
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
    <div className="min-h-screen font-inter flex flex-col relative overflow-x-hidden" style={{ backgroundColor: '#060E10', color: '#DAF1DE' }}>

      {/* Ambient Background Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-15%', left: '-10%', width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,212,220,0.07) 0%, transparent 65%)', filter: 'blur(80px)' }} />
        <div style={{ position: 'absolute', top: '25%', right: '-10%', width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle, rgba(149,155,185,0.07) 0%, transparent 65%)', filter: 'blur(80px)' }} />
        <div style={{ position: 'absolute', bottom: '5%', left: '30%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(78,201,212,0.05) 0%, transparent 65%)', filter: 'blur(70px)' }} />
      </div>

      {/* Navbar */}
      <nav style={{ background: 'linear-gradient(90deg, #0A1F20 0%, #0D2420 50%, #0A1A2A 100%)', borderBottom: '1px solid rgba(168,212,220,0.1)', position: 'relative', zIndex: 10 }} className="px-10 py-4 flex items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <img src={logo} alt="LearnOS" className="h-9 w-auto" />
          <span className="font-jakarta font-bold text-xl tracking-wide" style={{ background: 'linear-gradient(90deg, #A8D4DC, #4EC9D4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>LearnOS</span>
          <span className="text-sm" style={{ color: '#8EB69B', paddingLeft: 8, borderLeft: '1px solid rgba(168,212,220,0.15)' }}>
            Welcome back, <span className="font-bold" style={{ background: 'linear-gradient(90deg, #DAF1DE, #A8D4DC)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{user?.name || 'User'}</span> 👋
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            style={{ background: 'linear-gradient(135deg, #0d2820 0%, #0a1a2a 100%)', border: '1px solid rgba(168,212,220,0.2)', color: '#4EC9D4' }}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl hover:border-teal-400 transition-colors text-decoration-none"
          >
            ← Back to Dashboard
          </Link>
          <button
            onClick={logoutUser}
            style={{ background: 'linear-gradient(135deg, #0d2820 0%, #0a1a2a 100%)', border: '1px solid rgba(168,212,220,0.2)', color: '#DAF1DE' }}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl hover:border-teal-400 transition-colors"
          >
            Logout
          </button>
        </div>
      </nav>

      {/* Main Body */}
      <div className="flex-1 p-8 md:p-12 max-w-screen-2xl w-full mx-auto relative flex flex-col gap-10" style={{ zIndex: 1 }}>

        {/* ── Page Header ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-jakarta font-bold text-3xl md:text-4xl" style={{ background: 'linear-gradient(90deg, #DAF1DE 0%, #A8D4DC 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Your Complete Progress Report
              </h1>
              <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-teal-500/20 text-[#4EC9D4] border border-teal-500/30">
                All Time
              </span>
            </div>
            <p className="text-sm text-[#8EB69B] mt-1.5">
              Comprehensive learning analytics across all subjects, study materials, quizzes, and AI interactions
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[#8EB69B]">Generated live from your study data</span>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-24">
            <svg className="animate-spin h-8 w-8 text-[#A8D4DC]" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
          </div>
        ) : reportData && (
          <>
            {/* ── Summary Stat Cards Row (4 cards) ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

              {/* Total Study Time */}
              <div style={{ background: 'linear-gradient(145deg, #0c2020 0%, #091a1f 100%)', border: '1px solid rgba(168,212,220,0.12)', boxShadow: '0 0 40px rgba(168,212,220,0.04)' }} className="rounded-3xl p-7 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <IconBadge bg="linear-gradient(135deg,#0d3d3a,#1a5c5a)" glow="rgba(168,212,220,0.3)" color="#A8D4DC">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  </IconBadge>
                  <span className="text-sm font-semibold" style={{ color: '#A8D4DC' }}>Total Study Time</span>
                </div>
                {(() => {
                  const { hours, mins } = formatStudyTime(reportData.summary.totalStudyTimeMinutes);
                  return (
                    <p className="font-jakarta font-bold text-4xl" style={{ lineHeight: 1, background: 'linear-gradient(90deg, #DAF1DE, #A8D4DC)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                      {hours}h <span className="text-2xl">{mins}m</span>
                    </p>
                  );
                })()}
                <p className="text-xs text-[#4a7a68]">Cumulative time logged across all subjects</p>
              </div>

              {/* Total Quizzes Taken */}
              <div style={{ background: 'linear-gradient(145deg, #0c1e28 0%, #091520 100%)', border: '1px solid rgba(126,200,227,0.12)', boxShadow: '0 0 40px rgba(78,201,212,0.04)' }} className="rounded-3xl p-7 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <IconBadge bg="linear-gradient(135deg,#1a2d4a,#1e4a6e)" glow="rgba(126,200,227,0.3)" color="#7EC8E3">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  </IconBadge>
                  <span className="text-sm font-semibold" style={{ color: '#7EC8E3' }}>Total Quizzes Taken</span>
                </div>
                <p className="font-jakarta font-bold text-4xl" style={{ lineHeight: 1, background: 'linear-gradient(90deg, #DAF1DE, #7EC8E3)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  {reportData.summary.totalQuizzesTaken}
                </p>
                <p className="text-xs text-[#4a7a68]">AI practice quizzes & mock exams</p>
              </div>

              {/* Total Materials Uploaded */}
              <div style={{ background: 'linear-gradient(145deg, #180d28 0%, #0e091f 100%)', border: '1px solid rgba(184,160,232,0.15)', boxShadow: '0 0 40px rgba(184,160,232,0.06)' }} className="rounded-3xl p-7 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <IconBadge bg="linear-gradient(135deg,#2a1a4a,#3d2070)" glow="rgba(149,155,185,0.3)" color="#B8A0E8">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                  </IconBadge>
                  <span className="text-sm font-semibold" style={{ color: '#B8A0E8' }}>Materials Uploaded</span>
                </div>
                <p className="font-jakarta font-bold text-4xl" style={{ lineHeight: 1, background: 'linear-gradient(90deg, #DAF1DE, #B8A0E8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  {reportData.summary.totalMaterialsUploaded}
                </p>
                <p className="text-xs text-[#4a7a68]">Course documents processed & embedded</p>
              </div>

              {/* Total Questions Asked */}
              <div style={{ background: 'linear-gradient(145deg, #0e1e18 0%, #091a15 100%)', border: '1px solid rgba(142,182,155,0.12)', boxShadow: '0 0 40px rgba(142,182,155,0.04)' }} className="rounded-3xl p-7 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <IconBadge bg="linear-gradient(135deg,#0d3d2a,#1a5c3a)" glow="rgba(142,182,155,0.3)" color="#8EB69B">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>
                  </IconBadge>
                  <span className="text-sm font-semibold" style={{ color: '#8EB69B' }}>Questions Asked</span>
                </div>
                <p className="font-jakarta font-bold text-4xl" style={{ lineHeight: 1, background: 'linear-gradient(90deg, #DAF1DE, #8EB69B)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  {reportData.summary.totalQuestionsAsked}
                </p>
                <p className="text-xs text-[#4a7a68]">AI tutor & Feynman mode interactions</p>
              </div>
            </div>

            {/* ── Most Active Subject Highlight Card ── */}
            {reportData.mostActiveSubject && (
              <div
                style={{
                  background: 'linear-gradient(135deg, #0d2838 0%, #142036 50%, #1a1b38 100%)',
                  border: '1px solid rgba(78,201,212,0.3)',
                  boxShadow: '0 0 45px rgba(78,201,212,0.12)',
                }}
                className="rounded-3xl p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden"
              >
                <div className="flex items-center gap-5">
                  <div style={{ width: 64, height: 64, background: 'linear-gradient(135deg, #4EC9D4 0%, #2563eb 100%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', boxShadow: '0 0 25px rgba(78,201,212,0.4)', flexShrink: 0 }}>
                    <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-widest text-[#4EC9D4] block mb-1">🔥 Most Active Subject</span>
                    <h2 className="font-jakarta font-bold text-2xl md:text-3xl text-white">{reportData.mostActiveSubject.name}</h2>
                    <div className="flex items-center gap-4 text-xs text-[#8EB69B] mt-2 flex-wrap">
                      <span>⏱ {Math.floor(reportData.mostActiveSubject.studyTimeMinutes / 60)}h {reportData.mostActiveSubject.studyTimeMinutes % 60}m studied</span>
                      <span>•</span>
                      <span>💬 {reportData.mostActiveSubject.chatCount} AI questions</span>
                      <span>•</span>
                      <span>📝 {reportData.mostActiveSubject.quizCount} quizzes taken</span>
                    </div>
                  </div>
                </div>

                <Link
                  to={`/subjects/${reportData.mostActiveSubject.subjectId}`}
                  className="px-6 py-3 rounded-xl text-sm font-semibold transition-all shrink-0 cursor-pointer"
                  style={{ background: 'linear-gradient(135deg, #A8D4DC, #4EC9D4)', color: '#040D0E', boxShadow: '0 0 20px rgba(168,212,220,0.3)', textDecoration: 'none' }}
                >
                  Go to Subject →
                </Link>
              </div>
            )}

            {/* ── Per-Subject Breakdown Section ── */}
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <h2 className="font-jakarta font-bold text-2xl text-[#DAF1DE]">Per-Subject Breakdown</h2>
                <span className="text-xs text-[#8EB69B]">{reportData.subjects.length} Subjects Tracked</span>
              </div>

              {reportData.subjects.length === 0 ? (
                <div className="text-center py-12 text-sm rounded-3xl border border-dashed border-[#1a3a38] text-[#346659]">
                  No subjects found yet. Create semesters and subjects to see individual analytics here.
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {reportData.subjects.map((subj) => {
                    const { hours, mins } = formatStudyTime(subj.studyTimeMinutes);
                    return (
                      <div
                        key={subj.subjectId}
                        style={{
                          background: 'linear-gradient(145deg, #0c1e20 0%, #09101a 100%)',
                          border: '1px solid rgba(168,212,220,0.12)',
                        }}
                        className="rounded-3xl p-7 flex flex-col gap-6"
                      >
                        {/* Header */}
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-jakarta font-bold text-xl text-[#DAF1DE]">{subj.name}</h3>
                            <span className="text-xs text-[#8EB69B]">Subject Analytics</span>
                          </div>
                          <Link
                            to={`/subjects/${subj.subjectId}`}
                            className="text-xs font-semibold text-[#4EC9D4] hover:underline"
                          >
                            Open →
                          </Link>
                        </div>

                        {/* Metric Row */}
                        <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-[#061012] border border-white/5 text-center">
                          <div>
                            <span className="text-[10px] text-[#8EB69B] uppercase font-bold tracking-wider block">Study Time</span>
                            <span className="font-jakarta font-bold text-lg text-[#DAF1DE]">{hours}h {mins}m</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-[#8EB69B] uppercase font-bold tracking-wider block">Quizzes</span>
                            <span className="font-jakarta font-bold text-lg text-[#7EC8E3]">{subj.quizCount}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-[#8EB69B] uppercase font-bold tracking-wider block">Avg Score</span>
                            <span className="font-jakarta font-bold text-lg text-emerald-400">{subj.averageScore}%</span>
                          </div>
                        </div>

                        {/* Performance Score Trend Visualization */}
                        <ScoreTrendChart trend={subj.scoresTrend} />

                        {/* Weak & Strong Topics */}
                        <div className="flex flex-col gap-3 pt-2 border-t border-white/5">
                          {subj.weakTopics.length > 0 && (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-rose-400 w-24 shrink-0">Weak Topics:</span>
                              {subj.weakTopics.map((wt, i) => (
                                <span key={i} className="text-xs px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/20">
                                  ⚠️ {wt}
                                </span>
                              ))}
                            </div>
                          )}

                          {subj.strongTopics.length > 0 && (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-emerald-400 w-24 shrink-0">Strong Topics:</span>
                              {subj.strongTopics.map((st, i) => (
                                <span key={i} className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                                  ⭐ {st}
                                </span>
                              ))}
                            </div>
                          )}

                          {subj.weakTopics.length === 0 && subj.strongTopics.length === 0 && (
                            <span className="text-xs text-[#346659] italic">
                              Take quizzes for this subject to identify topic strengths & weaknesses.
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ProgressReport;
