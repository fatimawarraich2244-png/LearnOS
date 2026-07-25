import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
// @ts-ignore
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import logo from '../../assets/logo.png';

interface TopicItem {
  name: string;
  subtopics: string[];
  order: number;
}

interface KnowledgeMapData {
  topics: TopicItem[];
}

interface Subject {
  _id: string;
  name: string;
  semesterId: string;
  knowledgeMap?: KnowledgeMapData | null;
  createdAt?: string;
}

interface MaterialItem {
  _id: string;
  fileName: string;
  filePath?: string;
  createdAt?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

interface QuizResultItem {
  question: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  explanation: string;
}

interface QuizResultsData {
  score: number;
  quizId: string;
  correctCount: number;
  totalQuestions: number;
  results: QuizResultItem[];
}

type QuizViewMode = 'setup' | 'taking' | 'results';

interface ScheduleItem {
  date: string;
  topics: string[];
  durationMinutes: number;
}

interface StudyPlanData {
  _id?: string;
  subjectId: string;
  examDate: string;
  hoursPerDay: number;
  schedule: ScheduleItem[];
  createdAt?: string;
}

const StudySubject: React.FC = () => {
  const { subjectId } = useParams<{ subjectId: string }>();
  const location = useLocation();
  const initialSubject = (location.state as { subject?: Subject })?.subject;

  const [subject, setSubject] = useState<Subject | null>(initialSubject || null);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [loadingSubject, setLoadingSubject] = useState(!initialSubject);
  const [loadingMaterials, setLoadingMaterials] = useState(true);

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ type: 'uploading' | 'success' | 'error'; message: string } | null>(null);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [isConfusionMode, setIsConfusionMode] = useState(false);
  const [isFeynmanMode, setIsFeynmanMode] = useState(false);
  const [feynmanStep, setFeynmanStep] = useState<1 | 2>(1);
  const [feynmanTopic, setFeynmanTopic] = useState('');
  const [feynmanExplanation, setFeynmanExplanation] = useState('');
  type ExplainLevel = 'normal' | 'eli6' | 'highschool' | 'university' | 'exam' | 'interview';
  const [explainLevel, setExplainLevel] = useState<ExplainLevel>('normal');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Quiz state
  const [quizDifficulty, setQuizDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [quizViewMode, setQuizViewMode] = useState<QuizViewMode>('setup');
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizError, setQuizError] = useState('');
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  const [quizResults, setQuizResults] = useState<QuizResultsData | null>(null);

  // Exam Simulator state
  type ExamViewMode = 'setup' | 'taking' | 'results';
  const [examDifficulty, setExamDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [examViewMode, setExamViewMode] = useState<ExamViewMode>('setup');
  const [examLoading, setExamLoading] = useState(false);
  const [examError, setExamError] = useState('');
  const [examQuestions, setExamQuestions] = useState<QuizQuestion[]>([]);
  const [examUserAnswers, setExamUserAnswers] = useState<string[]>([]);
  const [submittingExam, setSubmittingExam] = useState(false);
  const [examResults, setExamResults] = useState<QuizResultsData | null>(null);
  const [examTimeLimitMinutes, setExamTimeLimitMinutes] = useState(20);
  const [examRemainingSeconds, setExamRemainingSeconds] = useState(20 * 60);
  const [examTimeTakenSeconds, setExamTimeTakenSeconds] = useState(0);
  const examTimerIntervalRef = useRef<any>(null);
  const examUserAnswersRef = useRef<string[]>([]);
  const examRemainingSecondsRef = useRef<number>(20 * 60);

  // Study Timer state
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [savingTimer, setSavingTimer] = useState(false);
  const [timerMessage, setTimerMessage] = useState<{ type: 'info' | 'success' | 'error'; text: string } | null>(null);
  const timerIntervalRef = useRef<any>(null);

  // Knowledge Map state
  const [knowledgeMapData, setKnowledgeMapData] = useState<KnowledgeMapData | null>(
    initialSubject?.knowledgeMap || null
  );
  const [generatingMap, setGeneratingMap] = useState(false);
  const [mapError, setMapError] = useState('');

  // Study Planner state
  const [studyPlan, setStudyPlan] = useState<StudyPlanData | null>(null);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [planError, setPlanError] = useState('');
  const [examDateInput, setExamDateInput] = useState('');
  const [hoursPerDayInput, setHoursPerDayInput] = useState(2);
  const [showPlanSetup, setShowPlanSetup] = useState(false);

  const { logoutUser } = useAuth();

  // Scroll chat window to bottom when messages update
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatLoading]);

  // Clean up timer interval on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (examTimerIntervalRef.current) {
        clearInterval(examTimerIntervalRef.current);
      }
    };
  }, []);

  // Sync knowledge map if subject is loaded
  useEffect(() => {
    if (subject?.knowledgeMap) {
      setKnowledgeMapData(subject.knowledgeMap);
    }
  }, [subject]);

  // Fetch subject details if not provided via location state
  useEffect(() => {
    const fetchSubjectDetails = async () => {
      if (!subjectId) return;
      try {
        const res = await API.get(`/subjects/single/${subjectId}`);
        setSubject(res.data);
        if (res.data?.knowledgeMap) {
          setKnowledgeMapData(res.data.knowledgeMap);
        }
      } catch (err) {
        console.error('Failed to fetch subject details', err);
      } finally {
        setLoadingSubject(false);
      }
    };

    fetchSubjectDetails();
  }, [subjectId]);

  // Fetch existing study plan on mount
  useEffect(() => {
    const fetchStudyPlan = async () => {
      if (!subjectId) return;
      try {
        const res = await API.get(`/planner/${subjectId}`);
        if (res.data) {
          setStudyPlan(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch study plan', err);
      }
    };

    fetchStudyPlan();
  }, [subjectId]);

  // Fetch materials for subject
  useEffect(() => {
    const fetchMaterials = async () => {
      if (!subjectId) return;
      try {
        const res = await API.get(`/materials/${subjectId}`);
        setMaterials(res.data);
      } catch (err) {
        console.error('Failed to fetch materials', err);
      } finally {
        setLoadingMaterials(false);
      }
    };

    fetchMaterials();
  }, [subjectId]);

  // Fetch chat history for subject
  useEffect(() => {
    const fetchChatHistory = async () => {
      if (!subjectId) return;
      try {
        const res = await API.get(`/chat/${subjectId}`);
        setMessages(res.data);
      } catch (err) {
        console.error('Failed to fetch chat history', err);
      }
    };

    fetchChatHistory();
  }, [subjectId]);


  // File upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !subjectId) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('subjectId', subjectId);

    setIsUploading(true);
    setUploadStatus({ type: 'uploading', message: 'Uploading and embedding material...' });

    try {
      const res = await API.post('/materials/upload', formData);
      setUploadStatus({ type: 'success', message: `Successfully uploaded: ${file.name}` });
      setMaterials((prev) => [res.data, ...prev]);
    } catch (err: any) {
      setUploadStatus({ type: 'error', message: err.response?.data?.message || 'Upload failed' });
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  // Chat form submit handler
  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentQuestion.trim() || chatLoading || !subjectId) return;

    const question = currentQuestion.trim();
    const isLevelActive = explainLevel !== 'normal';
    const isConfusion = isConfusionMode;

    let userMessageContent = question;
    if (isLevelActive) {
      userMessageContent = `Explain ${question} at ${explainLevel} level`;
    } else if (isConfusion) {
      userMessageContent = `I'm confused about: ${question}`;
    }

    setMessages((prev) => [...prev, { role: 'user', content: userMessageContent }]);
    setCurrentQuestion('');
    setChatLoading(true);

    try {
      let endpoint = '/chat/ask';
      let payload: any = { subjectId, question };

      if (isLevelActive) {
        endpoint = '/chat/explain-level';
        payload = { subjectId, topic: question, level: explainLevel };
      } else if (isConfusion) {
        endpoint = '/chat/confusion';
        payload = { subjectId, confusedTopic: question };
      }

      const res = await API.post(endpoint, payload);
      setMessages((prev) => [...prev, { role: 'assistant', content: res.data.answer }]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: err.response?.data?.message || 'Sorry, something went wrong answering your request.' },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // Feynman mode submit handler
  const handleFeynmanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feynmanTopic.trim() || !feynmanExplanation.trim() || chatLoading || !subjectId) return;

    const topic = feynmanTopic.trim();
    const explanation = feynmanExplanation.trim();
    const rawUserContent = `Teaching: ${topic} - ${explanation}`;
    const userMessageContent = rawUserContent.length > 300 ? rawUserContent.slice(0, 300) + '...' : rawUserContent;

    setMessages((prev) => [...prev, { role: 'user', content: userMessageContent }]);
    setChatLoading(true);

    try {
      const res = await API.post('/chat/feynman', {
        subjectId,
        topic,
        studentExplanation: explanation,
      });

      setMessages((prev) => [...prev, { role: 'assistant', content: res.data.answer }]);
      setFeynmanExplanation('');
      setFeynmanTopic('');
      setFeynmanStep(1);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: err.response?.data?.message || 'Sorry, something went wrong evaluating your explanation.' },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const toggleConfusionMode = () => {
    if (!isConfusionMode) {
      setIsConfusionMode(true);
      setIsFeynmanMode(false);
    } else {
      setIsConfusionMode(false);
    }
  };

  const toggleFeynmanMode = () => {
    if (!isFeynmanMode) {
      setIsFeynmanMode(true);
      setIsConfusionMode(false);
      setFeynmanStep(1);
    } else {
      setIsFeynmanMode(false);
      setFeynmanStep(1);
    }
  };

  // Generate Quiz handler
  const handleGenerateQuiz = async () => {
    if (!subjectId) return;
    setQuizLoading(true);
    setQuizError('');

    try {
      const res = await API.post('/quiz/generate', { subjectId, difficulty: quizDifficulty });
      const questions: QuizQuestion[] = res.data.questions || [];
      setQuizQuestions(questions);
      setUserAnswers(new Array(questions.length).fill(''));
      setQuizViewMode('taking');
    } catch (err: any) {
      setQuizError(err.response?.data?.message || 'Failed to generate quiz. Please check that you have uploaded materials.');
    } finally {
      setQuizLoading(false);
    }
  };

  // Select Option handler
  const handleSelectOption = (questionIndex: number, option: string) => {
    setUserAnswers((prev) => {
      const next = [...prev];
      next[questionIndex] = option;
      return next;
    });
  };

  // Submit Quiz handler
  const handleSubmitQuiz = async () => {
    if (!subjectId || quizQuestions.length === 0) return;
    setSubmittingQuiz(true);
    setQuizError('');

    try {
      const res = await API.post('/quiz/submit', {
        subjectId,
        questions: quizQuestions,
        userAnswers,
        difficulty: quizDifficulty,
      });
      setQuizResults(res.data);
      setQuizViewMode('results');
    } catch (err: any) {
      setQuizError(err.response?.data?.message || 'Failed to submit quiz. Please try again.');
    } finally {
      setSubmittingQuiz(false);
    }
  };

  // Reset Quiz handler
  const handleResetQuiz = () => {
    setQuizViewMode('setup');
    setQuizQuestions([]);
    setUserAnswers([]);
    setQuizResults(null);
    setQuizError('');
  };

  // Exam Simulator Handlers
  const handleStartExam = async () => {
    if (!subjectId) return;
    setExamLoading(true);
    setExamError('');

    try {
      const res = await API.post('/quiz/generate-exam', { subjectId, difficulty: examDifficulty });
      const questions: QuizQuestion[] = res.data.questions || [];
      const timeLimitMins = res.data.timeLimit || 20;
      const initialSecs = timeLimitMins * 60;

      setExamQuestions(questions);
      setExamTimeLimitMinutes(timeLimitMins);
      setExamRemainingSeconds(initialSecs);
      examRemainingSecondsRef.current = initialSecs;

      const emptyAnswers = new Array(questions.length).fill('');
      setExamUserAnswers(emptyAnswers);
      examUserAnswersRef.current = emptyAnswers;

      setExamViewMode('taking');

      if (examTimerIntervalRef.current) {
        clearInterval(examTimerIntervalRef.current);
      }

      examTimerIntervalRef.current = setInterval(() => {
        setExamRemainingSeconds((prev) => {
          if (prev <= 1) {
            if (examTimerIntervalRef.current) {
              clearInterval(examTimerIntervalRef.current);
              examTimerIntervalRef.current = null;
            }
            handleSubmitExam(examUserAnswersRef.current, initialSecs);
            return 0;
          }
          const nextSecs = prev - 1;
          examRemainingSecondsRef.current = nextSecs;
          return nextSecs;
        });
      }, 1000);
    } catch (err: any) {
      setExamError(err.response?.data?.message || 'Failed to prepare exam. Please ensure study materials are uploaded.');
    } finally {
      setExamLoading(false);
    }
  };

  const handleSelectExamOption = (questionIndex: number, option: string) => {
    setExamUserAnswers((prev) => {
      const next = [...prev];
      next[questionIndex] = option;
      examUserAnswersRef.current = next;
      return next;
    });
  };

  const handleSubmitExam = async (overrideAnswers?: string[], forcedTotalSecs?: number) => {
    if (!subjectId || examQuestions.length === 0) return;

    if (examTimerIntervalRef.current) {
      clearInterval(examTimerIntervalRef.current);
      examTimerIntervalRef.current = null;
    }

    setSubmittingExam(true);
    setExamError('');

    const answersToSubmit = overrideAnswers || examUserAnswersRef.current || examUserAnswers;
    const totalLimitSecs = forcedTotalSecs || (examTimeLimitMinutes * 60);
    const timeTaken = Math.max(0, totalLimitSecs - examRemainingSecondsRef.current);
    setExamTimeTakenSeconds(timeTaken);

    try {
      const res = await API.post('/quiz/submit', {
        subjectId,
        questions: examQuestions,
        userAnswers: answersToSubmit,
        difficulty: examDifficulty,
        examMode: true,
        timeTakenSeconds: timeTaken,
      });

      setExamResults(res.data);
      setExamViewMode('results');
    } catch (err: any) {
      setExamError(err.response?.data?.message || 'Failed to submit exam. Please try again.');
    } finally {
      setSubmittingExam(false);
    }
  };

  const handleResetExam = () => {
    if (examTimerIntervalRef.current) {
      clearInterval(examTimerIntervalRef.current);
      examTimerIntervalRef.current = null;
    }
    setExamViewMode('setup');
    setExamQuestions([]);
    setExamUserAnswers([]);
    examUserAnswersRef.current = [];
    setExamResults(null);
    setExamError('');
  };

  const formatTimerMMSS = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatExamTimeTaken = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    if (mins === 0) return `${secs} second${secs !== 1 ? 's' : ''}`;
    return `${mins} min${mins !== 1 ? 's' : ''} ${secs} sec${secs !== 1 ? 's' : ''}`;
  };

  // Timer Handlers
  const handleToggleTimer = () => {
    if (isTimerRunning) {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      setIsTimerRunning(false);
    } else {
      setTimerMessage(null);
      setIsTimerRunning(true);
      timerIntervalRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
  };

  const handleSaveTimer = async () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setIsTimerRunning(false);

    const minutes = Math.round(elapsedSeconds / 60);

    if (minutes < 1) {
      setTimerMessage({ type: 'info', text: 'Study for at least 1 minute to log time' });
      return;
    }

    if (!subjectId) return;

    setSavingTimer(true);
    setTimerMessage(null);

    try {
      await API.post(`/subjects/${subjectId}/log-time`, { minutes });
      setTimerMessage({ type: 'success', text: `Logged ${minutes} minute${minutes > 1 ? 's' : ''} of study time!` });
      setElapsedSeconds(0);
    } catch (err: any) {
      setTimerMessage({ type: 'error', text: err.response?.data?.message || 'Failed to log study time' });
    } finally {
      setSavingTimer(false);
    }
  };

  // Generate Knowledge Map Handler
  const handleGenerateKnowledgeMap = async () => {
    if (!subjectId) return;
    setGeneratingMap(true);
    setMapError('');

    try {
      const res = await API.post(`/subjects/${subjectId}/knowledge-map`);
      const mapData = res.data.knowledgeMap;
      setKnowledgeMapData(mapData);
      setSubject((prev) => (prev ? { ...prev, knowledgeMap: mapData } : prev));
    } catch (err: any) {
      setMapError(
        err.response?.data?.message || 'Failed to generate Knowledge Map. Make sure you have uploaded study materials.'
      );
    } finally {
      setGeneratingMap(false);
    }
  };

  // Generate Study Plan Handler
  const handleGeneratePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectId || !examDateInput || !hoursPerDayInput) return;

    setGeneratingPlan(true);
    setPlanError('');

    try {
      const res = await API.post('/planner/generate', {
        subjectId,
        examDate: examDateInput,
        hoursPerDay: Number(hoursPerDayInput),
      });
      setStudyPlan(res.data.plan);
      setShowPlanSetup(false);
    } catch (err: any) {
      setPlanError(
        err.response?.data?.message || 'Failed to generate study plan. Please ensure you have generated a knowledge map.'
      );
    } finally {
      setGeneratingPlan(false);
    }
  };

  const handleCreateNewPlan = () => {
    setShowPlanSetup(true);
  };

  // Format Timer Display: MM:SS or HH:MM:SS
  const formatElapsedTime = (totalSecs: number) => {
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;

    const pad = (num: number) => num.toString().padStart(2, '0');

    if (hours > 0) {
      return `${pad(hours)}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  };

  const getTodayISO = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDateNice = (dateStr: string) => {
    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      const d = new Date(year, month - 1, day);
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const getDaysUntilExam = (itemDateStr: string, examDateStr: string) => {
    try {
      const [iY, iM, iD] = itemDateStr.split('-').map(Number);
      const itemDate = new Date(iY, iM - 1, iD);

      const examDate = new Date(examDateStr);
      examDate.setHours(0, 0, 0, 0);

      const diffTime = examDate.getTime() - itemDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return 'Exam Day!';
      if (diffDays === 1) return '1 day before exam';
      return `${diffDays} days before exam`;
    } catch {
      return '';
    }
  };

  const allAnswered = userAnswers.length > 0 && userAnswers.every((ans) => ans.trim() !== '');

  const backLink = subject?.semesterId ? `/semesters/${subject.semesterId}` : '/dashboard';

  const hasKnowledgeMap = !!(knowledgeMapData?.topics && knowledgeMapData.topics.length > 0);
  const todayISO = getTodayISO();

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
          <Link to={backLink} className="flex items-center gap-2 text-sm text-[#8EB69B] hover:text-[#A8D4DC] transition-colors font-medium">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
            Back to Semester
          </Link>
          <div style={{ width: '1px', height: '24px', background: 'rgba(168,212,220,0.15)', margin: '0 8px' }} />
          <img src={logo} alt="LearnOS" className="h-9 w-auto" />
          <span className="font-jakarta font-bold text-xl tracking-wide" style={{ background: 'linear-gradient(90deg, #A8D4DC, #4EC9D4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>LearnOS</span>
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

      {/* Main Content Area */}
      <div className="flex flex-col p-8 md:p-10 gap-8 max-w-screen-2xl w-full mx-auto relative flex-1" style={{ zIndex: 1 }}>
        {/* Page Header */}
        <div className="flex flex-col gap-2">
          {loadingSubject ? (
            <div className="h-10 w-64 bg-slate-800/50 animate-pulse rounded-xl" />
          ) : (
            <h1 className="font-jakarta font-bold text-3xl md:text-4xl" style={{ background: 'linear-gradient(90deg, #DAF1DE 0%, #A8D4DC 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {subject?.name || 'Study Subject'}
            </h1>
          )}
          <p className="text-sm text-[#8EB69B]">Upload course materials, chat with AI, track study time, visualize knowledge maps, and test your knowledge</p>
        </div>

        {/* SECTION 1: STUDY TIMER CARD */}
        <div
          style={{
            background: 'linear-gradient(145deg, #0c1e1f 0%, #0a1720 100%)',
            border: '1px solid rgba(168,212,220,0.12)',
          }}
          className="rounded-3xl p-6 md:p-7 flex flex-col gap-4 w-full"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 w-full">
            <div className="flex items-center gap-4">
              <div style={{ width: 44, height: 44, background: 'linear-gradient(135deg, #0d3d3a 0%, #1a5c5a 100%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A8D4DC' }}>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              </div>
              <div>
                <h2 className="font-jakarta font-bold text-lg" style={{ color: '#DAF1DE' }}>Study Session Timer</h2>
                <p className="text-xs text-[#8EB69B]">Track and log your active study time for this subject</p>
              </div>
            </div>

            <div className="flex items-center gap-6 flex-wrap justify-center md:justify-end">
              {/* Large Monospace Timer Display with Glow Effect */}
              <div className="px-6 py-2 rounded-2xl bg-[#060E10]/80 border border-teal-500/20 shadow-[0_0_20px_rgba(168,212,220,0.15)] flex items-center justify-center min-w-[140px]">
                <span
                  className="font-mono font-bold text-3xl md:text-4xl tracking-wider"
                  style={{
                    background: 'linear-gradient(135deg, #DAF1DE 0%, #4EC9D4 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    filter: 'drop-shadow(0 0 10px rgba(168,212,220,0.4))',
                  }}
                >
                  {formatElapsedTime(elapsedSeconds)}
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                {/* Start / Pause Button */}
                <button
                  type="button"
                  onClick={handleToggleTimer}
                  className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer hover:shadow-lg ${
                    isTimerRunning
                      ? 'bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                      : 'bg-[#4EC9D4]/10 border border-[#4EC9D4]/30 text-[#4EC9D4] hover:bg-[#4EC9D4]/20'
                  }`}
                >
                  {isTimerRunning ? (
                    <>
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                      <span>Start</span>
                    </>
                  )}
                </button>

                {/* Save & Finish Button */}
                <button
                  type="button"
                  onClick={handleSaveTimer}
                  disabled={savingTimer || elapsedSeconds === 0}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer hover:shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #A8D4DC 0%, #4EC9D4 100%)', color: '#040D0E', boxShadow: '0 0 15px rgba(168,212,220,0.2)' }}
                >
                  {savingTimer ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-[#040D0E]" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                      <span>Save & Finish</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Timer Message Notification */}
          {timerMessage && (
            <div
              className={`w-full text-xs font-medium px-4 py-2.5 rounded-xl border flex items-center gap-2 ${
                timerMessage.type === 'error'
                  ? 'bg-red-500/10 border-red-500/20 text-red-400'
                  : timerMessage.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-teal-500/10 border-teal-500/20 text-[#4EC9D4]'
              }`}
            >
              <span>{timerMessage.text}</span>
            </div>
          )}
        </div>

        {/* SECTION 2: KNOWLEDGE MAP CARD */}
        <div
          style={{
            background: 'linear-gradient(145deg, #0c1e1f 0%, #0a1720 100%)',
            border: '1px solid rgba(168,212,220,0.12)',
          }}
          className="rounded-3xl p-6 md:p-8 flex flex-col gap-6 w-full"
        >
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg, #2a1a4a 0%, #0d3d3a 100%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#B8A0E8' }}>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/></svg>
              </div>
              <div>
                <h2 className="font-jakarta font-bold text-xl" style={{ color: '#DAF1DE' }}>AI Knowledge Map</h2>
                <p className="text-xs text-[#8EB69B]">Recommended learning path & topic hierarchy derived from your materials</p>
              </div>
            </div>

            {/* Regenerate Button if map exists */}
            {hasKnowledgeMap && (
              <button
                onClick={handleGenerateKnowledgeMap}
                disabled={generatingMap}
                className="px-4 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer hover:border-teal-400"
                style={{ background: 'linear-gradient(135deg, #0d2820 0%, #0a1a2a 100%)', border: '1px solid rgba(168,212,220,0.2)', color: '#DAF1DE' }}
              >
                {generatingMap ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 text-[#4EC9D4]" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                    <span>Regenerate Map</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Body State: No map generated yet */}
          {!hasKnowledgeMap && (
            <div className="flex flex-col items-center justify-center p-8 rounded-2xl text-center gap-4 border border-dashed border-teal-500/20" style={{ backgroundColor: 'rgba(6, 14, 16, 0.6)' }}>
              <div className="w-12 h-12 rounded-2xl bg-teal-500/10 flex items-center justify-center text-[#4EC9D4]">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/></svg>
              </div>
              <div className="max-w-md flex flex-col gap-1">
                <h3 className="font-jakarta font-semibold text-base text-[#DAF1DE]">No Knowledge Map Generated Yet</h3>
                <p className="text-xs text-[#8EB69B]">Upload your course documents and click below to build a structured, step-by-step topic roadmap.</p>
              </div>
              <button
                onClick={handleGenerateKnowledgeMap}
                disabled={generatingMap}
                className="mt-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer hover:shadow-lg"
                style={{ background: 'linear-gradient(135deg, #A8D4DC 0%, #4EC9D4 100%)', color: '#040D0E', boxShadow: '0 0 15px rgba(168,212,220,0.2)' }}
              >
                {generatingMap ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-[#040D0E]" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                    <span>Analyzing your materials...</span>
                  </>
                ) : (
                  <>
                    <span>Generate Knowledge Map</span>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                  </>
                )}
              </button>

              {mapError && (
                <p className="text-xs text-red-400 mt-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20">{mapError}</p>
              )}
            </div>
          )}

          {/* Body State: Knowledge Map Tree Visualization */}
          {hasKnowledgeMap && (
            <div className="flex flex-col gap-6 relative pl-2 md:pl-4">
              {mapError && (
                <p className="text-xs text-red-400 mb-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20">{mapError}</p>
              )}

              <div className="flex flex-col gap-6 relative">
                {/* Continuous Vertical Flow Line connecting topic badges */}
                <div
                  className="absolute left-[19px] top-6 bottom-6 w-0.5 pointer-events-none"
                  style={{ background: 'linear-gradient(180deg, rgba(78,201,212,0.4) 0%, rgba(149,155,185,0.2) 100%)' }}
                />

                {[...knowledgeMapData!.topics]
                  .sort((a, b) => (a.order || 0) - (b.order || 0))
                  .map((topic, idx) => (
                    <div key={idx} className="flex items-start gap-5 relative z-10">
                      {/* Order Number Badge */}
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center font-jakarta font-bold text-sm shrink-0"
                        style={{
                          background: 'linear-gradient(135deg, #0d3d3a 0%, #0c1e1f 100%)',
                          border: '1px solid rgba(78,201,212,0.4)',
                          color: '#4EC9D4',
                          boxShadow: '0 0 15px rgba(78,201,212,0.25)',
                        }}
                      >
                        {topic.order ?? idx + 1}
                      </div>

                      {/* Topic Content Card */}
                      <div
                        className="flex-1 p-5 rounded-2xl flex flex-col gap-3 transition-all hover:border-teal-500/30"
                        style={{
                          backgroundColor: 'rgba(6, 14, 16, 0.65)',
                          border: '1px solid rgba(168,212,220,0.1)',
                        }}
                      >
                        <h3 className="font-jakarta font-semibold text-base text-[#DAF1DE]">
                          {topic.name}
                        </h3>

                        {/* Subtopic Pills */}
                        {topic.subtopics && topic.subtopics.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-1">
                            {topic.subtopics.map((sub, sIdx) => (
                              <span
                                key={sIdx}
                                className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
                                style={{
                                  backgroundColor: '#0A1A1B',
                                  border: '1px solid rgba(168,212,220,0.12)',
                                  color: '#A8D4DC',
                                }}
                              >
                                {sub}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* SECTION 3: AI STUDY PLANNER CARD */}
        <div
          style={{
            background: 'linear-gradient(145deg, #0c1e1f 0%, #0a1720 100%)',
            border: '1px solid rgba(168,212,220,0.12)',
          }}
          className="rounded-3xl p-6 md:p-8 flex flex-col gap-6 w-full"
        >
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg, #1e3a5f 0%, #0d3d3a 100%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60A5FA' }}>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
              </div>
              <div>
                <h2 className="font-jakarta font-bold text-xl" style={{ color: '#DAF1DE' }}>AI Study Planner</h2>
                <p className="text-xs text-[#8EB69B]">Personalized day-by-day exam preparation schedule</p>
              </div>
            </div>

            {/* Create New Plan Button if plan already exists */}
            {studyPlan && !showPlanSetup && (
              <button
                onClick={handleCreateNewPlan}
                className="px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer hover:border-teal-400"
                style={{ background: 'linear-gradient(135deg, #0d2820 0%, #0a1a2a 100%)', border: '1px solid rgba(168,212,220,0.2)', color: '#DAF1DE' }}
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                <span>Create New Plan</span>
              </button>
            )}
          </div>

          {/* Condition A: No Knowledge Map generated yet */}
          {!hasKnowledgeMap && (
            <div className="flex flex-col items-center justify-center p-8 rounded-2xl text-center gap-3 border border-dashed border-teal-500/20" style={{ backgroundColor: 'rgba(6, 14, 16, 0.6)' }}>
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-400">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
              </div>
              <p className="text-sm font-semibold text-[#DAF1DE]">Generate a Knowledge Map first before creating a study plan</p>
              <p className="text-xs text-[#8EB69B] max-w-md">
                Please scroll up to the Knowledge Map section above and click <strong>"Generate Knowledge Map"</strong> so the AI can sequence your topics.
              </p>
            </div>
          )}

          {/* Condition B: Knowledge Map exists, but no Study Plan or user clicked Create New Plan */}
          {hasKnowledgeMap && (!studyPlan || showPlanSetup) && (
            <form onSubmit={handleGeneratePlan} className="flex flex-col gap-6 my-2">
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 p-6 rounded-2xl" style={{ backgroundColor: 'rgba(6, 14, 16, 0.6)', border: '1px solid rgba(168,212,220,0.08)' }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
                  {/* Exam Date Picker */}
                  <div className="flex flex-col gap-2">
                    <label htmlFor="exam-date-picker" className="text-xs font-medium text-[#8EB69B]">Exam Date</label>
                    <input
                      id="exam-date-picker"
                      type="date"
                      required
                      min={todayISO}
                      value={examDateInput}
                      onChange={(e) => setExamDateInput(e.target.value)}
                      disabled={generatingPlan}
                      style={{ backgroundColor: '#0A1A1B', border: '1px solid rgba(168,212,220,0.18)', color: '#DAF1DE' }}
                      className="px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-teal-400 cursor-pointer"
                    />
                  </div>

                  {/* Hours Per Day Input */}
                  <div className="flex flex-col gap-2">
                    <label htmlFor="hours-per-day-input" className="text-xs font-medium text-[#8EB69B]">Available Study Hours / Day</label>
                    <input
                      id="hours-per-day-input"
                      type="number"
                      required
                      min={0.5}
                      max={14}
                      step={0.5}
                      value={hoursPerDayInput}
                      onChange={(e) => setHoursPerDayInput(Number(e.target.value))}
                      disabled={generatingPlan}
                      style={{ backgroundColor: '#0A1A1B', border: '1px solid rgba(168,212,220,0.18)', color: '#DAF1DE' }}
                      className="px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-teal-400 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Generate Action Button */}
                <div className="flex items-center gap-3 shrink-0">
                  {showPlanSetup && studyPlan && (
                    <button
                      type="button"
                      onClick={() => setShowPlanSetup(false)}
                      className="px-4 py-3 rounded-xl text-sm font-medium text-[#8EB69B] hover:text-[#DAF1DE] transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={generatingPlan || !examDateInput}
                    className="px-6 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer hover:shadow-lg"
                    style={{ background: 'linear-gradient(135deg, #A8D4DC 0%, #4EC9D4 100%)', color: '#040D0E', boxShadow: '0 0 15px rgba(168,212,220,0.2)' }}
                  >
                    {generatingPlan ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-[#040D0E]" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                        <span>Creating your personalized study plan...</span>
                      </>
                    ) : (
                      <>
                        <span>Generate Study Plan</span>
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {planError && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {planError}
                </div>
              )}
            </form>
          )}

          {/* Condition C: Study Plan exists and display mode active */}
          {hasKnowledgeMap && studyPlan && !showPlanSetup && (
            <div className="flex flex-col gap-6 my-2">
              {/* Summary Sub-header */}
              <div className="flex items-center justify-between flex-wrap gap-4 p-4 rounded-2xl bg-[#060E10]/60 border border-white/5">
                <div className="flex items-center gap-6 flex-wrap text-xs text-[#8EB69B]">
                  <div>
                    <span className="text-[#DAF1DE] font-semibold block text-sm">
                      {new Date(studyPlan.examDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <span>Target Exam Date</span>
                  </div>
                  <div className="h-6 w-px bg-white/10" />
                  <div>
                    <span className="text-[#DAF1DE] font-semibold block text-sm">{studyPlan.hoursPerDay} hrs / day</span>
                    <span>Daily Capacity</span>
                  </div>
                  <div className="h-6 w-px bg-white/10" />
                  <div>
                    <span className="text-[#4EC9D4] font-semibold block text-sm">{studyPlan.schedule?.length || 0} Days</span>
                    <span>Schedule Duration</span>
                  </div>
                </div>
              </div>

              {/* Vertical Timeline List */}
              <div className="flex flex-col gap-4 relative pl-2 md:pl-4">
                <div
                  className="absolute left-[19px] top-6 bottom-6 w-0.5 pointer-events-none"
                  style={{ background: 'linear-gradient(180deg, rgba(78,201,212,0.4) 0%, rgba(96,165,250,0.2) 100%)' }}
                />

                {studyPlan.schedule.map((item, idx) => {
                  const isToday = item.date === todayISO;
                  const daysUntil = getDaysUntilExam(item.date, studyPlan.examDate);

                  return (
                    <div key={idx} className="flex items-start gap-5 relative z-10">
                      {/* Timeline Day Dot / Icon */}
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-jakarta font-bold text-xs shrink-0 transition-all ${
                          isToday
                            ? 'bg-[#4EC9D4] text-[#040D0E] shadow-[0_0_15px_rgba(78,201,212,0.6)]'
                            : 'bg-[#0A1A1B] border border-teal-500/30 text-[#A8D4DC]'
                        }`}
                      >
                        {idx + 1}
                      </div>

                      {/* Schedule Item Card */}
                      <div
                        className={`flex-1 p-5 rounded-2xl flex flex-col gap-3 transition-all ${
                          isToday
                            ? 'bg-[#0A1F20] border-2 border-[#4EC9D4] shadow-[0_0_20px_rgba(78,201,212,0.2)]'
                            : 'bg-[#060E10]/60 border border-white/10 hover:border-teal-500/30'
                        }`}
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-3">
                            <h3 className="font-jakarta font-bold text-base text-[#DAF1DE]">
                              {formatDateNice(item.date)}
                            </h3>
                            {isToday && (
                              <span className="text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full bg-[#4EC9D4] text-[#040D0E]">
                                Today
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            {daysUntil && (
                              <span className="text-xs font-medium text-[#8EB69B] bg-white/5 px-3 py-1 rounded-lg border border-white/5">
                                {daysUntil}
                              </span>
                            )}
                            <span className="text-xs font-semibold text-[#4EC9D4] bg-teal-500/10 px-3 py-1 rounded-lg border border-teal-500/20">
                              ⏱ {item.durationMinutes ? `${Math.round(item.durationMinutes / 60)}h ${item.durationMinutes % 60}m` : `${studyPlan.hoursPerDay}h`}
                            </span>
                          </div>
                        </div>

                        {/* Topic list for this day */}
                        {item.topics && item.topics.length > 0 && (
                          <ul className="flex flex-col gap-2 mt-1 pl-1">
                            {item.topics.map((t, tIdx) => (
                              <li key={tIdx} className="flex items-center gap-2 text-sm text-[#A8D4DC]">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#4EC9D4] shrink-0" />
                                <span>{t}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* SECTION 4: Two Column Layout */}
        <div className="flex flex-col lg:flex-row gap-8 w-full">
          {/* LEFT COLUMN: 40% Width - Upload & Materials */}
          <div className="w-full lg:w-[40%] flex flex-col gap-6">
            <div
              style={{
                background: 'linear-gradient(145deg, #0c1e1f 0%, #0a1720 100%)',
                border: '1px solid rgba(168,212,220,0.12)',
              }}
              className="rounded-3xl p-6 md:p-8 flex flex-col gap-6"
            >
              <div className="flex items-center gap-3">
                <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg, #0d3d3a 0%, #1a5c5a 100%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A8D4DC' }}>
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                </div>
                <div>
                  <h2 className="font-jakarta font-bold text-lg" style={{ color: '#DAF1DE' }}>Study Materials</h2>
                  <p className="text-xs text-[#8EB69B]">Upload course files for AI context</p>
                </div>
              </div>

              {/* Upload Drop Zone */}
              <div className="relative">
                <input
                  type="file"
                  id={`upload-study-subject`}
                  className="hidden"
                  accept=".pdf,.docx,.txt"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />
                <label
                  htmlFor={`upload-study-subject`}
                  className="flex flex-col items-center justify-center gap-3 w-full py-8 px-4 rounded-2xl border border-dashed cursor-pointer transition-all hover:bg-teal-500/5 group text-center"
                  style={{ borderColor: 'rgba(78,201,212,0.4)', background: 'rgba(10,26,27,0.5)', color: '#A8D4DC' }}
                >
                  {isUploading ? (
                    <svg className="animate-spin h-8 w-8 text-[#4EC9D4]" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                  ) : (
                    <div className="p-3 rounded-full bg-teal-500/10 group-hover:bg-teal-500/20 transition-colors">
                      <svg className="h-6 w-6 text-[#4EC9D4]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                    </div>
                  )}
                  <div>
                    <span className="text-sm font-semibold block text-[#DAF1DE]">
                      {isUploading ? 'Processing Material...' : 'Click to Upload Material'}
                    </span>
                    <span className="text-xs text-[#8EB69B] mt-1 block">Supports PDF, DOCX, TXT</span>
                  </div>
                </label>
              </div>

              {uploadStatus && (
                <p className={`text-xs text-center font-medium px-3 py-2 rounded-xl border ${uploadStatus.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-teal-500/10 border-teal-500/20 text-[#4EC9D4]'}`}>
                  {uploadStatus.message}
                </p>
              )}

              {/* Uploaded Materials List */}
              <div className="flex flex-col gap-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8EB69B]">
                  Uploaded Materials ({materials.length})
                </h3>

                {loadingMaterials ? (
                  <div className="flex justify-center py-6">
                    <svg className="animate-spin h-5 w-5 text-[#A8D4DC]" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                  </div>
                ) : materials.length === 0 ? (
                  <div className="text-center py-8 text-xs rounded-xl border border-dashed border-[#1a3a38] text-[#346659]">
                    No materials uploaded yet. Upload lecture notes, slides, or syllabus above.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5 max-h-[350px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(168,212,220,0.2) transparent' }}>
                    {materials.map((mat) => (
                      <div key={mat._id} className="flex items-center gap-3 p-3.5 rounded-xl transition-colors" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(168,212,220,0.08)' }}>
                        <div className="p-2 rounded-lg bg-teal-500/10 text-[#7EC8E3]">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                        </div>
                        <span className="text-sm truncate font-medium flex-1 text-[#DAF1DE]">{mat.fileName}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: 60% Width - Chat Interface */}
          <div className="w-full lg:w-[60%] flex flex-col">
            <div
              style={{
                background: 'linear-gradient(145deg, #0c1e1f 0%, #0a1720 100%)',
                border: '1px solid rgba(168,212,220,0.12)',
              }}
              className="rounded-3xl p-6 md:p-8 flex flex-col flex-1"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/5 flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div style={{ width: 40, height: 40, background: isFeynmanMode ? 'linear-gradient(135deg, #713f12 0%, #a16207 100%)' : isConfusionMode ? 'linear-gradient(135deg, #4c1d95 0%, #6b21a8 100%)' : 'linear-gradient(135deg, #0d3d3a 0%, #1a5c5a 100%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isFeynmanMode ? '#fde047' : isConfusionMode ? '#c084fc' : '#A8D4DC', transition: 'all 0.3s ease' }}>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-jakarta font-bold text-lg" style={{ color: '#DAF1DE' }}>
                        {isFeynmanMode ? "Feynman Mode (Teach to Learn)" : isConfusionMode ? "AI Confusion Detector" : "AI Study Assistant"}
                      </h2>
                      {isFeynmanMode && (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Teach Active
                        </span>
                      )}
                      {isConfusionMode && (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          Diagnostic Active
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#8EB69B]">
                      {isFeynmanMode ? "Explain a concept in your own words to get AI evaluation against course materials" : isConfusionMode ? "Find missing prerequisites & clarify root causes of confusion" : "Ask questions powered by your uploaded course materials"}
                    </p>
                  </div>
                </div>

                {/* Mode Toggle Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={toggleConfusionMode}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      isConfusionMode
                        ? 'bg-purple-600/20 border border-purple-400 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                        : 'bg-teal-500/10 border border-teal-500/20 text-[#4EC9D4] hover:bg-teal-500/20'
                    }`}
                  >
                    <span>{isConfusionMode ? '🔍' : '💡'}</span>
                    <span>{isConfusionMode ? 'Exit Confusion' : "I'm Confused Mode"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={toggleFeynmanMode}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      isFeynmanMode
                        ? 'bg-amber-500/20 border border-amber-400 text-amber-300 shadow-[0_0_15px_rgba(234,179,8,0.3)]'
                        : 'bg-amber-500/10 border border-amber-500/20 text-amber-300 hover:bg-amber-500/20'
                    }`}
                  >
                    <span>🎓</span>
                    <span>{isFeynmanMode ? 'Exit Teach Mode' : 'Teach Mode'}</span>
                  </button>
                </div>
              </div>

              {/* Chat Message Window (600px Height) */}
              <div
                className="h-[600px] overflow-y-auto flex flex-col gap-4 p-4 rounded-2xl mb-4"
                style={{
                  backgroundColor: 'rgba(6, 14, 16, 0.6)',
                  border: '1px solid rgba(168,212,220,0.08)',
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'rgba(168,212,220,0.2) transparent',
                }}
              >
                {messages.length === 0 && !chatLoading && (
                  <div className="flex flex-col items-center justify-center h-full text-center p-6 gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-teal-500/10 flex items-center justify-center text-[#4EC9D4]">
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
                    </div>
                    <p className="text-sm font-medium text-[#DAF1DE]">No questions asked yet</p>
                    <p className="text-xs text-[#4a7a68] max-w-sm">
                      Upload your course documents on the left, then ask questions, diagnose confusion, or use Teach Mode to explain concepts!
                    </p>
                  </div>
                )}

                {messages.map((msg, i) => {
                  const isUserConfusion = msg.role === 'user' && msg.content.startsWith("I'm confused about:");
                  const isUserFeynman = msg.role === 'user' && msg.content.startsWith("Teaching: ");
                  const isPrevUserConfusion = i > 0 && messages[i - 1]?.role === 'user' && messages[i - 1]?.content.startsWith("I'm confused about:");
                  const isPrevUserFeynman = i > 0 && messages[i - 1]?.role === 'user' && messages[i - 1]?.content.startsWith("Teaching: ");

                  const isAssistantDiagnostic = msg.role === 'assistant' && (
                    isPrevUserConfusion ||
                    msg.content.includes("Likely Root Cause") ||
                    msg.content.includes("Foundation First") ||
                    msg.content.includes("Now It Should Click")
                  );

                  const isAssistantFeynman = msg.role === 'assistant' && (
                    isPrevUserFeynman ||
                    msg.content.includes("What You Got Right") ||
                    msg.content.includes("Missing Pieces") ||
                    msg.content.includes("Clarity Score") ||
                    msg.content.includes("Try Again?")
                  );

                  const getLevelBadgeInfo = (text: string) => {
                    const match = text.match(/Explain\s+[\s\S]+\s+at\s+(eli6|highschool|university|exam|interview)\s+level/i);
                    if (!match) return null;
                    const lvl = match[1].toLowerCase();
                    switch (lvl) {
                      case 'eli6':
                        return { label: 'ELI6 Explanation', icon: '👶', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
                      case 'highschool':
                        return { label: 'High School Explanation', icon: '🏫', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' };
                      case 'university':
                        return { label: 'University Explanation', icon: '🎓', color: 'bg-[#4EC9D4]/20 text-[#4EC9D4] border-teal-500/30' };
                      case 'exam':
                        return { label: 'Model Exam Answer', icon: '📝', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
                      case 'interview':
                        return { label: 'Interview Answer', icon: '💼', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' };
                      default:
                        return null;
                    }
                  };

                  const levelBadge = msg.role === 'user'
                    ? getLevelBadgeInfo(msg.content)
                    : (i > 0 && messages[i - 1]?.role === 'user' ? getLevelBadgeInfo(messages[i - 1].content) : null);

                  return (
                    <div key={i} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed whitespace-pre-wrap ${
                          msg.role === 'user' ? 'rounded-tr-xs font-medium' : 'rounded-tl-xs text-[#DAF1DE]'
                        }`}
                        style={{
                          backgroundColor: isUserFeynman
                            ? '#713f12'
                            : isUserConfusion
                            ? '#7e22ce'
                            : msg.role === 'user'
                            ? '#4EC9D4'
                            : isAssistantFeynman
                            ? '#182210'
                            : isAssistantDiagnostic
                            ? '#120B24'
                            : '#0A1A1B',
                          color: msg.role === 'user' ? (isUserConfusion || isUserFeynman ? '#fef08a' : '#040D0E') : '#DAF1DE',
                          border: isAssistantFeynman
                            ? '1px solid rgba(234, 179, 8, 0.4)'
                            : isAssistantDiagnostic
                            ? '1px solid rgba(168, 85, 247, 0.4)'
                            : isUserFeynman
                            ? '1px solid rgba(234, 179, 8, 0.5)'
                            : isUserConfusion
                            ? '1px solid rgba(192, 132, 252, 0.5)'
                            : msg.role === 'assistant'
                            ? '1px solid rgba(168,212,220,0.15)'
                            : 'none',
                          boxShadow: isAssistantFeynman
                            ? '0 0 20px rgba(234, 179, 8, 0.15)'
                            : isAssistantDiagnostic
                            ? '0 0 20px rgba(168, 85, 247, 0.15)'
                            : isUserFeynman
                            ? '0 0 20px rgba(234, 179, 8, 0.25)'
                            : isUserConfusion
                            ? '0 0 20px rgba(168, 85, 247, 0.3)'
                            : msg.role === 'user'
                            ? '0 0 20px rgba(78,201,212,0.15)'
                            : 'none',
                        }}
                      >
                        {levelBadge && (
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border mb-2.5 ${levelBadge.color}`}>
                            <span>{levelBadge.icon}</span>
                            <span>{levelBadge.label}</span>
                          </div>
                        )}

                        {isAssistantFeynman && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border mb-2.5 bg-amber-500/20 text-amber-300 border-amber-500/30">
                            <span>🎓</span>
                            <span>Feynman Feedback</span>
                          </div>
                        )}

                        {isAssistantDiagnostic && !levelBadge && !isAssistantFeynman && (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-purple-300 mb-2 pb-2 border-b border-purple-500/25">
                            <span className="text-sm">🔍</span>
                            <span>AI Diagnostic Breakdown</span>
                          </div>
                        )}
                        {msg.content}
                      </div>
                    </div>
                  );
                })}

                {chatLoading && (
                  <div className="flex w-full justify-start">
                    <div className="max-w-[85%] rounded-2xl rounded-tl-xs p-4 flex items-center gap-2" style={{ backgroundColor: isFeynmanMode ? '#182210' : isConfusionMode ? '#120B24' : '#0A1A1B', border: isFeynmanMode ? '1px solid rgba(234,179,8,0.4)' : isConfusionMode ? '1px solid rgba(168,85,247,0.4)' : '1px solid rgba(168,212,220,0.15)' }}>
                      <span className="text-xs text-[#8EB69B]">{isFeynmanMode ? 'AI is evaluating your explanation against course materials...' : explainLevel !== 'normal' ? `AI is generating ${explainLevel} explanation...` : isConfusionMode ? 'AI is diagnosing missing prerequisites...' : 'AI is analyzing your materials...'}</span>
                      <span className={`h-1.5 w-1.5 rounded-full ${isFeynmanMode ? 'bg-amber-400' : isConfusionMode ? 'bg-purple-400' : 'bg-[#A8D4DC]'} animate-bounce`} style={{ animationDelay: '0ms' }} />
                      <span className={`h-1.5 w-1.5 rounded-full ${isFeynmanMode ? 'bg-amber-400' : isConfusionMode ? 'bg-purple-400' : 'bg-[#A8D4DC]'} animate-bounce`} style={{ animationDelay: '150ms' }} />
                      <span className={`h-1.5 w-1.5 rounded-full ${isFeynmanMode ? 'bg-amber-400' : isConfusionMode ? 'bg-purple-400' : 'bg-[#A8D4DC]'} animate-bounce`} style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* FEYNMAN TWO-STEP FLOW INPUT FORM */}
              {isFeynmanMode ? (
                <form onSubmit={feynmanStep === 1 ? (e) => { e.preventDefault(); if (feynmanTopic.trim()) setFeynmanStep(2); } : handleFeynmanSubmit} className="flex flex-col gap-3 p-4 rounded-2xl bg-[#141b0d] border border-amber-500/30">
                  {feynmanStep === 1 ? (
                    <div className="flex gap-2.5 items-center">
                      <input
                        type="text"
                        placeholder="What topic do you want to teach?"
                        value={feynmanTopic}
                        onChange={(e) => setFeynmanTopic(e.target.value)}
                        disabled={chatLoading}
                        style={{ backgroundColor: '#0A1A1B', border: '1px solid rgba(234,179,8,0.3)', color: '#DAF1DE' }}
                        className="flex-1 px-4 py-3.5 rounded-xl text-sm placeholder-amber-400/50 focus:outline-none focus:border-amber-400 transition-colors"
                      />
                      <button
                        type="submit"
                        disabled={!feynmanTopic.trim() || chatLoading}
                        className="px-6 py-3.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 flex items-center gap-2 hover:shadow-lg shrink-0 cursor-pointer text-white"
                        style={{ background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)', boxShadow: '0 0 15px rgba(234,179,8,0.3)' }}
                      >
                        <span>Next: Explain It</span>
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-amber-300 font-bold uppercase tracking-wider">Teaching Topic:</span>
                          <span className="text-xs px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-200 border border-amber-500/30 font-semibold">{feynmanTopic}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFeynmanStep(1)}
                          className="text-xs text-amber-400/80 hover:text-amber-300 underline"
                        >
                          Change Topic
                        </button>
                      </div>

                      <textarea
                        rows={4}
                        placeholder="Now explain it in your own words as if teaching someone..."
                        value={feynmanExplanation}
                        onChange={(e) => setFeynmanExplanation(e.target.value)}
                        disabled={chatLoading}
                        style={{ backgroundColor: '#0A1A1B', border: '1px solid rgba(234,179,8,0.3)', color: '#DAF1DE' }}
                        className="w-full p-4 rounded-xl text-sm placeholder-amber-400/50 focus:outline-none focus:border-amber-400 transition-colors leading-relaxed"
                      />

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={!feynmanExplanation.trim() || chatLoading}
                          className="px-8 py-3.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 flex items-center gap-2 hover:shadow-lg shrink-0 cursor-pointer text-white"
                          style={{ background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)', boxShadow: '0 0 20px rgba(234,179,8,0.35)' }}
                        >
                          <span>Get Feedback</span>
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                        </button>
                      </div>
                    </div>
                  )}
                </form>
              ) : (
                /* Standard Chat Input & Send Button Pinned at Bottom */
                <form onSubmit={handleAskQuestion} className="flex gap-2.5 items-center flex-wrap md:flex-nowrap">
                  <select
                    value={explainLevel}
                    onChange={(e) => setExplainLevel(e.target.value as ExplainLevel)}
                    disabled={chatLoading}
                    style={{
                      backgroundColor: explainLevel !== 'normal' ? '#0d2228' : '#0A1A1B',
                      border: explainLevel !== 'normal' ? '1px solid rgba(78,201,212,0.4)' : '1px solid rgba(168,212,220,0.18)',
                      color: explainLevel !== 'normal' ? '#4EC9D4' : '#DAF1DE'
                    }}
                    className="px-3 py-3.5 rounded-xl text-xs font-semibold focus:outline-none focus:border-teal-400 cursor-pointer shrink-0"
                    title="Select explanation depth level"
                  >
                    <option value="normal">Level: Normal</option>
                    <option value="eli6">👶 ELI6</option>
                    <option value="highschool">🏫 High School</option>
                    <option value="university">🎓 University</option>
                    <option value="exam">📝 Exam Answer</option>
                    <option value="interview">💼 Interview Answer</option>
                  </select>

                  <input
                    type="text"
                    placeholder={
                      explainLevel !== 'normal'
                        ? `Ask a topic to explain at ${explainLevel} level...`
                        : isConfusionMode
                        ? "What topic are you confused about?"
                        : "Ask a question about this subject..."
                    }
                    value={currentQuestion}
                    onChange={(e) => setCurrentQuestion(e.target.value)}
                    disabled={chatLoading}
                    style={{
                      backgroundColor: explainLevel !== 'normal' ? '#091d21' : isConfusionMode ? '#140D28' : '#0A1A1B',
                      border: explainLevel !== 'normal' ? '1px solid rgba(78,201,212,0.3)' : isConfusionMode ? '1px solid rgba(168,85,247,0.4)' : '1px solid rgba(168,212,220,0.18)',
                      color: '#DAF1DE'
                    }}
                    className={`flex-1 px-4 py-3.5 rounded-xl text-sm focus:outline-none transition-colors min-w-[200px] ${
                      explainLevel !== 'normal' ? 'placeholder-teal-400/50 focus:border-teal-400' : isConfusionMode ? 'placeholder-purple-400/50 focus:border-purple-400' : 'placeholder-[#235347] focus:border-teal-400'
                    }`}
                  />

                  <button
                    type="button"
                    onClick={toggleConfusionMode}
                    className={`px-3.5 py-3.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer border ${
                      isConfusionMode
                        ? 'bg-purple-600/30 border-purple-400 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                        : 'bg-[#0A1A1B] border-white/10 text-[#8EB69B] hover:text-[#DAF1DE]'
                    }`}
                    title="Toggle Confusion Detector mode"
                  >
                    {isConfusionMode ? "✓ Confused Mode" : "I'm Confused"}
                  </button>

                  <button
                    type="submit"
                    disabled={chatLoading || !currentQuestion.trim()}
                    className="px-6 py-3.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 flex items-center gap-2 hover:shadow-lg shrink-0 cursor-pointer"
                    style={{
                      background: explainLevel !== 'normal'
                        ? 'linear-gradient(135deg, #4EC9D4 0%, #2563eb 100%)'
                        : isConfusionMode
                        ? 'linear-gradient(135deg, #c084fc 0%, #9333ea 100%)'
                        : 'linear-gradient(135deg, #A8D4DC 0%, #4EC9D4 100%)',
                      color: explainLevel !== 'normal' || isConfusionMode ? '#ffffff' : '#040D0E',
                      boxShadow: explainLevel !== 'normal'
                        ? '0 0 15px rgba(78,201,212,0.3)'
                        : isConfusionMode
                        ? '0 0 15px rgba(168,85,247,0.3)'
                        : '0 0 15px rgba(168,212,220,0.2)'
                    }}
                  >
                    <span>{explainLevel !== 'normal' ? 'Explain' : isConfusionMode ? 'Diagnose' : 'Send'}</span>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 5: PRACTICE QUIZ SECTION */}
        <div
          style={{
            background: 'linear-gradient(145deg, #0c1e1f 0%, #0a1720 100%)',
            border: '1px solid rgba(168,212,220,0.12)',
          }}
          className="rounded-3xl p-6 md:p-8 flex flex-col gap-6 w-full"
        >
          {/* Section Title Header */}
          <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg, #1e4a6e 0%, #0d3d3a 100%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7EC8E3' }}>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              </div>
              <div>
                <h2 className="font-jakarta font-bold text-xl" style={{ color: '#DAF1DE' }}>AI Practice Quiz</h2>
                <p className="text-xs text-[#8EB69B]">Test your comprehension of uploaded study materials</p>
              </div>
            </div>

            {/* View Mode Tag */}
            {quizViewMode === 'taking' && (
              <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-teal-500/10 text-[#4EC9D4] border border-teal-500/20">
                Quiz in Progress ({userAnswers.filter(a => a !== '').length} / {quizQuestions.length} answered)
              </span>
            )}
            {quizViewMode === 'results' && (
              <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-indigo-500/10 text-[#7EC8E3] border border-indigo-500/20">
                Quiz Completed
              </span>
            )}
          </div>

          {/* SETUP MODE */}
          {quizViewMode === 'setup' && (
            <div className="flex flex-col gap-6 my-2">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 rounded-2xl" style={{ backgroundColor: 'rgba(6, 14, 16, 0.6)', border: '1px solid rgba(168,212,220,0.08)' }}>
                <div className="flex flex-col gap-1 max-w-md">
                  <h3 className="font-jakarta font-semibold text-base text-[#DAF1DE]">Ready to test your knowledge?</h3>
                  <p className="text-xs text-[#8EB69B]">Select a difficulty level and generate 5 AI-created multiple choice questions derived directly from your notes.</p>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  {/* Difficulty selector */}
                  <div className="flex items-center gap-2">
                    <label htmlFor="quiz-difficulty" className="text-xs font-medium text-[#8EB69B]">Difficulty:</label>
                    <select
                      id="quiz-difficulty"
                      value={quizDifficulty}
                      onChange={(e) => setQuizDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
                      disabled={quizLoading}
                      style={{ backgroundColor: '#0A1A1B', border: '1px solid rgba(168,212,220,0.18)', color: '#DAF1DE' }}
                      className="px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:border-teal-400 cursor-pointer"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>

                  {/* Generate Button */}
                  <button
                    onClick={handleGenerateQuiz}
                    disabled={quizLoading}
                    className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer hover:shadow-lg"
                    style={{ background: 'linear-gradient(135deg, #A8D4DC 0%, #4EC9D4 100%)', color: '#040D0E', boxShadow: '0 0 15px rgba(168,212,220,0.2)' }}
                  >
                    {quizLoading ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-[#040D0E]" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                        <span>Generating quiz...</span>
                      </>
                    ) : (
                      <>
                        <span>Generate Quiz</span>
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {quizError && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                  <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                  <span>{quizError}</span>
                </div>
              )}
            </div>
          )}

          {/* TAKING MODE */}
          {quizViewMode === 'taking' && (
            <div className="flex flex-col gap-8 my-2">
              <div className="flex flex-col gap-6">
                {quizQuestions.map((q, qIndex) => {
                  const selectedAnswer = userAnswers[qIndex];
                  return (
                    <div
                      key={qIndex}
                      className="p-6 md:p-7 rounded-2xl flex flex-col gap-4"
                      style={{ backgroundColor: 'rgba(6, 14, 16, 0.6)', border: '1px solid rgba(168,212,220,0.1)' }}
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex items-center justify-center w-7 h-7 rounded-full bg-teal-500/10 text-[#4EC9D4] font-jakarta font-bold text-xs shrink-0">
                          {qIndex + 1}
                        </span>
                        <h3 className="font-jakarta font-semibold text-base md:text-lg text-[#DAF1DE] pt-0.5">
                          {q.question}
                        </h3>
                      </div>

                      {/* Options Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2 pl-0 md:pl-10">
                        {q.options.map((opt, optIndex) => {
                          const isSelected = selectedAnswer === opt;
                          return (
                            <button
                              key={optIndex}
                              type="button"
                              onClick={() => handleSelectOption(qIndex, opt)}
                              className={`p-4 rounded-xl text-sm font-medium text-left flex items-center justify-between gap-3 transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-[#4EC9D4]/10 border-2 border-[#4EC9D4] text-[#4EC9D4] shadow-[0_0_15px_rgba(78,201,212,0.15)]'
                                  : 'bg-[#0A1A1B] border border-white/10 text-[#DAF1DE] hover:border-teal-500/30 hover:bg-[#0d2224]'
                              }`}
                            >
                              <span>{opt}</span>
                              <div
                                className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                                  isSelected ? 'border-[#4EC9D4] bg-[#4EC9D4]' : 'border-slate-600 bg-transparent'
                                }`}
                              >
                                {isSelected && (
                                  <div className="w-2 h-2 rounded-full bg-[#040D0E]" />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {quizError && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {quizError}
                </div>
              )}

              {/* Submit Quiz Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-white/5 flex-wrap gap-4">
                <button
                  onClick={handleResetQuiz}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium text-[#8EB69B] hover:text-[#DAF1DE] transition-colors"
                >
                  Cancel Quiz
                </button>

                <button
                  onClick={handleSubmitQuiz}
                  disabled={!allAnswered || submittingQuiz}
                  className="px-8 py-3.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer hover:shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #A8D4DC 0%, #4EC9D4 100%)', color: '#040D0E', boxShadow: '0 0 20px rgba(168,212,220,0.25)' }}
                >
                  {submittingQuiz ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-[#040D0E]" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Quiz</span>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* RESULTS MODE */}
          {quizViewMode === 'results' && quizResults && (
            <div className="flex flex-col gap-8 my-2">
              {/* Overall Score Card */}
              <div
                className="p-8 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left"
                style={{ backgroundColor: 'rgba(6, 14, 16, 0.7)', border: '1px solid rgba(168,212,220,0.15)' }}
              >
                <div className="flex flex-col gap-2">
                  <span className="text-xs uppercase tracking-wider font-semibold text-[#8EB69B]">Quiz Score</span>
                  <div className="flex items-baseline gap-3 justify-center md:justify-start">
                    <span
                      className={`text-5xl font-extrabold font-jakarta ${
                        quizResults.score >= 80
                          ? 'text-emerald-400'
                          : quizResults.score >= 50
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {quizResults.score}%
                    </span>
                    <span className="text-sm font-medium text-[#DAF1DE]">
                      ({quizResults.correctCount} / {quizResults.totalQuestions} correct)
                    </span>
                  </div>
                  <p className="text-xs text-[#8EB69B] mt-1">
                    {quizResults.score >= 80
                      ? 'Great job! This subject has been updated to your strong topics.'
                      : quizResults.score >= 50
                      ? 'Solid effort! Keep reviewing materials to improve your mastery.'
                      : 'Needs review. This subject has been flagged in your weak topics for extra study.'}
                  </p>
                </div>

                <button
                  onClick={handleResetQuiz}
                  className="px-6 py-3 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer hover:shadow-lg shrink-0"
                  style={{ background: 'linear-gradient(135deg, #A8D4DC 0%, #4EC9D4 100%)', color: '#040D0E', boxShadow: '0 0 15px rgba(168,212,220,0.2)' }}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                  <span>Take Another Quiz</span>
                </button>
              </div>

              {/* Individual Question Results */}
              <div className="flex flex-col gap-6">
                <h3 className="font-jakarta font-bold text-lg text-[#DAF1DE]">Detailed Results</h3>

                {quizResults.results.map((resItem, idx) => (
                  <div
                    key={idx}
                    className="p-6 rounded-2xl flex flex-col gap-4"
                    style={{
                      backgroundColor: 'rgba(6, 14, 16, 0.5)',
                      border: resItem.isCorrect ? '1px solid rgba(74, 222, 128, 0.2)' : '1px solid rgba(248, 113, 113, 0.2)',
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                            resItem.isCorrect ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                          }`}
                        >
                          {resItem.isCorrect ? '✓' : '✕'}
                        </div>
                        <h4 className="font-jakarta font-semibold text-base text-[#DAF1DE] pt-0.5">
                          {idx + 1}. {resItem.question}
                        </h4>
                      </div>

                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${
                          resItem.isCorrect
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {resItem.isCorrect ? 'Correct' : 'Incorrect'}
                      </span>
                    </div>

                    <div className="flex flex-col gap-2 pl-0 md:pl-10 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-[#8EB69B] w-28 shrink-0">Your Answer:</span>
                        <span className={`font-medium ${resItem.isCorrect ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {resItem.userAnswer || 'None selected'}
                        </span>
                      </div>

                      {!resItem.isCorrect && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-[#8EB69B] w-28 shrink-0">Correct Answer:</span>
                          <span className="font-medium text-emerald-400">{resItem.correctAnswer}</span>
                        </div>
                      )}

                      {/* Explanation box */}
                      <div className="mt-2 p-3.5 rounded-xl bg-[#0A1A1B] border border-white/5 text-xs text-[#8EB69B] leading-relaxed">
                        <span className="font-semibold text-[#A8D4DC] block mb-1">Explanation:</span>
                        {resItem.explanation}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* SECTION 6: EXAM SIMULATOR CARD */}
        <div
          style={{
            background: 'linear-gradient(145deg, #180a1c 0%, #0a1720 100%)',
            border: '1px solid rgba(244,63,94,0.2)',
          }}
          className="rounded-3xl p-6 md:p-8 flex flex-col gap-6 w-full"
        >
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg, #501328 0%, #881337 100%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fda4af' }}>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-jakarta font-bold text-xl" style={{ color: '#DAF1DE' }}>AI Exam Simulator</h2>
                  <span className="text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    15 Questions • Timed Mock Exam
                  </span>
                </div>
                <p className="text-xs text-[#8EB69B]">Simulate a full timed exam environment with comprehensive scoring and readiness evaluation</p>
              </div>
            </div>

            {/* View Mode Badges */}
            {examViewMode === 'taking' && (
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                </span>
                <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/20">
                  Exam Live ({examUserAnswers.filter(a => a !== '').length} / {examQuestions.length} answered)
                </span>
              </div>
            )}
            {examViewMode === 'results' && (
              <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/20">
                Exam Evaluation Completed
              </span>
            )}
          </div>

          {/* SETUP MODE */}
          {examViewMode === 'setup' && (
            <div className="flex flex-col gap-6 my-2">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 rounded-2xl" style={{ backgroundColor: 'rgba(6, 14, 16, 0.6)', border: '1px solid rgba(244,63,94,0.15)' }}>
                <div className="flex flex-col gap-1 max-w-md">
                  <h3 className="font-jakarta font-semibold text-base text-[#DAF1DE]">Ready for a full Mock Exam?</h3>
                  <p className="text-xs text-[#8EB69B]">Generate 15 comprehensive multiple-choice questions covering all uploaded study materials with a 20-minute timer limit.</p>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  {/* Difficulty Selector */}
                  <div className="flex items-center gap-2">
                    <label htmlFor="exam-difficulty" className="text-xs font-medium text-[#8EB69B]">Difficulty:</label>
                    <select
                      id="exam-difficulty"
                      value={examDifficulty}
                      onChange={(e) => setExamDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
                      disabled={examLoading}
                      style={{ backgroundColor: '#0A1A1B', border: '1px solid rgba(244,63,94,0.3)', color: '#DAF1DE' }}
                      className="px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:border-rose-400 cursor-pointer"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>

                  {/* Start Button */}
                  <button
                    onClick={handleStartExam}
                    disabled={examLoading}
                    className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer hover:shadow-lg"
                    style={{ background: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)', color: '#ffffff', boxShadow: '0 0 15px rgba(244,63,94,0.3)' }}
                  >
                    {examLoading ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                        <span>Preparing your exam...</span>
                      </>
                    ) : (
                      <>
                        <span>Start Mock Exam</span>
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {examError && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2">
                  <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                  <span>{examError}</span>
                </div>
              )}
            </div>
          )}

          {/* TAKING MODE */}
          {examViewMode === 'taking' && (
            <div className="flex flex-col gap-6 my-2">
              {/* Sticky Timer Banner */}
              <div className="sticky top-4 z-20 flex items-center justify-between p-4 rounded-2xl bg-[#1c080e]/90 border border-rose-500/40 backdrop-blur-md shadow-[0_0_25px_rgba(244,63,94,0.25)] flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                  </span>
                  <div>
                    <span className="font-jakarta font-bold text-sm text-rose-200 block">Exam Simulator in Progress</span>
                    <span className="text-xs text-[#8EB69B]">{examQuestions.length} Questions • Scroll to complete all questions</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-rose-300 font-semibold uppercase tracking-wider">Time Remaining:</span>
                  <div className="px-5 py-2 rounded-xl bg-rose-950/90 border border-rose-500/60 font-mono font-extrabold text-2xl text-rose-400 tracking-wider shadow-[0_0_15px_rgba(244,63,94,0.4)]">
                    {formatTimerMMSS(examRemainingSeconds)}
                  </div>
                </div>
              </div>

              {/* 15 Questions Scrollable Container */}
              <div className="flex flex-col gap-6">
                {examQuestions.map((q, qIndex) => {
                  const selectedAnswer = examUserAnswers[qIndex];
                  return (
                    <div
                      key={qIndex}
                      className="p-6 md:p-7 rounded-2xl flex flex-col gap-4 transition-all hover:border-rose-500/30"
                      style={{ backgroundColor: 'rgba(6, 14, 16, 0.65)', border: '1px solid rgba(244,63,94,0.15)' }}
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-rose-500/15 text-rose-300 font-jakarta font-bold text-xs shrink-0">
                          {qIndex + 1}
                        </span>
                        <h3 className="font-jakarta font-semibold text-base md:text-lg text-[#DAF1DE] pt-0.5">
                          {q.question}
                        </h3>
                      </div>

                      {/* Options Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2 pl-0 md:pl-11">
                        {q.options.map((opt, optIndex) => {
                          const isSelected = selectedAnswer === opt;
                          return (
                            <button
                              key={optIndex}
                              type="button"
                              onClick={() => handleSelectExamOption(qIndex, opt)}
                              className={`p-4 rounded-xl text-sm font-medium text-left flex items-center justify-between gap-3 transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-rose-500/15 border-2 border-rose-400 text-rose-200 shadow-[0_0_15px_rgba(244,63,94,0.2)]'
                                  : 'bg-[#0A1A1B] border border-white/10 text-[#DAF1DE] hover:border-rose-500/30 hover:bg-[#1f0d14]'
                              }`}
                            >
                              <span>{opt}</span>
                              <div
                                className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                                  isSelected ? 'border-rose-400 bg-rose-500' : 'border-slate-600 bg-transparent'
                                }`}
                              >
                                {isSelected && (
                                  <div className="w-2 h-2 rounded-full bg-white" />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {examError && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
                  {examError}
                </div>
              )}

              {/* Submit Exam Actions */}
              <div className="flex items-center justify-between pt-6 border-t border-white/10 flex-wrap gap-4">
                <button
                  type="button"
                  onClick={handleResetExam}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium text-[#8EB69B] hover:text-[#DAF1DE] transition-colors"
                >
                  Cancel Exam
                </button>

                <button
                  type="button"
                  onClick={() => handleSubmitExam()}
                  disabled={submittingExam}
                  className="px-8 py-3.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer hover:shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)', color: '#ffffff', boxShadow: '0 0 20px rgba(244,63,94,0.3)' }}
                >
                  {submittingExam ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                      <span>Submitting Exam...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Exam</span>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* RESULTS MODE */}
          {examViewMode === 'results' && examResults && (
            <div className="flex flex-col gap-8 my-2">
              {/* Overall Score & Readiness Header */}
              <div
                className="p-8 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left"
                style={{ backgroundColor: 'rgba(6, 14, 16, 0.7)', border: '1px solid rgba(244,63,94,0.25)' }}
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-4 justify-center md:justify-start flex-wrap">
                    <span className="text-xs uppercase tracking-wider font-semibold text-[#8EB69B]">Mock Exam Score</span>
                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/20">
                      ⏱ Time Taken: {formatExamTimeTaken(examTimeTakenSeconds)}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-3 justify-center md:justify-start">
                    <span
                      className={`text-5xl font-extrabold font-jakarta ${
                        examResults.score >= 80
                          ? 'text-emerald-400'
                          : examResults.score >= 50
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {examResults.score}%
                    </span>
                    <span className="text-sm font-medium text-[#DAF1DE]">
                      ({examResults.correctCount} / {examResults.totalQuestions} correct)
                    </span>
                  </div>

                  {/* Readiness Banner */}
                  <div
                    className={`mt-1 p-3.5 rounded-xl border flex items-center gap-3 text-xs font-semibold ${
                      examResults.score >= 80
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : examResults.score >= 50
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    }`}
                  >
                    <span className="text-base">
                      {examResults.score >= 80 ? '🎯' : examResults.score >= 50 ? '📈' : '⚠️'}
                    </span>
                    <span>
                      {examResults.score >= 80
                        ? "Exam Readiness: You're ready! Excellent overall mastery across all topics."
                        : examResults.score >= 50
                        ? "Exam Readiness: Getting there, review your weak areas before exam day."
                        : "Exam Readiness: More preparation needed. Focus on foundational materials and retake."}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleResetExam}
                  className="px-6 py-3 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer hover:shadow-lg shrink-0"
                  style={{ background: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)', color: '#ffffff', boxShadow: '0 0 15px rgba(244,63,94,0.3)' }}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                  <span>Take Another Mock Exam</span>
                </button>
              </div>

              {/* Detailed Breakdown */}
              <div className="flex flex-col gap-6">
                <h3 className="font-jakarta font-bold text-lg text-[#DAF1DE]">Exam Detailed Results</h3>

                {examResults.results.map((resItem, idx) => (
                  <div
                    key={idx}
                    className="p-6 rounded-2xl flex flex-col gap-4"
                    style={{
                      backgroundColor: 'rgba(6, 14, 16, 0.5)',
                      border: resItem.isCorrect ? '1px solid rgba(74, 222, 128, 0.2)' : '1px solid rgba(248, 113, 113, 0.2)',
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                            resItem.isCorrect ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                          }`}
                        >
                          {resItem.isCorrect ? '✓' : '✕'}
                        </div>
                        <h4 className="font-jakarta font-semibold text-base text-[#DAF1DE] pt-0.5">
                          {idx + 1}. {resItem.question}
                        </h4>
                      </div>

                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${
                          resItem.isCorrect
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {resItem.isCorrect ? 'Correct' : 'Incorrect'}
                      </span>
                    </div>

                    <div className="flex flex-col gap-2 pl-0 md:pl-10 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-[#8EB69B] w-28 shrink-0">Your Answer:</span>
                        <span className={`font-medium ${resItem.isCorrect ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {resItem.userAnswer || 'None selected'}
                        </span>
                      </div>

                      {!resItem.isCorrect && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-[#8EB69B] w-28 shrink-0">Correct Answer:</span>
                          <span className="font-medium text-emerald-400">{resItem.correctAnswer}</span>
                        </div>
                      )}

                      {/* Explanation Box */}
                      <div className="mt-2 p-3.5 rounded-xl bg-[#0A1A1B] border border-white/5 text-xs text-[#8EB69B] leading-relaxed">
                        <span className="font-semibold text-[#A8D4DC] block mb-1">Explanation:</span>
                        {resItem.explanation}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudySubject;
