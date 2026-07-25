import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
// @ts-ignore
import API from '../../api/axios';
import logo from '../../assets/logo.png';
import toast from 'react-hot-toast';

interface Semester {
  _id: string;
  name: string;
  createdAt?: string;
}

interface WeakSubjectItem {
  subjectId: string;
  name: string;
  weakTopics: string[];
  latestScore: number;
}

interface DashboardStats {
  overallProgress: number;
  totalStudyTimeMinutes: number;
  weakSubjects: WeakSubjectItem[];
  examReadiness: number;
  totalSubjects: number;
  totalQuizzesTaken: number;
}

interface ExamItem {
  _id: string;
  name: string;
  examDate: string;
  subjectId: {
    _id: string;
    name: string;
  } | string;
}

interface ActivityItem {
  id?: string;
  type: 'chat' | 'quiz' | string;
  title: string;
  subjectName: string;
  subjectId: string;
  date: string;
  text?: string;
  score?: number;
}

interface UserGamificationStats {
  xp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  badges: string[];
}

const ALL_BADGES = [
  { id: 'first_quiz', name: '🎯 First Steps', desc: 'Completed your first quiz attempt' },
  { id: 'quiz_master', name: '🏆 Quiz Master', desc: 'Completed 10 quiz attempts' },
  { id: 'week_streak', name: '🔥 Week Warrior', desc: 'Maintained a 7-day study streak' },
  { id: 'knowledge_seeker', name: '🧠 Knowledge Seeker', desc: 'Generated knowledge maps' },
  { id: 'perfect_score', name: '💯 Perfectionist', desc: 'Achieved a 100% quiz score' },
  { id: 'night_owl', name: '🦉 Night Owl', desc: 'Studied after 10 PM' },
];

interface SubjectItem {
  _id: string;
  name: string;
  semesterId: string;
  weakTopics?: string[];
  strongTopics?: string[];
  updatedAt?: string;
}

/* ─── Theme tokens ─────────────────────────────────────────── */
const semesterThemes = [
  { iconBg: 'linear-gradient(135deg,#0d3d3a 0%,#1a5c5a 100%)', glow: 'rgba(168,212,220,0.25)', iconColor: '#A8D4DC', bar: 'linear-gradient(90deg,#A8D4DC,#4EC9D4)' },
  { iconBg: 'linear-gradient(135deg,#1a2d4a 0%,#1e4a6e 100%)', glow: 'rgba(126,200,227,0.25)', iconColor: '#7EC8E3', bar: 'linear-gradient(90deg,#7EC8E3,#4EC9D4)' },
  { iconBg: 'linear-gradient(135deg,#2a1a4a 0%,#3d2070 100%)', glow: 'rgba(149,155,185,0.25)', iconColor: '#B8A0E8', bar: 'linear-gradient(90deg,#959BB9,#B8A0E8)' },
  { iconBg: 'linear-gradient(135deg,#3a1a2a 0%,#5c1a40 100%)', glow: 'rgba(244,114,182,0.2)',  iconColor: '#F472B6', bar: 'linear-gradient(90deg,#F472B6,#c084fc)' },
];

/* ─── Semester icons ─────────────────────────────────────────── */
const SemesterIcons = [
  <svg key="1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M12 14l9-5-9-5-9 5 9 5z"/><path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/></svg>,
  <svg key="2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 10V7"/></svg>,
  <svg key="3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>,
  <svg key="4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>,
];

/* ─── Circular Progress Ring ─────────────────────────────────── */
const CircularProgress = ({
  value, max = 100, size = 100, strokeWidth = 9, gradId = 'teal-grad',
  color1 = '#A8D4DC', color2 = '#4EC9D4', glowColor = 'rgba(168,212,220,0.35)',
}: {
  value: number; max?: number; size?: number; strokeWidth?: number;
  gradId?: string; color1?: string; color2?: string; glowColor?: string;
}) => {
  const r = (size - strokeWidth * 2) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(value / max, 1);
  const center = size / 2;
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', filter: `drop-shadow(0 0 8px ${glowColor})` }} className="absolute">
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color1} />
            <stop offset="100%" stopColor={color2} />
          </linearGradient>
        </defs>
        <circle cx={center} cy={center} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={strokeWidth} />
        <circle cx={center} cy={center} r={r} fill="none" stroke={`url(#${gradId})`} strokeWidth={strokeWidth}
          strokeDasharray={`${circ * pct} ${circ * (1 - pct)}`} strokeLinecap="round" />
      </svg>
      <span className="relative z-10 font-jakarta font-bold" style={{ fontSize: size * 0.34, background: `linear-gradient(135deg,${color1},${color2})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        {value}<span style={{ fontSize: size * 0.14 }}>%</span>
      </span>
    </div>
  );
};

/* ─── Readiness Ring ─────────────────────────────────────────── */
const ReadinessRing = ({ value }: { value: number }) => {
  const size = 108, sw = 10, r = (size - sw * 2) / 2, circ = 2 * Math.PI * r, center = size / 2;
  const pct = Math.min(value / 100, 1);
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size, background: 'transparent' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', filter: 'drop-shadow(0 0 12px rgba(149,155,185,0.55)) drop-shadow(0 0 24px rgba(184,160,232,0.3))', background: 'transparent' }} className="absolute">
        <defs>
          <linearGradient id="purple-grad-ring" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7C85C2" />
            <stop offset="100%" stopColor="#C084FC" />
          </linearGradient>
        </defs>
        <circle cx={center} cy={center} r={r} fill="none" stroke="rgba(149,155,185,0.08)" strokeWidth={sw} />
        <circle cx={center} cy={center} r={r} fill="none" stroke="url(#purple-grad-ring)" strokeWidth={sw}
          strokeDasharray={`${circ * pct} ${circ * (1 - pct)}`} strokeLinecap="round" />
      </svg>
      <div className="relative z-10 text-center" style={{ background: 'transparent' }}>
        <span className="font-jakarta font-bold" style={{ fontSize: 38, lineHeight: 1, background: 'linear-gradient(135deg,#9CA3D4,#C084FC)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{value}</span>
        <span style={{ fontSize: 13, color: '#8EB69B', display: 'block', marginTop: 2 }}>/100</span>
      </div>
    </div>
  );
};

/* ─── Icon Badge ─────────────────────────────────────────────── */
const IconBadge = ({ children, bg, glow, color, size = 52 }: { children: React.ReactNode; bg: string; glow: string; color: string; size?: number }) => (
  <div style={{ width: size, height: size, background: bg, boxShadow: `0 0 18px ${glow}`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
    <div style={{ width: 22, height: 22 }}>{children}</div>
  </div>
);

/* ─── Dashboard ──────────────────────────────────────────────── */
const GENERIC_MOTIVATIONS = [
  'Consistency beats intensity — keep going!',
  'Every expert was once a beginner.',
  'Small steps every day lead to big achievements.',
  'Your future self will thank you for studying today.',
];

const Dashboard: React.FC = () => {
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [newSemester, setNewSemester] = useState('');
  const [loading, setLoading] = useState(true);
  const [addLoading, setAddLoading] = useState(false);
  const [onboardingDismissed, setOnboardingDismissed] = useState<boolean>(
    () => localStorage.getItem('onboarding_dismissed') === 'true'
  );
  const [genericMsgIdx, setGenericMsgIdx] = useState<number>(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setGenericMsgIdx((prev) => (prev + 1) % GENERIC_MOTIVATIONS.length);
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  const handleDismissOnboarding = () => {
    localStorage.setItem('onboarding_dismissed', 'true');
    setOnboardingDismissed(true);
  };

  // Dashboard Stat card stats
  const [stats, setStats] = useState<DashboardStats>({
    overallProgress: 0,
    totalStudyTimeMinutes: 0,
    weakSubjects: [],
    examReadiness: 0,
    totalSubjects: 0,
    totalQuizzesTaken: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // Gamification stats
  const [userStats, setUserStats] = useState<UserGamificationStats | null>(null);
  const [_userStatsLoading, setUserStatsLoading] = useState(true);

  // Exams state
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [examsLoading, setExamsLoading] = useState(true);
  const [showAddExamModal, setShowAddExamModal] = useState(false);
  const [allUserSubjects, setAllUserSubjects] = useState<SubjectItem[]>([]);
  const [examSubjectId, setExamSubjectId] = useState('');
  const [examNameInput, setExamNameInput] = useState('');
  const [examDateInput, setExamDateInput] = useState('');
  const [creatingExam, setCreatingExam] = useState(false);

  // Recent Activity state
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);

  const { user, logoutUser } = useAuth();

  useEffect(() => {
    const fetchSemesters = async () => {
      try {
        const res = await API.get('/semesters');
        setSemesters(res.data);
      } catch (err: any) {
        toast.error('Failed to fetch semesters');
      } finally {
        setLoading(false);
      }
    };
    fetchSemesters();
  }, []);

  // Fetch Dashboard Overview Stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await API.get('/subjects/stats/overview');
        setStats(res.data);
      } catch (err: any) {
        console.error('Failed to fetch dashboard stats', err);
      } finally {
        setStatsLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Fetch Upcoming Exams
  useEffect(() => {
    const fetchExams = async () => {
      try {
        const res = await API.get('/exams');
        setExams(res.data);
      } catch (err: any) {
        console.error('Failed to fetch exams:', err);
      } finally {
        setExamsLoading(false);
      }
    };
    fetchExams();
  }, []);

  // Fetch Recent Activity
  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const res = await API.get('/subjects/activity/recent');
        setActivities(res.data);
      } catch (err: any) {
        console.error('Failed to fetch recent activity:', err);
      } finally {
        setActivitiesLoading(false);
      }
    };
    fetchActivity();
  }, []);

  // Fetch All User Subjects & Gamification Stats
  useEffect(() => {
    const fetchUserSubjects = async () => {
      try {
        const res = await API.get('/subjects/user/all');
        setAllUserSubjects(res.data);
      } catch (err: any) {
        console.error('Failed to fetch user subjects:', err);
      }
    };

    const fetchGamificationStats = async () => {
      try {
        const res = await API.get('/stats');
        setUserStats(res.data);
      } catch (err: any) {
        console.error('Failed to fetch gamification stats:', err);
      } finally {
        setUserStatsLoading(false);
      }
    };

    fetchUserSubjects();
    fetchGamificationStats();
  }, []);

  const handleAddSemester = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSemester.trim()) return;
    setAddLoading(true);
    try {
      const res = await API.post('/semesters', { name: newSemester.trim() });
      setSemesters((prev) => [...prev, res.data]);
      setNewSemester('');
      toast.success('Semester created successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to add semester');
    } finally {
      setAddLoading(false);
    }
  };

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examSubjectId || !examNameInput.trim() || !examDateInput) return;
    setCreatingExam(true);
    try {
      const res = await API.post('/exams', {
        subjectId: examSubjectId,
        name: examNameInput.trim(),
        examDate: examDateInput,
      });
      setExams((prev) => [...prev, res.data].sort((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime()));
      setShowAddExamModal(false);
      setExamNameInput('');
      setExamDateInput('');
      setExamSubjectId('');
      toast.success('Exam added successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create exam');
    } finally {
      setCreatingExam(false);
    }
  };

  // Helper to format minutes to hours and minutes
  const formatStudyTime = (minutes: number) => {
    if (!minutes || minutes <= 0) return { hours: 0, mins: 0 };
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return { hours, mins };
  };

  const calculateDaysUntil = (dateStr: string) => {
    const examDate = new Date(dateStr);
    examDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime = examDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 0) return 'Passed';
    return `In ${diffDays} days`;
  };

  const formatExamDateNice = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const month = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
      const day = d.getDate().toString().padStart(2, '0');
      return { month, day };
    } catch {
      return { month: 'EXAM', day: '01' };
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    const now = new Date();
    const past = new Date(dateStr);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 30) return `${diffDays}d ago`;
    return past.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const semesterCompletion = [72, 68, 55, 20];
  const semesterSubjects = [6, 5, 6, 4];

  return (
    <div className="min-h-screen font-inter flex flex-col relative overflow-x-hidden" style={{ backgroundColor: '#060E10', color: '#DAF1DE' }}>

      {/* ── Ambient Background Glows ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-15%', left: '-10%', width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,212,220,0.07) 0%, transparent 65%)', filter: 'blur(80px)' }} />
        <div style={{ position: 'absolute', top: '25%', right: '-10%', width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle, rgba(149,155,185,0.07) 0%, transparent 65%)', filter: 'blur(80px)' }} />
        <div style={{ position: 'absolute', bottom: '5%', left: '30%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(78,201,212,0.05) 0%, transparent 65%)', filter: 'blur(70px)' }} />
      </div>

      {/* ── Navbar ── */}
      <nav style={{ background: 'linear-gradient(90deg, #0A1F20 0%, #0D2420 50%, #0A1A2A 100%)', borderBottom: '1px solid rgba(168,212,220,0.1)', position: 'relative', zIndex: 10 }} className="px-10 py-4 flex items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <img src={logo} alt="LearnOS" className="h-9 w-auto" />
          <span className="font-jakarta font-bold text-xl tracking-wide" style={{ background: 'linear-gradient(90deg, #A8D4DC, #4EC9D4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>LearnOS</span>
          <span className="text-sm" style={{ color: '#8EB69B', paddingLeft: 8, borderLeft: '1px solid rgba(168,212,220,0.15)' }}>
            Welcome back, <span className="font-bold" style={{ background: 'linear-gradient(90deg, #DAF1DE, #A8D4DC)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{user?.name || 'User'}</span> 👋
          </span>
        </div>
        <button
          onClick={logoutUser}
          style={{ background: 'linear-gradient(135deg, #0d2820 0%, #0a1a2a 100%)', border: '1px solid rgba(168,212,220,0.2)', color: '#DAF1DE' }}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl hover:border-teal-400 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          Logout
        </button>
      </nav>

      {/* ── Body ── */}
      <div className="flex flex-1 p-10 gap-6 max-w-screen-2xl w-full mx-auto relative" style={{ zIndex: 1 }}>

        {/* ═══════════════ LEFT — My Semesters ═══════════════ */}
        <div className="w-[440px] shrink-0 flex flex-col gap-6">
          <h1 className="font-jakarta font-bold" style={{ fontSize: 32, background: 'linear-gradient(90deg, #DAF1DE 0%, #A8D4DC 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>My Semesters</h1>

          {/* Add semester form */}
          <form onSubmit={handleAddSemester} className="flex gap-3">
            <input
              type="text"
              placeholder="Add new semester (e.g., Semester 3)"
              value={newSemester}
              onChange={(e) => setNewSemester(e.target.value)}
              style={{ backgroundColor: '#0A1A1B', border: '1px solid rgba(168,212,220,0.15)', color: '#DAF1DE' }}
              className="flex-1 px-4 py-3 rounded-xl text-sm placeholder-[#235347] focus:outline-none focus:border-teal-400 transition-colors"
            />
            <button
              type="submit"
              disabled={addLoading}
              className="px-5 py-3 rounded-xl text-sm font-semibold font-jakarta transition-all flex items-center gap-1.5 disabled:opacity-50 whitespace-nowrap hover:shadow-lg cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #A8D4DC 0%, #4EC9D4 100%)', color: '#040D0E', boxShadow: '0 0 20px rgba(168,212,220,0.25)' }}
            >
              {addLoading ? (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
              ) : (<>+ Add Semester</>)}
            </button>
          </form>

          {/* Semester grid */}
          {loading ? (
            <div className="flex justify-center py-12">
              <svg className="animate-spin h-6 w-6" style={{ color: '#A8D4DC' }} fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
            </div>
          ) : semesters.length === 0 ? (
            <div className="text-center py-12 text-sm rounded-2xl" style={{ color: '#235347', border: '1px dashed rgba(168,212,220,0.15)' }}>
              No semesters yet. Add one above.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-6">
              {semesters.map((semester, idx) => {
                const theme = semesterThemes[idx % semesterThemes.length];
                const completion = semesterCompletion[idx] ?? 0;
                return (
                  <Link
                    to={`/semesters/${semester._id}`}
                    key={semester._id}
                    style={{ background: 'linear-gradient(145deg, #0c1e1f 0%, #0a1720 100%)', border: '1px solid rgba(168,212,220,0.12)', transition: 'all 0.25s ease', textDecoration: 'none' }}
                    className="rounded-3xl p-7 flex flex-col gap-5 cursor-pointer group block"
                    onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.border = '1px solid rgba(168,212,220,0.35)'; (e.currentTarget as HTMLAnchorElement).style.boxShadow = `0 0 28px ${theme.glow}`; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.border = '1px solid rgba(168,212,220,0.12)'; (e.currentTarget as HTMLAnchorElement).style.boxShadow = 'none'; }}
                  >
                    {/* Top row: icon + menu */}
                    <div className="flex items-start justify-between">
                      <div style={{ width: 52, height: 52, background: theme.iconBg, boxShadow: `0 0 20px ${theme.glow}`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.iconColor }}>
                        <div style={{ width: 22, height: 22 }}>{SemesterIcons[idx % SemesterIcons.length]}</div>
                      </div>
                      <button style={{ color: '#235347' }} className="hover:text-white transition-colors p-1">
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z"/></svg>
                      </button>
                    </div>

                    {/* Info */}
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: theme.iconColor }}>Semester {idx + 1}</span>
                      <h3 className="font-jakarta font-bold text-base leading-snug" style={{ color: '#DAF1DE' }}>{semester.name}</h3>
                      <p className="text-xs" style={{ color: '#8EB69B' }}>{semesterSubjects[idx] ?? 0} Subjects · {completion}% Complete</p>
                    </div>

                    {/* Mini progress bar */}
                    <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-1.5 rounded-full" style={{ width: `${completion}%`, background: theme.bar }} />
                    </div>

                    {/* Footer */}
                    <div className="pt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <span className="text-xs font-medium" style={{ background: 'linear-gradient(90deg, #A8D4DC, #4EC9D4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        View subjects →
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* ═══════════════ RIGHT — Dashboard ═══════════════ */}
        <div className="flex-1 flex flex-col gap-6 min-w-0">

          {/* Header with View Full Report Link */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-jakarta font-bold text-2xl text-[#DAF1DE]">Dashboard Overview</h2>
              <p className="text-xs text-[#8EB69B]">Key performance metrics across all semesters & subjects</p>
            </div>
            <Link
              to="/reports"
              className="px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer hover:border-teal-400"
              style={{ background: 'linear-gradient(135deg, #0d2820 0%, #0a1a2a 100%)', border: '1px solid rgba(168,212,220,0.22)', color: '#4EC9D4', textDecoration: 'none' }}
            >
              <span>📊</span>
              <span>View Full Report →</span>
            </Link>
          </div>

          {/* ── Motivational Message Banner ── */}
          {(() => {
            let text = GENERIC_MOTIVATIONS[genericMsgIdx];
            let isGold = false;

            if (userStats && userStats.currentStreak > 0) {
              text = `🔥 Keep your ${userStats.currentStreak}-day streak alive!`;
              isGold = true;
            } else if (stats.weakSubjects && stats.weakSubjects.length > 0) {
              text = `Your ${stats.weakSubjects[0].name} needs attention — a quick quiz could help`;
              isGold = false;
            } else {
              const hasActivityToday = activities.some((a) => {
                if (!a.date) return false;
                const actDate = new Date(a.date);
                const today = new Date();
                return (
                  actDate.getFullYear() === today.getFullYear() &&
                  actDate.getMonth() === today.getMonth() &&
                  actDate.getDate() === today.getDate()
                );
              });
              if (!hasActivityToday) {
                text = "You haven't studied today — even 10 minutes helps!";
                isGold = true;
              }
            }

            return (
              <div
                className="flex items-center gap-3 px-4 py-2.5 rounded-2xl border transition-all duration-300"
                style={{
                  background: isGold
                    ? 'linear-gradient(90deg, rgba(245,158,11,0.12) 0%, rgba(217,119,6,0.06) 100%)'
                    : 'linear-gradient(90deg, rgba(78,201,212,0.12) 0%, rgba(14,116,144,0.06) 100%)',
                  borderColor: isGold ? 'rgba(245,158,11,0.35)' : 'rgba(78,201,212,0.35)',
                  boxShadow: isGold ? '0 0 15px rgba(245,158,11,0.08)' : '0 0 15px rgba(78,201,212,0.08)',
                }}
              >
                <span className="text-[#DAF1DE] font-semibold text-xs flex items-center gap-2">
                  <span className="text-sm">{isGold ? '✨' : '💡'}</span>
                  <span style={{ color: isGold ? '#FBBF24' : '#4EC9D4' }}>{text}</span>
                </span>
              </div>
            );
          })()}

          {/* ── Onboarding Welcome Banner ── */}
          {!loading && !onboardingDismissed && semesters.length === 0 && (userStats === null || userStats.xp === 0) && (
            <div
              className="relative p-[1px] rounded-3xl transition-all duration-300"
              style={{
                background: 'linear-gradient(135deg, #4EC9D4 0%, #B8A0E8 50%, #F59E0B 100%)',
                boxShadow: '0 0 30px rgba(78,201,212,0.15)',
              }}
            >
              <div
                className="rounded-[23px] p-6 md:p-7 flex flex-col gap-5 relative overflow-hidden"
                style={{ background: 'linear-gradient(145deg, #091a1e 0%, #0c1424 100%)' }}
              >
                {/* Header Row */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl shrink-0" style={{ background: 'linear-gradient(135deg, rgba(78,201,212,0.2), rgba(184,160,232,0.2))', border: '1px solid rgba(168,212,220,0.3)' }}>
                      🚀
                    </div>
                    <div>
                      <h3 className="font-jakarta font-bold text-lg text-[#DAF1DE]">Welcome to LearnOS!</h3>
                      <p className="text-xs text-[#8EB69B]">Get started with your AI-powered study workspace in 3 steps:</p>
                    </div>
                  </div>
                  <button
                    onClick={handleDismissOnboarding}
                    title="Dismiss welcome banner"
                    className="p-1.5 rounded-xl text-[#8EB69B] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* 3 Steps */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                  <div className="flex items-start gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-teal-400/40 transition-colors">
                    <span className="w-7 h-7 rounded-xl flex items-center justify-center font-jakarta font-bold text-xs shrink-0" style={{ background: 'linear-gradient(135deg, #4EC9D4, #2563eb)', color: '#040D0E' }}>
                      1
                    </span>
                    <div className="flex flex-col">
                      <span className="font-semibold text-xs text-[#DAF1DE]">1. Create a semester and add a subject</span>
                      <span className="text-[11px] text-[#8EB69B] mt-0.5">Organize your courses & modules.</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-teal-400/40 transition-colors">
                    <span className="w-7 h-7 rounded-xl flex items-center justify-center font-jakarta font-bold text-xs shrink-0" style={{ background: 'linear-gradient(135deg, #B8A0E8, #7C85C2)', color: '#040D0E' }}>
                      2
                    </span>
                    <div className="flex flex-col">
                      <span className="font-semibold text-xs text-[#DAF1DE]">2. Upload your study materials (PDF/DOCX)</span>
                      <span className="text-[11px] text-[#8EB69B] mt-0.5">Parse & index notes automatically.</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-teal-400/40 transition-colors">
                    <span className="w-7 h-7 rounded-xl flex items-center justify-center font-jakarta font-bold text-xs shrink-0" style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#040D0E' }}>
                      3
                    </span>
                    <div className="flex flex-col">
                      <span className="font-semibold text-xs text-[#DAF1DE]">3. Start chatting, quizzing, and tracking progress</span>
                      <span className="text-[11px] text-[#8EB69B] mt-0.5">Master topics with instant AI feedback.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Gamification Banner & Badges Card ── */}
          <div
            style={{
              background: 'linear-gradient(135deg, #0c2024 0%, #0d1a2d 50%, #151028 100%)',
              border: '1px solid rgba(78,201,212,0.25)',
              boxShadow: '0 0 35px rgba(78,201,212,0.06)',
            }}
            className="rounded-3xl p-6 md:p-7 flex flex-col lg:flex-row items-stretch justify-between gap-6"
          >
            {/* Left: Level & XP Progress & Streak */}
            <div className="flex-1 flex flex-col justify-between gap-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                {/* Level Badge */}
                <div className="flex items-center gap-4">
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      background: 'linear-gradient(135deg, #4EC9D4 0%, #2563eb 100%)',
                      borderRadius: '50%',
                      boxShadow: '0 0 20px rgba(78,201,212,0.4)',
                    }}
                    className="flex flex-col items-center justify-center text-white shrink-0 font-jakarta font-extrabold"
                  >
                    <span className="text-[9px] uppercase tracking-widest opacity-80 leading-none">LVL</span>
                    <span className="text-xl leading-none">{userStats ? userStats.level : 1}</span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-jakarta font-bold text-lg text-[#DAF1DE]">Level {userStats ? userStats.level : 1} Scholar</h3>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-500/20 text-[#4EC9D4] font-bold border border-teal-500/30">
                        {userStats ? userStats.xp : 0} XP
                      </span>
                    </div>
                    <p className="text-xs text-[#8EB69B]">Keep studying and taking quizzes to earn XP & level up!</p>
                  </div>
                </div>

                {/* Streak Badge */}
                <div className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 shrink-0">
                  <span className="text-2xl animate-pulse">🔥</span>
                  <div>
                    {userStats && userStats.currentStreak > 0 ? (
                      <span className="font-jakarta font-bold text-sm text-amber-300 block">
                        {userStats.currentStreak} Day Streak!
                      </span>
                    ) : (
                      <span className="text-xs text-amber-300/70 font-medium block">
                        Start your streak today!
                      </span>
                    )}
                    <span className="text-[10px] text-amber-400/60 block">
                      Best: {userStats ? userStats.longestStreak : 0} days
                    </span>
                  </div>
                </div>
              </div>

              {/* XP Progress Bar */}
              <div className="flex flex-col gap-1.5 mt-1">
                <div className="flex items-center justify-between text-xs text-[#8EB69B]">
                  <span>Progress to Level {(userStats?.level || 1) + 1}</span>
                  <span className="font-semibold text-[#4EC9D4]">
                    {(userStats?.xp || 0) % 100} / 100 XP
                  </span>
                </div>
                <div className="w-full h-3 rounded-full bg-[#061012] border border-white/5 overflow-hidden p-0.5">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(userStats?.xp || 0) % 100}%`,
                      background: 'linear-gradient(90deg, #A8D4DC 0%, #4EC9D4 50%, #2563eb 100%)',
                      boxShadow: '0 0 10px rgba(78,201,212,0.5)',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Right Divider & Badges Grid */}
            <div className="lg:border-l lg:border-white/10 lg:pl-6 flex flex-col gap-3 justify-center">
              <span className="text-xs font-bold uppercase tracking-wider text-[#8EB69B]">
                Badges Unlocked ({userStats?.badges?.length || 0} / {ALL_BADGES.length})
              </span>

              <div className="grid grid-cols-3 gap-2.5">
                {ALL_BADGES.map((b) => {
                  const isUnlocked = userStats?.badges?.includes(b.id);
                  return (
                    <div
                      key={b.id}
                      title={`${b.name}: ${b.desc}${isUnlocked ? ' (Unlocked)' : ' (Locked)'}`}
                      className={`px-3 py-2 rounded-xl flex items-center gap-2 text-xs font-semibold transition-all cursor-pointer border ${
                        isUnlocked
                          ? 'bg-teal-500/15 border-teal-500/40 text-teal-200 shadow-[0_0_12px_rgba(78,201,212,0.2)]'
                          : 'bg-white/5 border-white/5 text-white/30 grayscale opacity-60'
                      }`}
                    >
                      <span className="text-base shrink-0">{b.name.split(' ')[0]}</span>
                      <span className="truncate text-[11px]">{b.name.split(' ').slice(1).join(' ')}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Row 1: 4 stat cards ── */}
          <div className="grid grid-cols-4 gap-6">

            {/* Overall Progress */}
            <div style={{ background: 'linear-gradient(145deg, #0c2020 0%, #091a1f 100%)', border: '1px solid rgba(168,212,220,0.12)', boxShadow: '0 0 40px rgba(168,212,220,0.04)' }} className="rounded-3xl p-8 flex flex-col items-center gap-5">
              <div className="flex items-center gap-3 self-start">
                <IconBadge bg="linear-gradient(135deg,#0d3d3a,#1a5c5a)" glow="rgba(168,212,220,0.3)" color="#A8D4DC">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                </IconBadge>
                <span className="text-sm font-semibold" style={{ color: '#A8D4DC' }}>Overall Progress</span>
              </div>
              <CircularProgress value={statsLoading ? 0 : stats.overallProgress} size={100} strokeWidth={9} gradId="teal-g1" color1="#A8D4DC" color2="#4EC9D4" glowColor="rgba(168,212,220,0.4)" />
              <p className="text-xs text-center" style={{ color: '#4a7a68' }}>Across all subjects</p>
            </div>

            {/* Total Study Time */}
            <div style={{ background: 'linear-gradient(145deg, #0c1e28 0%, #091520 100%)', border: '1px solid rgba(126,200,227,0.12)', boxShadow: '0 0 40px rgba(78,201,212,0.04)' }} className="rounded-3xl p-8 flex flex-col gap-5">
              <div className="flex items-center gap-3">
                <IconBadge bg="linear-gradient(135deg,#1a2d4a,#1e4a6e)" glow="rgba(126,200,227,0.3)" color="#7EC8E3">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                </IconBadge>
                <span className="text-sm font-semibold" style={{ color: '#7EC8E3' }}>Total Study Time</span>
              </div>
              {(() => {
                const { hours, mins } = formatStudyTime(stats.totalStudyTimeMinutes);
                return (
                  <p className="font-jakarta font-bold" style={{ fontSize: 42, lineHeight: 1, background: 'linear-gradient(90deg, #DAF1DE, #A8D4DC)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    {hours}h <span style={{ fontSize: 28 }}>{mins}m</span>
                  </p>
                );
              })()}
              <p className="text-xs" style={{ color: '#4a7a68' }}>Across all semesters</p>
            </div>

            {/* Upcoming Exams Stat Card */}
            <div style={{ background: 'linear-gradient(145deg, #0e1e18 0%, #091a15 100%)', border: '1px solid rgba(142,182,155,0.12)', boxShadow: '0 0 40px rgba(142,182,155,0.04)' }} className="rounded-3xl p-8 flex flex-col gap-5">
              <div className="flex items-center gap-3">
                <IconBadge bg="linear-gradient(135deg,#0d3d2a,#1a5c3a)" glow="rgba(142,182,155,0.3)" color="#8EB69B">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                </IconBadge>
                <span className="text-sm font-semibold" style={{ color: '#8EB69B' }}>Upcoming Exams</span>
              </div>
              <p className="font-jakarta font-bold" style={{ fontSize: 52, lineHeight: 1, background: 'linear-gradient(135deg, #DAF1DE, #8EB69B)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {examsLoading ? '...' : exams.length}
              </p>
              <p className="text-xs" style={{ color: '#4a7a68' }}>
                {exams.length === 1 ? '1 upcoming exam scheduled' : `${exams.length} upcoming exams scheduled`}
              </p>
            </div>

            {/* Exam Readiness */}
            <div style={{ background: 'linear-gradient(145deg, #14101e 0%, #0e0c1a 100%)', border: '1px solid rgba(149,155,185,0.15)', boxShadow: '0 0 40px rgba(149,155,185,0.08)' }} className="rounded-3xl p-8 flex flex-col items-center gap-5">
              <div className="flex items-center gap-3 self-start">
                <IconBadge bg="linear-gradient(135deg,#2a1a4a,#3d2070)" glow="rgba(149,155,185,0.3)" color="#B8A0E8">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                </IconBadge>
                <span className="text-sm font-semibold" style={{ color: '#B8A0E8' }}>Exam Readiness</span>
              </div>
              <ReadinessRing value={statsLoading ? 0 : stats.examReadiness} />
              <p className="text-xs text-center" style={{ color: '#4a7a68' }}>
                {stats.examReadiness >= 80 ? "You're on track!" : stats.examReadiness >= 50 ? 'Steady progress' : 'Take more quizzes'}
              </p>
            </div>
          </div>

          {/* ── Row 2: Weak Subjects + Upcoming Exams ── */}
          <div className="grid grid-cols-2 gap-6">

            {/* Weak Subjects */}
            <div style={{ background: 'linear-gradient(145deg, #0c1e20 0%, #090f1a 100%)', border: '1px solid rgba(168,212,220,0.12)' }} className="rounded-3xl p-8 flex flex-col gap-7">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <IconBadge bg="linear-gradient(135deg,#1a2d4a,#1e4a6e)" glow="rgba(78,201,212,0.25)" color="#7EC8E3" size={42}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"/></svg>
                  </IconBadge>
                  <span className="font-jakarta font-bold text-base" style={{ color: '#DAF1DE' }}>Weak Subjects</span>
                </div>
                <span className="text-sm font-medium cursor-pointer hover:underline" style={{ color: '#4EC9D4' }}>View all</span>
              </div>

              <div className="flex flex-col gap-6">
                {statsLoading ? (
                  <div className="flex justify-center py-6">
                    <svg className="animate-spin h-5 w-5 text-[#A8D4DC]" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                  </div>
                ) : stats.weakSubjects.length === 0 ? (
                  <div className="text-center py-6 px-4 text-xs rounded-2xl border border-dashed border-[#1a3a38] text-[#346659]">
                    No weak subjects yet — take some quizzes to see your progress here.
                  </div>
                ) : (
                  stats.weakSubjects.map((s) => (
                    <div key={s.subjectId} className="flex flex-col gap-2">
                      <div className="flex justify-between text-sm">
                        <span style={{ color: '#DAF1DE', fontWeight: 500 }}>{s.name}</span>
                        <span style={{ color: '#8EB69B' }}>{s.latestScore}%</span>
                      </div>
                      <div className="h-2.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                        <div
                          className="h-2.5 rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(s.latestScore, 100)}%`,
                            background: 'linear-gradient(to right, #959BB9, #B8A0E8)',
                            boxShadow: '0 0 8px rgba(149,155,185,0.4)',
                          }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Upcoming Exams List Section */}
            <div style={{ background: 'linear-gradient(145deg, #0e1e18 0%, #091a15 100%)', border: '1px solid rgba(142,182,155,0.12)' }} className="rounded-3xl p-8 flex flex-col gap-7">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <IconBadge bg="linear-gradient(135deg,#0d3d2a,#1a5c3a)" glow="rgba(142,182,155,0.25)" color="#8EB69B" size={42}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                  </IconBadge>
                  <span className="font-jakarta font-bold text-base" style={{ color: '#DAF1DE' }}>Upcoming Exams</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddExamModal(true)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer hover:border-teal-400"
                  style={{ background: 'linear-gradient(135deg, #0d2820 0%, #0a1a2a 100%)', border: '1px solid rgba(168,212,220,0.2)', color: '#4EC9D4' }}
                >
                  + Add Exam
                </button>
              </div>

              <div className="flex flex-col gap-5">
                {examsLoading ? (
                  <div className="flex justify-center py-6">
                    <svg className="animate-spin h-5 w-5 text-[#A8D4DC]" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                  </div>
                ) : exams.length === 0 ? (
                  <div className="text-center py-6 px-4 text-xs rounded-2xl border border-dashed border-[#1a3a38] text-[#346659]">
                    No exams scheduled yet.
                  </div>
                ) : (
                  exams.map((exam) => {
                    const { month, day } = formatExamDateNice(exam.examDate);
                    const subjName = typeof exam.subjectId === 'object' ? exam.subjectId.name : 'Subject';
                    const daysLeftText = calculateDaysUntil(exam.examDate);

                    return (
                      <div key={exam._id} className="flex items-center gap-4">
                        {/* Date badge */}
                        <div className="flex flex-col items-center justify-center rounded-xl text-center shrink-0" style={{ width: 52, height: 52, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(168,212,220,0.15)' }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#4EC9D4', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{month}</span>
                          <span className="font-jakarta font-bold" style={{ fontSize: 18, color: '#DAF1DE', lineHeight: 1.1 }}>{day}</span>
                        </div>
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate" style={{ color: '#DAF1DE' }}>{exam.name}</p>
                          <p className="text-xs truncate mt-0.5" style={{ color: '#4a7a68' }}>{subjName}</p>
                        </div>
                        {/* Days pill */}
                        <span className="shrink-0 text-xs font-semibold rounded-full px-3 py-1" style={{ background: 'rgba(149,155,185,0.15)', color: '#B8A0E8', border: '1px solid rgba(149,155,185,0.2)' }}>
                          {daysLeftText}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* ── Row 3: Recent Activity + Quick Access ── */}
          <div className="grid grid-cols-2 gap-6">

            {/* Recent Activity */}
            <div style={{ background: 'linear-gradient(145deg, #0c1e20 0%, #090f18 100%)', border: '1px solid rgba(168,212,220,0.12)' }} className="rounded-3xl p-8 flex flex-col gap-7">
              <div className="flex items-center gap-3">
                <IconBadge bg="linear-gradient(135deg,#0d3d3a,#1a5c5a)" glow="rgba(168,212,220,0.25)" color="#A8D4DC" size={42}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                </IconBadge>
                <span className="font-jakarta font-bold text-base" style={{ color: '#DAF1DE' }}>Recent Activity</span>
              </div>
              <div className="flex flex-col gap-5">
                {activitiesLoading ? (
                  <div className="flex justify-center py-6">
                    <svg className="animate-spin h-5 w-5 text-[#A8D4DC]" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                  </div>
                ) : activities.length === 0 ? (
                  <div className="text-center py-6 px-4 text-xs rounded-2xl border border-dashed border-[#1a3a38] text-[#346659]">
                    No activity yet — start studying to see it here.
                  </div>
                ) : (
                  activities.map((a) => {
                    const isChat = a.type === 'chat';
                    const labelText = isChat ? `Asked about ${a.subjectName}` : `Completed Quiz - ${a.subjectName}`;
                    const subText = isChat ? a.text : `Score: ${a.score}%`;
                    const iconBg = isChat ? 'linear-gradient(135deg,#0d3d3a,#1a5c5a)' : 'linear-gradient(135deg,#1a2d4a,#1e4a6e)';
                    const iconColor = isChat ? '#A8D4DC' : '#7EC8E3';

                    return (
                      <div key={a.id} className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: iconBg, color: iconColor }}>
                          <div style={{ width: 18, height: 18 }}>
                            {isChat ? (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>
                            ) : (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                            )}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{labelText}</p>
                          <p className="text-xs truncate mt-0.5" style={{ color: '#4a7a68' }}>{subText}</p>
                        </div>
                        <span className="text-xs shrink-0" style={{ color: '#4a7a68' }}>{formatRelativeTime(a.date)}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Quick Access */}
            {(() => {
              const lastStudiedSubject = (() => {
                if (activities.length > 0) {
                  const recentSubj = allUserSubjects.find((s) => s._id === activities[0].subjectId);
                  if (recentSubj) return recentSubj;
                }
                return allUserSubjects[0] || null;
              })();

              return (
                <div style={{ background: 'linear-gradient(145deg, #0c1828 0%, #091018 100%)', border: '1px solid rgba(168,212,220,0.12)' }} className="rounded-3xl p-8 flex flex-col gap-6">
                  <div className="flex items-center gap-3">
                    <IconBadge bg="linear-gradient(135deg,#1a2d4a,#1e4a6e)" glow="rgba(126,200,227,0.25)" color="#7EC8E3" size={42}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                    </IconBadge>
                    <span className="font-jakarta font-bold text-base" style={{ color: '#DAF1DE' }}>Quick Access</span>
                  </div>

                  {/* Last studied card */}
                  {lastStudiedSubject ? (
                    <div className="relative rounded-2xl overflow-hidden p-6 flex-1" style={{ background: 'linear-gradient(135deg, #0d2535 0%, #162840 50%, #1a2040 100%)', border: '1px solid rgba(168,212,220,0.22)', boxShadow: '0 0 36px rgba(168,212,220,0.1), 0 0 60px rgba(149,155,185,0.06)' }}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex flex-col gap-4">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: '#4EC9D4', letterSpacing: '0.12em' }}>Last Studied</p>
                            <p className="font-jakarta font-bold text-2xl text-white leading-snug">{lastStudiedSubject.name}</p>
                            <p className="text-sm mt-1.5" style={{ color: '#8EB69B' }}>
                              {lastStudiedSubject.weakTopics && lastStudiedSubject.weakTopics.length > 0
                                ? `Focus: ${lastStudiedSubject.weakTopics[0]}`
                                : 'Continue your study session'}
                            </p>
                          </div>
                          <Link
                            to={`/subjects/${lastStudiedSubject._id}`}
                            className="self-start px-6 py-2.5 text-sm font-semibold rounded-xl transition-all"
                            style={{ background: 'linear-gradient(135deg, #A8D4DC, #4EC9D4)', color: '#040D0E', boxShadow: '0 0 20px rgba(168,212,220,0.35)', textDecoration: 'none' }}
                          >
                            Continue →
                          </Link>
                        </div>
                        {/* Glowing Graphic */}
                        <div className="relative shrink-0 flex items-center justify-center" style={{ width: 110, height: 110 }}>
                          <div style={{ position: 'absolute', inset: -10, borderRadius: '50%', background: 'radial-gradient(circle, rgba(78,201,212,0.25) 0%, rgba(149,155,185,0.15) 50%, transparent 75%)', filter: 'blur(12px)' }} />
                          <img src={logo} alt="Subject" style={{ width: 100, height: 100, objectFit: 'contain', filter: 'drop-shadow(0 0 18px rgba(78,201,212,0.6)) drop-shadow(0 0 36px rgba(149,155,185,0.4))', position: 'relative', zIndex: 1 }} />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl p-6 text-center text-xs flex flex-col items-center justify-center gap-2 border border-dashed border-[#1a3a38] flex-1" style={{ backgroundColor: 'rgba(6, 14, 16, 0.6)', color: '#8EB69B' }}>
                      <span className="text-sm font-medium text-[#DAF1DE]">Start studying to see your progress here</span>
                      <span>Create a semester and add subjects to begin.</span>
                    </div>
                  )}

                  {/* View Learning Patterns → /brain */}
                  <Link
                    to="/brain"
                    className="flex items-center justify-between px-5 py-3.5 rounded-2xl text-sm font-medium transition-all group"
                    style={{ background: 'linear-gradient(135deg, #170d2a 0%, #12101e 100%)', border: '1px solid rgba(184,160,232,0.2)', color: '#DAF1DE', textDecoration: 'none' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(184,160,232,0.45)'; (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 0 20px rgba(184,160,232,0.15)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(184,160,232,0.2)'; (e.currentTarget as HTMLAnchorElement).style.boxShadow = 'none'; }}
                  >
                    <div className="flex items-center gap-2">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: '#B8A0E8' }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
                      <span style={{ background: 'linear-gradient(90deg, #DAF1DE, #B8A0E8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>View Learning Patterns</span>
                    </div>
                    <svg className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: '#B8A0E8' }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                  </Link>
                </div>
              );
            })()}
          </div>

        </div>
      </div>

      {/* ── Add Exam Modal ── */}
      {showAddExamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div
            className="w-full max-w-md p-6 rounded-3xl flex flex-col gap-5 relative animate-in fade-in zoom-in duration-200"
            style={{
              background: 'linear-gradient(145deg, #0c1f20 0%, #0a1720 100%)',
              border: '1px solid rgba(168,212,220,0.2)',
              boxShadow: '0 0 40px rgba(0,0,0,0.8)',
            }}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-jakarta font-bold text-lg text-[#DAF1DE]">Schedule Upcoming Exam</h3>
              <button
                type="button"
                onClick={() => setShowAddExamModal(false)}
                className="text-xs text-[#8EB69B] hover:text-white transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateExam} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="exam-subject-select" className="text-xs font-semibold text-[#8EB69B]">Select Subject</label>
                <select
                  id="exam-subject-select"
                  required
                  value={examSubjectId}
                  onChange={(e) => setExamSubjectId(e.target.value)}
                  style={{ backgroundColor: '#0A1A1B', border: '1px solid rgba(168,212,220,0.2)', color: '#DAF1DE' }}
                  className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-teal-400 cursor-pointer"
                >
                  <option value="">-- Choose a Subject --</option>
                  {allUserSubjects.map((s) => (
                    <option key={s._id} value={s._id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="exam-name-input" className="text-xs font-semibold text-[#8EB69B]">Exam Title / Name</label>
                <input
                  id="exam-name-input"
                  type="text"
                  required
                  placeholder="e.g. Midterm Exam"
                  value={examNameInput}
                  onChange={(e) => setExamNameInput(e.target.value)}
                  style={{ backgroundColor: '#0A1A1B', border: '1px solid rgba(168,212,220,0.2)', color: '#DAF1DE' }}
                  className="w-full px-4 py-3 rounded-xl text-sm placeholder-[#235347] focus:outline-none focus:border-teal-400"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="exam-date-input" className="text-xs font-semibold text-[#8EB69B]">Exam Date</label>
                <input
                  id="exam-date-input"
                  type="date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  value={examDateInput}
                  onChange={(e) => setExamDateInput(e.target.value)}
                  style={{ backgroundColor: '#0A1A1B', border: '1px solid rgba(168,212,220,0.2)', color: '#DAF1DE' }}
                  className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-teal-400 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAddExamModal(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-[#8EB69B] hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingExam || !examSubjectId || !examNameInput.trim() || !examDateInput}
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer hover:shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #A8D4DC 0%, #4EC9D4 100%)', color: '#040D0E', boxShadow: '0 0 15px rgba(168,212,220,0.25)' }}
                >
                  {creatingExam ? 'Saving...' : 'Save Exam'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
