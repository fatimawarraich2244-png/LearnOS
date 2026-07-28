import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
// @ts-ignore
import API from '../../api/axios';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import Sidebar from '../../components/Sidebar';
import GlobalSearch from '../../components/GlobalSearch';
import NotificationBell from '../../components/NotificationBell';
import {
  Flame,
  Target,
  Calendar,
  Zap,
  Brain,
  X,
  Trophy,
  Award,
  ChevronRight,
  Plus,
  LogOut,
  BookOpen,
  Clock,
  CheckSquare,
  MessageSquare,
  Sparkles,
  Check,
  Pencil,
} from 'lucide-react';

interface Semester {
  _id: string;
  name: string;
  createdAt?: string;
  subjectCount?: number;
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
  weeklyGoalDays?: number;
  daysStudiedThisWeek?: string[];
}

const ALL_BADGES = [
  { id: 'first_quiz', name: 'First Steps', icon: Target, desc: 'Completed your first quiz attempt' },
  { id: 'quiz_master', name: 'Quiz Master', icon: Trophy, desc: 'Completed 10 quiz attempts' },
  { id: 'week_streak', name: 'Week Warrior', icon: Flame, desc: 'Maintained a 7-day study streak' },
  { id: 'knowledge_seeker', name: 'Knowledge Seeker', icon: Brain, desc: 'Generated knowledge maps' },
  { id: 'perfect_score', name: 'Perfectionist', icon: Award, desc: 'Achieved a 100% quiz score' },
  { id: 'night_owl', name: 'Night Owl', icon: Clock, desc: 'Studied after 10 PM' },
];

interface SubjectItem {
  _id: string;
  name: string;
  semesterId: string;
  weakTopics?: string[];
  strongTopics?: string[];
  updatedAt?: string;
}

/* ─── Circular Progress Ring with Legend Dots ─────────────────── */
const CircularProgressWithLegend = ({
  value,
  max = 100,
  size = 72,
  strokeWidth = 6,
}: {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
}) => {
  const r = (size - strokeWidth * 2) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(value / max, 1);
  const center = size / 2;
  const remaining = Math.max(0, 100 - value);

  return (
    <div className="flex items-center gap-4">
      <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} className="absolute">
          <circle cx={center} cy={center} r={r} fill="none" stroke="#E5E7EB" strokeWidth={strokeWidth} />
          <circle
            cx={center}
            cy={center}
            r={r}
            fill="none"
            stroke="#2E7C87"
            strokeWidth={strokeWidth}
            strokeDasharray={`${circ * pct} ${circ * (1 - pct)}`}
            strokeLinecap="round"
          />
        </svg>
        <span className="relative z-10 text-sm font-semibold text-[#1E3A4A] [font-variant-numeric:tabular-nums]">
          {value}%
        </span>
      </div>
      <div className="flex flex-col gap-1 text-xs text-[#6B7B85]">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#2E7C87] shrink-0" />
          <span>Completed: <strong className="text-[#1E3A4A] font-medium [font-variant-numeric:tabular-nums]">{value}%</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#E5E7EB] shrink-0" />
          <span>Remaining: <strong className="text-[#1E3A4A] font-medium [font-variant-numeric:tabular-nums]">{remaining}%</strong></span>
        </div>
      </div>
    </div>
  );
};

/* ─── Readiness Ring ─────────────────────────────────────────── */
const ReadinessRing = ({ value }: { value: number }) => {
  const size = 72, sw = 6, r = (size - sw * 2) / 2, circ = 2 * Math.PI * r, center = size / 2;
  const pct = Math.min(value / 100, 1);
  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} className="absolute">
        <circle cx={center} cy={center} r={r} fill="none" stroke="#E5E7EB" strokeWidth={sw} />
        <circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke="#2E7C87"
          strokeWidth={sw}
          strokeDasharray={`${circ * pct} ${circ * (1 - pct)}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="relative z-10 text-center">
        <span className="text-base font-semibold text-[#1E3A4A] leading-none block [font-variant-numeric:tabular-nums]">{value}</span>
        <span className="text-[10px] text-[#6B7B85] block mt-0.5 font-normal">/100</span>
      </div>
    </div>
  );
};

// Motion Variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const sectionVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] as const },
  },
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

const Dashboard: React.FC = () => {
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [newSemester, setNewSemester] = useState('');
  const [loading, setLoading] = useState(true);
  const [addLoading, setAddLoading] = useState(false);

  // Time Period filter state
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'all'>('month');

  // Stats State
  const [stats, setStats] = useState<DashboardStats>({
    overallProgress: 0,
    totalStudyTimeMinutes: 0,
    weakSubjects: [],
    examReadiness: 0,
    totalSubjects: 0,
    totalQuizzesTaken: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // Exams & Recent Activity & Gamification State
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [examsLoading, setExamsLoading] = useState(true);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [userStats, setUserStats] = useState<UserGamificationStats | null>(null);

  // Weekly Goal Edit State
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState<number>(5);
  const [savingGoal, setSavingGoal] = useState(false);

  const handleSaveGoal = async () => {
    const val = Number(goalInput);
    if (isNaN(val) || val < 1 || val > 7) {
      toast.error('Goal must be between 1 and 7 days');
      return;
    }
    try {
      setSavingGoal(true);
      const res = await API.put('/stats/weekly-goal', { weeklyGoalDays: val });
      if (res.data) {
        setUserStats(res.data.stats || res.data);
        toast.success('Weekly goal updated!');
      }
      setIsEditingGoal(false);
    } catch (err: any) {
      console.error('Failed to update weekly goal:', err);
      toast.error(err.response?.data?.message || 'Failed to update goal');
    } finally {
      setSavingGoal(false);
    }
  };

  // Onboarding Banner State
  const [onboardingDismissed, setOnboardingDismissed] = useState<boolean>(() => {
    return localStorage.getItem('learnos_onboarding_dismissed') === 'true';
  });

  const handleDismissOnboarding = () => {
    localStorage.setItem('learnos_onboarding_dismissed', 'true');
    setOnboardingDismissed(true);
  };

  const getMotivationalMessage = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const isStudiedToday = userStats?.daysStudiedThisWeek?.includes(todayStr);

    if (userStats && userStats.currentStreak >= 3) {
      return `🔥 Incredible momentum! You are on a ${userStats.currentStreak}-day study streak. Keep up the fire!`;
    }
    if (stats.weakSubjects && stats.weakSubjects.length > 0) {
      return `🎯 Focus Nudge: Reviewing '${stats.weakSubjects[0].name}' today will boost your recall and exam readiness.`;
    }
    if (!isStudiedToday) {
      return `💡 Ready to learn today? Start a 15-minute study session or attempt a practice quiz to keep growing!`;
    }
    return `✨ Consistency is the key to mastery. Every small study session adds up over time!`;
  };

  const getDaysOfWeek = () => {
    const now = new Date();
    const currentDayOfWeek = now.getDay();
    const distanceToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + distanceToMonday);

    const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const days = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      days.push({
        label: dayLabels[i],
        dateStr,
        isToday: new Date().toDateString() === d.toDateString(),
      });
    }
    return days;
  };

  // Modal State
  const [showAddExamModal, setShowAddExamModal] = useState(false);
  const [allUserSubjects, setAllUserSubjects] = useState<SubjectItem[]>([]);
  const [examSubjectId, setExamSubjectId] = useState('');
  const [examNameInput, setExamNameInput] = useState('');
  const [examDateInput, setExamDateInput] = useState('');
  const [creatingExam, setCreatingExam] = useState(false);

  const { logout, user } = useAuth();

  useEffect(() => {
    fetchDashboardData();
    fetchUserStats();
  }, [selectedPeriod]);

  const fetchUserStats = async () => {
    try {
      const res = await API.get('/stats');
      if (res.data) {
        setUserStats(res.data.stats || res.data);
      }
    } catch (err) {
      console.error('Failed to fetch user gamification stats:', err);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setStatsLoading(true);
      setExamsLoading(true);
      setActivitiesLoading(true);

      const semestersRes = await API.get('/semesters');
      const fetchedSemesters: Semester[] = semestersRes.data || [];
      setSemesters(fetchedSemesters);

      const statsRes = await API.get(`/subjects/stats/overview?period=${selectedPeriod}`);
      if (statsRes.data) {
        setStats(statsRes.data.data || statsRes.data);
      }

      const examsRes = await API.get('/exams');
      const allExams: ExamItem[] = examsRes.data.exams || (Array.isArray(examsRes.data) ? examsRes.data : []);
      const upcoming = allExams
        .filter((e) => new Date(e.examDate) >= new Date(new Date().setHours(0, 0, 0, 0)))
        .sort((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime());
      setExams(upcoming);

      const actRes = await API.get('/subjects/activity/recent');
      if (actRes.data) {
        setActivities(Array.isArray(actRes.data) ? actRes.data : actRes.data.activities || []);
      }

      const allSubjList: SubjectItem[] = [];
      for (const sem of fetchedSemesters) {
        try {
          const sRes = await API.get(`/semesters/${sem._id}/subjects`);
          if (Array.isArray(sRes.data)) {
            allSubjList.push(...sRes.data);
          }
        } catch (_) {}
      }
      setAllUserSubjects(allSubjList);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
      setStatsLoading(false);
      setExamsLoading(false);
      setActivitiesLoading(false);
    }
  };

  const handleAddSemester = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSemester.trim()) return;

    try {
      setAddLoading(true);
      const res = await API.post('/semesters', { name: newSemester.trim() });
      setSemesters((prev) => [...prev, res.data]);
      setNewSemester('');
      toast.success('Semester added');
    } catch (error) {
      console.error('Error adding semester:', error);
      toast.error('Failed to add semester');
    } finally {
      setAddLoading(false);
    }
  };

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examSubjectId || !examNameInput.trim() || !examDateInput) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setCreatingExam(true);
      const res = await API.post('/exams', {
        subjectId: examSubjectId,
        name: examNameInput.trim(),
        examDate: examDateInput,
      });

      if (res.data) {
        toast.success('Exam scheduled');
        setShowAddExamModal(false);
        setExamSubjectId('');
        setExamNameInput('');
        setExamDateInput('');
        fetchDashboardData();
      }
    } catch (error) {
      console.error('Error scheduling exam:', error);
      toast.error('Failed to schedule exam');
    } finally {
      setCreatingExam(false);
    }
  };

  const logoutUser = () => {
    logout();
    toast.success('Logged out');
  };

  const formatStudyTime = (mins: number) => {
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return { hours, mins: remainingMins };
  };

  const calculateDaysUntil = (dateStr: string) => {
    const target = new Date(dateStr).getTime();
    const today = new Date().setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    return `In ${diffDays} days`;
  };

  const formatExamDateNice = (dateStr: string) => {
    const d = new Date(dateStr);
    const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
    const day = String(d.getDate()).padStart(2, '0');
    return { month, day };
  };

  const formatRelativeTime = (dateStr: string) => {
    if (!dateStr) return 'Recently';
    const diff = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const semesterCompletion = [65, 40, 80, 20];

  return (
    <div className="min-h-screen font-sans flex bg-[#F0F4F7] text-[#1E3A4A]">

      {/* ── Persistent Sidebar Component ── */}
      <Sidebar />

      {/* ── Main Content Area ── */}
      <main className="flex-1 ml-0 md:ml-64 pt-14 md:pt-0 min-h-screen flex flex-col overflow-y-auto bg-[#F0F4F7]">

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-4 sm:gap-6"
        >

          {/* ── Top Header Greeting & Toolbar ── */}
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-[#E5E7EB] gap-4">
            <div>
              <h1 className="font-sans font-semibold text-[#1E3A4A] text-lg md:text-xl tracking-tight">
                {getGreeting()}, {user?.name || 'Student'}
              </h1>
              <p className="text-sm text-[#6B7B85] mt-0.5 font-normal">
                Here is your study overview and performance summary for today.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Global Search */}
              <GlobalSearch />

              {/* Time Period Select */}
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value as 'week' | 'month' | 'all')}
                className="px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-xs font-medium text-[#1E3A4A] bg-white focus:outline-none focus:border-[#2E7C87] cursor-pointer"
              >
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="all">All Time</option>
              </select>

              {/* Notification Bell */}
              <NotificationBell />

              {/* User Avatar & Logout */}
              <div className="flex items-center gap-2 pl-1">
                <div className="w-8 h-8 rounded-full bg-[#2E7C87] text-white text-xs font-medium flex items-center justify-center shrink-0 font-mono">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <button
                  onClick={logoutUser}
                  title="Logout"
                  className="p-2 rounded-lg bg-white border border-[#E5E7EB] text-[#6B7B85] hover:text-red-500 hover:border-red-200 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* ── Motivational Message Banner ── */}
          <div className="bg-[#2E7C87]/10 border border-[#2E7C87]/30 rounded-xl px-4 py-3 flex items-center gap-3 text-xs text-[#1E3A4A]">
            <Sparkles className="w-4 h-4 text-[#2E7C87] shrink-0" />
            <span className="font-medium leading-relaxed">{getMotivationalMessage()}</span>
          </div>

          {/* ── First-Visit Onboarding Guide Banner ── */}
          {!onboardingDismissed && (semesters.length === 0 || (!userStats || userStats.xp === 0)) && (
            <div className="relative bg-[#1E3A4A] text-white rounded-2xl p-6 border border-[#E5E7EB] shadow-sm flex flex-col gap-4">
              <button
                type="button"
                onClick={handleDismissOnboarding}
                title="Dismiss guide"
                className="absolute top-4 right-4 p-1 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#2E7C87] flex items-center justify-center text-white shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-sans font-semibold text-base">Welcome to LearnOS! Quick Start Guide</h3>
                  <p className="text-xs text-gray-200 mt-0.5">Follow these 3 simple steps to master your subjects with AI.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="p-3 rounded-xl bg-white/10 border border-white/15 flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#2E7C87] text-white text-[11px] font-bold flex items-center justify-center shrink-0">1</span>
                    <h4 className="font-sans font-semibold text-xs text-white">Create a Semester</h4>
                  </div>
                  <p className="text-[11px] text-gray-200 leading-normal">
                    Organize your academic term (e.g. Fall 2026) and add your course subjects.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-white/10 border border-white/15 flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#2E7C87] text-white text-[11px] font-bold flex items-center justify-center shrink-0">2</span>
                    <h4 className="font-sans font-semibold text-xs text-white">Upload Study Materials</h4>
                  </div>
                  <p className="text-[11px] text-gray-200 leading-normal">
                    Upload PDF, DOCX, or TXT lecture notes for RAG vector indexing.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-white/10 border border-white/15 flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#2E7C87] text-white text-[11px] font-bold flex items-center justify-center shrink-0">3</span>
                    <h4 className="font-sans font-semibold text-xs text-white">Chat AI & Take Quizzes</h4>
                  </div>
                  <p className="text-[11px] text-gray-200 leading-normal">
                    Generate Knowledge Maps, study schedules, and timed practice exam questions.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── Gamification Card (Restrained SaaS Aesthetic) ── */}
          <motion.div
            variants={sectionVariants}
            className="bg-white rounded-2xl p-6 border border-[#E5E7EB] flex flex-col lg:flex-row items-stretch justify-between gap-6"
          >
            {/* Left: Level, XP, Streak, & Weekly Goal Tracker */}
            <div className="flex-1 flex flex-col justify-between gap-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                {/* Level Badge */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#F0F4F7] border border-[#E5E7EB] flex flex-col items-center justify-center shrink-0">
                    <span className="text-[9px] font-mono uppercase tracking-widest text-[#6B7B85] font-medium">LVL</span>
                    <span className="font-mono text-lg font-semibold text-[#1E3A4A] leading-none [font-variant-numeric:tabular-nums]">
                      {userStats ? userStats.level : 1}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#1E3A4A]">Level {userStats?.level || 1} Scholar</span>
                      <span className="text-xs text-[#2E7C87] font-medium [font-variant-numeric:tabular-nums]">
                        ({userStats?.xp || 0} XP)
                      </span>
                    </div>
                    <p className="text-xs text-[#6B7B85] mt-0.5 font-normal">Complete study sessions & quizzes to gain experience points.</p>
                  </div>
                </div>

                {/* Minimal Streak Indicator */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#F0F4F7] border border-[#E5E7EB] shrink-0 text-xs">
                  <Flame className="w-4 h-4 text-[#2E7C87]" />
                  <span className="text-[#1E3A4A] font-medium">
                    {userStats && userStats.currentStreak > 0 ? (
                      <span className="[font-variant-numeric:tabular-nums]">{userStats.currentStreak} day streak</span>
                    ) : (
                      <span>No active streak</span>
                    )}
                  </span>
                  <span className="text-[#6B7B85] text-[11px] [font-variant-numeric:tabular-nums]">
                    (Best: {userStats ? userStats.longestStreak : 0}d)
                  </span>
                </div>
              </div>

              {/* XP Progress Bar */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs text-[#6B7B85] font-normal">
                  <span>Progress to Level {(userStats?.level || 1) + 1}</span>
                  <span className="font-mono font-medium text-[#1E3A4A] [font-variant-numeric:tabular-nums]">
                    {(userStats?.xp || 0) % 100} / 100 XP
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#F0F4F7] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#2E7C87] transition-all duration-300"
                    style={{ width: `${(userStats?.xp || 0) % 100}%` }}
                  />
                </div>
              </div>

              {/* Weekly Goal Progress Widget (Restored M-T-W-T-F-S-S Day Circles) */}
              <div className="flex flex-col gap-2 pt-3 border-t border-[#E5E7EB]">
                <div className="flex items-center justify-between text-xs text-[#6B7B85]">
                  <span className="font-semibold uppercase tracking-wider text-[#6B7B85]">Weekly Goal</span>
                  {isEditingGoal ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={1}
                        max={7}
                        value={goalInput}
                        onChange={(e) => setGoalInput(Math.min(7, Math.max(1, parseInt(e.target.value) || 1)))}
                        className="w-12 px-1.5 py-0.5 text-xs font-mono border border-[#2E7C87] rounded bg-white text-[#1E3A4A] focus:outline-none focus:ring-1 focus:ring-[#2E7C87]"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleSaveGoal}
                        disabled={savingGoal}
                        className="p-1 rounded bg-[#2E7C87] text-white hover:bg-[#2E7C87]/90 text-xs cursor-pointer transition-colors"
                        title="Save goal"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingGoal(false)}
                        className="p-1 rounded bg-gray-100 text-[#6B7B85] hover:bg-gray-200 hover:text-[#1E3A4A] text-xs cursor-pointer transition-colors"
                        title="Cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <span className="font-mono font-semibold text-[#1E3A4A] [font-variant-numeric:tabular-nums]">
                      {userStats?.daysStudiedThisWeek?.length || 0} /{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setGoalInput(userStats?.weeklyGoalDays || 5);
                          setIsEditingGoal(true);
                        }}
                        title="Click to edit weekly goal target"
                        className="hover:text-[#2E7C87] underline hover:no-underline cursor-pointer transition-colors inline-flex items-center gap-0.5"
                      >
                        <span>{userStats?.weeklyGoalDays || 5}</span>
                        <Pencil className="w-3 h-3 text-[#6B7B85] hover:text-[#2E7C87]" />
                      </button>{' '}
                      Days
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between gap-1">
                  {getDaysOfWeek().map((dayObj, idx) => {
                    const isStudied = userStats?.daysStudiedThisWeek?.includes(dayObj.dateStr);
                    return (
                      <div
                        key={idx}
                        title={`${dayObj.dateStr}${isStudied ? ' (Studied)' : ''}`}
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold font-mono transition-colors ${
                          isStudied
                            ? 'bg-[#2E7C87] text-white shadow-xs'
                            : dayObj.isToday
                            ? 'bg-white border-2 border-[#2E7C87] text-[#2E7C87]'
                            : 'bg-[#F0F4F7] text-[#6B7B85]/60 border border-[#E5E7EB]'
                        }`}
                      >
                        {isStudied ? <CheckSquare className="w-3.5 h-3.5" /> : dayObj.label}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right: Badges */}
            <div className="lg:border-l lg:border-[#E5E7EB] lg:pl-6 flex flex-col gap-3 justify-center">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#6B7B85]">
                Unlocked Badges ({userStats?.badges?.length || 0} / {ALL_BADGES.length})
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ALL_BADGES.map((b) => {
                  const isUnlocked = userStats?.badges?.includes(b.id);
                  const IconComp = b.icon;
                  return (
                    <div
                      key={b.id}
                      title={`${b.name}: ${b.desc}${isUnlocked ? ' (Unlocked)' : ' (Locked)'}`}
                      className={`px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs border transition-colors ${
                        isUnlocked
                          ? 'bg-[#2E7C87]/10 border-[#2E7C87]/20 text-[#1E3A4A] font-medium'
                          : 'bg-white border-[#E5E7EB] text-[#6B7B85]/50'
                      }`}
                    >
                      <IconComp className={`w-3.5 h-3.5 shrink-0 ${isUnlocked ? 'text-[#2E7C87]' : 'text-[#6B7B85]/40'}`} />
                      <span className="truncate text-xs">{b.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>

          {/* ── Row of 4 Stat Cards (Consistent 24px Gap & Padding) ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

            {/* Stat Card 1: OVERALL PROGRESS */}
            <div className="bg-white rounded-2xl p-6 border border-[#E5E7EB] flex flex-col justify-between gap-4 h-full">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#6B7B85]">
                Overall Progress
              </span>
              <CircularProgressWithLegend value={statsLoading ? 0 : stats.overallProgress} size={72} />
            </div>

            {/* Stat Card 2: TOTAL STUDY TIME */}
            <div className="bg-white rounded-2xl p-6 border border-[#E5E7EB] flex flex-col justify-between gap-4 h-full">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#6B7B85]">
                Total Study Time
              </span>
              {(() => {
                const { hours, mins } = formatStudyTime(stats.totalStudyTimeMinutes);
                const hh = String(hours).padStart(2, '0');
                const mm = String(mins).padStart(2, '0');
                return (
                  <div>
                    <p className="text-2xl md:text-3xl font-semibold text-[#1E3A4A] leading-none [font-variant-numeric:tabular-nums]">
                      {hh}:{mm}
                    </p>
                    <p className="text-xs text-[#6B7B85] mt-2 font-normal">Logged study duration</p>
                  </div>
                );
              })()}
            </div>

            {/* Stat Card 3: UPCOMING EXAMS */}
            <div className="bg-white rounded-2xl p-6 border border-[#E5E7EB] flex flex-col justify-between gap-4 h-full">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#6B7B85]">
                  Upcoming Exams
                </span>
                {exams.length > 0 && (
                  <div className="flex items-center gap-1 text-xs text-[#2E7C87] font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2E7C87]" />
                    <span>{calculateDaysUntil(exams[0].examDate)}</span>
                  </div>
                )}
              </div>
              <div>
                <p className="text-2xl md:text-3xl font-semibold text-[#1E3A4A] leading-none [font-variant-numeric:tabular-nums]">
                  {examsLoading ? '0' : exams.length}
                </p>
                <p className="text-xs text-[#6B7B85] mt-2 font-normal">
                  {exams.length === 1 ? '1 exam scheduled' : `${exams.length} exams scheduled`}
                </p>
              </div>
            </div>

            {/* Stat Card 4: EXAM READINESS */}
            <div className="bg-white rounded-2xl p-6 border border-[#E5E7EB] flex flex-col justify-between gap-4 h-full">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#6B7B85]">
                Exam Readiness
              </span>
              <div className="flex items-center gap-4">
                <ReadinessRing value={statsLoading ? 0 : stats.examReadiness} />
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-[#1E3A4A]">
                    {stats.examReadiness >= 80 ? "On Track" : stats.examReadiness >= 50 ? 'Steady Progress' : 'Needs Practice'}
                  </span>
                  <span className="text-xs text-[#6B7B85] mt-0.5 font-normal">
                    {stats.examReadiness >= 80 ? "Ready for assessments" : stats.examReadiness >= 50 ? 'Consistent performance' : 'Take practice quizzes'}
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* ── Middle Row: WEAK SUBJECTS vs UPCOMING EXAMS ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* WEAK SUBJECTS */}
            <div className="bg-white rounded-2xl p-6 border border-[#E5E7EB] flex flex-col justify-between gap-6 h-full">
              <div>
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E5E7EB]">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-[#2E7C87]" />
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-[#6B7B85]">
                      Weak Subjects
                    </h3>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[#6B7B85] font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2E7C87]" />
                    <span>Needs Focus</span>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  {statsLoading ? (
                    <div className="flex justify-center py-6">
                      <div className="animate-spin h-5 w-5 border-2 border-[#2E7C87] border-t-transparent rounded-full" />
                    </div>
                  ) : stats.weakSubjects.length === 0 ? (
                    <div className="text-center py-6 px-4 text-xs rounded-lg border border-dashed border-[#E5E7EB] text-[#6B7B85]">
                      No weak subjects detected. Take quizzes to generate performance analytics.
                    </div>
                  ) : (
                    stats.weakSubjects.map((s) => (
                      <div key={s.subjectId} className="flex flex-col gap-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-[#1E3A4A] font-medium">{s.name}</span>
                          <span className="font-mono text-[#2E7C87] font-medium [font-variant-numeric:tabular-nums]">{s.latestScore}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-[#F0F4F7] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#2E7C87]"
                            style={{ width: `${Math.min(s.latestScore, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-[#E5E7EB]">
                <p className="text-xs text-[#6B7B85] font-normal leading-relaxed">
                  Focus on weak topics in your upcoming study sessions to maximize recall and performance.
                </p>
              </div>
            </div>

            {/* UPCOMING EXAMS */}
            <div className="bg-white rounded-2xl p-6 border border-[#E5E7EB] flex flex-col justify-between gap-6 h-full">
              <div>
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E5E7EB]">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#2E7C87]" />
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-[#6B7B85]">
                      Upcoming Exams
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddExamModal(true)}
                    className="px-3 py-1 rounded-lg text-xs font-medium text-white bg-[#2E7C87] hover:bg-[#256770] transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Exam</span>
                  </button>
                </div>

                <div className="flex flex-col gap-3">
                  {examsLoading ? (
                    <div className="flex justify-center py-6">
                      <div className="animate-spin h-5 w-5 border-2 border-[#2E7C87] border-t-transparent rounded-full" />
                    </div>
                  ) : exams.length === 0 ? (
                    <div className="text-center py-6 px-4 text-xs rounded-lg border border-dashed border-[#E5E7EB] text-[#6B7B85]">
                      No exams scheduled.
                    </div>
                  ) : (
                    exams.slice(0, 3).map((exam) => {
                      const { month, day } = formatExamDateNice(exam.examDate);
                      const subjName = typeof exam.subjectId === 'object' ? exam.subjectId.name : 'Subject';
                      const daysLeftText = calculateDaysUntil(exam.examDate);

                      return (
                        <div key={exam._id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#F0F4F7] transition-colors">
                          <div className="bg-[#1E3A4A] rounded-lg p-1.5 w-11 h-11 flex flex-col items-center justify-center shrink-0">
                            <span className="font-mono text-[9px] text-[#2E7C87] font-medium uppercase tracking-wider">{month}</span>
                            <span className="font-mono font-medium text-sm text-white leading-none mt-0.5 [font-variant-numeric:tabular-nums]">{day}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-[#1E3A4A] truncate">{exam.name}</p>
                            <p className="text-xs text-[#6B7B85] truncate mt-0.5 font-normal">{subjName}</p>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-[#2E7C87] font-medium shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#2E7C87]" />
                            <span>{daysLeftText}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-[#E5E7EB] flex items-center justify-between text-xs text-[#2E7C87] font-medium">
                <button onClick={() => setShowAddExamModal(true)} className="hover:underline cursor-pointer bg-transparent border-0 text-[#2E7C87] flex items-center gap-1">
                  <span>View all exams</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>

          {/* ── Bottom Row: RECENT ACTIVITY vs QUICK ACCESS ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* RECENT ACTIVITY */}
            <div className="bg-white rounded-2xl p-6 border border-[#E5E7EB] flex flex-col justify-between gap-6 h-full">
              <div>
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E5E7EB]">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-[#2E7C87]" />
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-[#6B7B85]">
                      Recent Activity
                    </h3>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  {activitiesLoading ? (
                    <div className="flex justify-center py-6">
                      <div className="animate-spin h-5 w-5 border-2 border-[#2E7C87] border-t-transparent rounded-full" />
                    </div>
                  ) : activities.length === 0 ? (
                    <div className="text-center py-6 px-4 text-xs rounded-lg border border-dashed border-[#E5E7EB] text-[#6B7B85]">
                      No activity recorded yet.
                    </div>
                  ) : (
                    activities.slice(0, 4).map((a) => {
                      const isChat = a.type === 'chat';
                      const labelText = isChat ? `Asked AI: ${a.subjectName}` : `Quiz: ${a.subjectName}`;
                      const subText = isChat ? a.text : `Score: ${a.score}%`;
                      const IconComp = isChat ? MessageSquare : CheckSquare;

                      return (
                        <div key={a.id} className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-[#2E7C87]/10 text-[#2E7C87] flex items-center justify-center shrink-0">
                            <IconComp className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-[#1E3A4A] truncate">{labelText}</p>
                            <p className="text-xs text-[#6B7B85] truncate mt-0.5 font-normal">{subText}</p>
                          </div>
                          <span className="text-xs text-[#6B7B85] font-normal shrink-0 [font-variant-numeric:tabular-nums]">
                            {formatRelativeTime(a.date)}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-[#E5E7EB] flex items-center justify-between text-xs text-[#2E7C87] font-medium">
                <Link to="/reports" className="hover:underline no-underline text-[#2E7C87] flex items-center gap-1">
                  <span>View all activity</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* QUICK ACCESS */}
            <div className="bg-white rounded-2xl p-6 border border-[#E5E7EB] flex flex-col justify-between gap-6 h-full">
              <div>
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E5E7EB]">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-[#2E7C87]" />
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-[#6B7B85]">
                      Quick Access
                    </h3>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5 mb-5">
                  <Link
                    to="/brain"
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-[#F0F4F7] border border-[#E5E7EB] hover:border-[#2E7C87] text-xs font-medium text-[#1E3A4A] transition-colors no-underline"
                  >
                    <div className="flex items-center gap-2.5">
                      <Brain className="w-4 h-4 text-[#2E7C87]" />
                      <span>Global Brain Patterns & Notes</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#6B7B85]" />
                  </Link>

                  <Link
                    to="/quizzes"
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-[#F0F4F7] border border-[#E5E7EB] hover:border-[#2E7C87] text-xs font-medium text-[#1E3A4A] transition-colors no-underline"
                  >
                    <div className="flex items-center gap-2.5">
                      <CheckSquare className="w-4 h-4 text-[#2E7C87]" />
                      <span>Practice Quiz Generator</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#6B7B85]" />
                  </Link>
                </div>

                {/* Continue Studying Card */}
                {(() => {
                  const lastStudiedSubject = (() => {
                    if (activities.length > 0) {
                      const recentSubj = allUserSubjects.find((s) => s._id === activities[0].subjectId);
                      if (recentSubj) return recentSubj;
                    }
                    return allUserSubjects[0] || null;
                  })();

                  return (
                    <div className="bg-[#2E7C87]/5 border border-[#2E7C87]/20 rounded-xl p-4 flex flex-col gap-3">
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-[#2E7C87] font-medium">
                          Ready to continue your journey?
                        </span>
                        <h5 className="font-sans font-semibold text-sm text-[#1E3A4A] mt-0.5">
                          {lastStudiedSubject ? lastStudiedSubject.name : 'Pick up where you left off'}
                        </h5>
                      </div>

                      {lastStudiedSubject ? (
                        <Link to={`/subjects/${lastStudiedSubject._id}`} className="no-underline">
                          <button
                            type="button"
                            className="w-full py-2.5 rounded-lg text-xs font-semibold text-white bg-[#1E3A4A] hover:bg-[#152B37] transition-colors cursor-pointer uppercase tracking-wider"
                          >
                            CONTINUE STUDYING
                          </button>
                        </Link>
                      ) : (
                        <Link to="/semesters" className="no-underline">
                          <button
                            type="button"
                            className="w-full py-2.5 rounded-lg text-xs font-semibold text-white bg-[#1E3A4A] hover:bg-[#152B37] transition-colors cursor-pointer uppercase tracking-wider"
                          >
                            EXPLORE SUBJECTS
                          </button>
                        </Link>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

          </div>

          {/* ── MY SEMESTERS Section ── */}
          <motion.div variants={sectionVariants} className="w-full flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[#6B7B85]">
                My Semesters
              </h2>
            </div>

            {/* Add Semester Form */}
            <form onSubmit={handleAddSemester} className="flex gap-2 max-w-md">
              <input
                type="text"
                placeholder="Add semester (e.g. Semester 3)"
                value={newSemester}
                onChange={(e) => setNewSemester(e.target.value)}
                className="flex-1 px-3.5 py-2 rounded-lg text-xs border border-[#E5E7EB] text-[#1E3A4A] bg-white placeholder-[#6B7B85] focus:outline-none focus:border-[#2E7C87]"
              />
              <button
                type="submit"
                disabled={addLoading}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#2E7C87] hover:bg-[#256770] transition-colors flex items-center gap-1 disabled:opacity-50 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Semester</span>
              </button>
            </form>

            {/* Semesters Grid */}
            {loading ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin h-5 w-5 border-2 border-[#2E7C87] border-t-transparent rounded-full" />
              </div>
            ) : semesters.length === 0 ? (
              <div className="text-center py-6 text-xs rounded-xl border border-dashed border-[#E5E7EB] bg-white text-[#6B7B85]">
                No semesters created yet. Add one above to organize your subjects.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {semesters.map((semester, idx) => {
                  const completion = semesterCompletion[idx] ?? 50;
                  const subjectsCount =
                    typeof semester.subjectCount === 'number'
                      ? semester.subjectCount
                      : allUserSubjects.filter((s) => String(s.semesterId) === String(semester._id)).length;

                  return (
                    <Link
                      key={semester._id}
                      to={`/semesters/${semester._id}`}
                      className="w-full bg-white border border-[#E5E7EB] hover:border-[#2E7C87] p-6 rounded-2xl flex flex-col justify-between gap-4 transition-colors no-underline"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[#2E7C87]">
                          Semester {idx + 1}
                        </span>
                        <span className="font-mono text-xs text-[#6B7B85] font-medium [font-variant-numeric:tabular-nums]">
                          {completion}% Done
                        </span>
                      </div>

                      <div>
                        <h3 className="font-sans font-semibold text-base text-[#1E3A4A]">{semester.name}</h3>
                        <p className="text-xs text-[#6B7B85] mt-0.5 font-normal">
                          <span className="text-[#1E3A4A] font-medium [font-variant-numeric:tabular-nums]">{subjectsCount}</span>{' '}
                          {subjectsCount === 1 ? 'Subject' : 'Subjects'} enrolled
                        </p>
                      </div>

                      <div className="w-full h-1.5 rounded-full bg-[#F0F4F7] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#2E7C87]"
                          style={{ width: `${completion}%` }}
                        />
                      </div>

                      <div className="pt-2 border-t border-[#E5E7EB] flex items-center justify-between text-xs text-[#2E7C87] font-medium">
                        <span>View subjects</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </motion.div>

        </motion.div>
      </main>

      {/* ── Add Exam Modal (With shadow-md overlay) ── */}
      {showAddExamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-2xl bg-white border border-[#E5E7EB] flex flex-col gap-5 shadow-md">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
              <h3 className="font-sans font-semibold text-base text-[#1E3A4A]">Schedule Exam</h3>
              <button
                type="button"
                onClick={() => setShowAddExamModal(false)}
                className="text-xs text-[#6B7B85] hover:text-[#1E3A4A] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateExam} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label htmlFor="exam-subject-select" className="text-xs font-medium text-[#6B7B85]">
                  Select Subject
                </label>
                <select
                  id="exam-subject-select"
                  required
                  value={examSubjectId}
                  onChange={(e) => setExamSubjectId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-xs bg-[#F0F4F7] border border-[#E5E7EB] text-[#1E3A4A] focus:outline-none focus:border-[#2E7C87] cursor-pointer"
                >
                  <option value="">-- Select Subject --</option>
                  {allUserSubjects.map((s) => (
                    <option key={s._id} value={s._id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="exam-name-input" className="text-xs font-medium text-[#6B7B85]">
                  Exam Name / Title
                </label>
                <input
                  id="exam-name-input"
                  type="text"
                  required
                  placeholder="e.g. Final Exam"
                  value={examNameInput}
                  onChange={(e) => setExamNameInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-xs bg-[#F0F4F7] border border-[#E5E7EB] text-[#1E3A4A] placeholder-[#6B7B85] focus:outline-none focus:border-[#2E7C87]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="exam-date-input" className="text-xs font-medium text-[#6B7B85]">
                  Exam Date
                </label>
                <input
                  id="exam-date-input"
                  type="date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  value={examDateInput}
                  onChange={(e) => setExamDateInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-xs bg-[#F0F4F7] border border-[#E5E7EB] text-[#1E3A4A] focus:outline-none focus:border-[#2E7C87] cursor-pointer font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E7EB]">
                <button
                  type="button"
                  onClick={() => setShowAddExamModal(false)}
                  className="px-3 py-2 rounded-lg text-xs font-medium text-[#6B7B85] hover:text-[#1E3A4A] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingExam || !examSubjectId || !examNameInput.trim() || !examDateInput}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#2E7C87] hover:bg-[#256770] transition-colors disabled:opacity-50 cursor-pointer"
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
