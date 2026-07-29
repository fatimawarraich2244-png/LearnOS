import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
// @ts-ignore
import API from '../../api/axios';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import { sanitizeTextForPDF } from '../../utils/pdfSanitizer';
import ReactMarkdown from 'react-markdown';
import {
  Clock,
  Play,
  Pause,
  RotateCcw,
  Check,
  Brain,
  Calendar,
  Download,
  UploadCloud,
  FileText,
  Trash2,
  MessageSquare,
  Send,
  Sparkles,
  ArrowLeft,
  GraduationCap,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Trophy,
  Award,
} from 'lucide-react';

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
  levelBadge?: string;
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

interface QuizHistoryItem {
  _id: string;
  score: number;
  difficulty: string;
  examMode: boolean;
  timeTakenSeconds?: number;
  topic?: string;
  questions: QuizQuestion[];
  takenAt: string;
  createdAt?: string;
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
  const [, setUploadStatus] = useState<{ type: 'uploading' | 'success' | 'error'; message: string } | null>(null);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [, setIsStreaming] = useState(false);
  const [isConfusionMode, setIsConfusionMode] = useState(false);
  const [isFeynmanMode, setIsFeynmanMode] = useState(false);
  const [feynmanStep, setFeynmanStep] = useState<1 | 2>(1);
  const [feynmanTopic, setFeynmanTopic] = useState('');
  const [feynmanExplanation, setFeynmanExplanation] = useState('');
  type ExplainLevel = 'normal' | 'eli6' | 'highschool' | 'university' | 'exam' | 'interview';
  const [explainLevel, setExplainLevel] = useState<ExplainLevel>('normal');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Voice Teaching
  const [isListening, setIsListening] = useState(false);
  const [speakingMsgIndex, setSpeakingMsgIndex] = useState<number | null>(null);
  const recognitionRef = useRef<any>(null);
  const baseTranscriptRef = useRef<string>('');

  const isSpeechRecognitionSupported =
    typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  // Badge celebration modal
  const [unlockedBadgesModal, setUnlockedBadgesModal] = useState<string[] | null>(null);

  // Quiz state
  const [quizDifficulty, setQuizDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [selectedQuizTopic, setSelectedQuizTopic] = useState('');
  const [quizViewMode, setQuizViewMode] = useState<QuizViewMode>('setup');
  const [quizLoading, setQuizLoading] = useState(false);
  const [, setQuizError] = useState('');
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  const [quizResults, setQuizResults] = useState<QuizResultsData | null>(null);

  // Exam Simulator state
  type ExamViewMode = 'setup' | 'taking' | 'results';
  const [examDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [selectedExamTopic] = useState('');
  const [, setExamViewMode] = useState<ExamViewMode>('setup');
  const [examLoading, setExamLoading] = useState(false);
  const [, setExamError] = useState('');
  const [examQuestions, setExamQuestions] = useState<QuizQuestion[]>([]);
  const [, setExamUserAnswers] = useState<string[]>([]);
  const [examUserAnswers] = useState<string[]>([]);
  const [, setSubmittingExam] = useState(false);
  const [, setExamResults] = useState<QuizResultsData | null>(null);

  // Quiz History
  const [, setQuizHistory] = useState<QuizHistoryItem[]>([]);
  const [, setHistoryLoading] = useState(false);

  // Timer state for Exam Simulator
  const [examTimeRemaining, setExamTimeRemaining] = useState<number>(0);
  const examTimerIntervalRef = useRef<any>(null);

  const triggerConfettiEffect = () => {
    try {
      const end = Date.now() + 1500;
      const colors = ['#2E7C87', '#1E3A4A', '#F0F4F7', '#fbbf24'];
      (function frame() {
        confetti({ particleCount: 6, angle: 60, spread: 60, origin: { x: 0 }, colors });
        confetti({ particleCount: 6, angle: 120, spread: 60, origin: { x: 1 }, colors });
        if (Date.now() < end) requestAnimationFrame(frame);
      })();
    } catch (e) {
      console.error(e);
    }
  };

  // Timer State
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [savingTimer, setSavingTimer] = useState(false);
  const [, setTimerMessage] = useState<{ type: 'info' | 'success' | 'error'; text: string } | null>(null);
  const timerIntervalRef = useRef<any>(null);

  // Knowledge Map state
  const [knowledgeMapData, setKnowledgeMapData] = useState<KnowledgeMapData | null>(
    initialSubject?.knowledgeMap || null
  );
  const [generatingMap, setGeneratingMap] = useState(false);
  const [, setMapError] = useState('');

  // Study Planner state
  const [studyPlan, setStudyPlan] = useState<StudyPlanData | null>(null);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [planError, setPlanError] = useState('');
  const [examDateInput, setExamDateInput] = useState('');
  const [hoursPerDayInput, setHoursPerDayInput] = useState<number>(2);
  const [showPlanSetup, setShowPlanSetup] = useState(false);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatLoading]);

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (examTimerIntervalRef.current) clearInterval(examTimerIntervalRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (subject?.knowledgeMap) setKnowledgeMapData(subject.knowledgeMap);
  }, [subject]);

  useEffect(() => {
    const fetchSubjectDetails = async () => {
      if (!subjectId) return;
      try {
        const res = await API.get(`/subjects/single/${subjectId}`);
        setSubject(res.data);
        if (res.data?.knowledgeMap) setKnowledgeMapData(res.data.knowledgeMap);
      } catch (err) {
        console.error('Failed to fetch subject details', err);
      } finally {
        setLoadingSubject(false);
      }
    };
    fetchSubjectDetails();
  }, [subjectId]);

  useEffect(() => {
    const fetchStudyPlan = async () => {
      if (!subjectId) return;
      try {
        const res = await API.get(`/planner/${subjectId}`);
        if (res.data) setStudyPlan(res.data);
      } catch (err) {
        console.error('Failed to fetch study plan', err);
      }
    };
    fetchStudyPlan();
  }, [subjectId]);

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

  useEffect(() => {
    const fetchChatHistory = async () => {
      if (!subjectId) return;
      try {
        const res = await API.get(`/chat/${subjectId}`);
        setMessages(res.data);
      } catch (err: any) {
        console.error('Failed to fetch chat history', err);
      }
    };
    fetchChatHistory();
    fetchQuizHistory();
  }, [subjectId]);

  const fetchQuizHistory = async () => {
    if (!subjectId) return;
    setHistoryLoading(true);
    try {
      const res = await API.get(`/quiz/history/${subjectId}`);
      setQuizHistory(res.data);
    } catch (err: any) {
      console.error('Failed to fetch quiz history', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !subjectId) return;
    setIsUploading(true);
    setUploadStatus({ type: 'uploading', message: 'Uploading and parsing document...' });
    const formData = new FormData();
    formData.append('file', file);
    formData.append('subjectId', subjectId);
    try {
      const res = await API.post('/materials/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      // Backend returns the material object directly at top-level (res.data),
      // not nested as res.data.material — support both shapes defensively.
      const uploaded: MaterialItem = res.data?.material ?? res.data;
      if (uploaded && uploaded._id) {
        setMaterials((prev) => [uploaded, ...prev]);
      } else {
        // Response shape unrecognised — refresh the list from the server
        const refreshed = await API.get(`/materials/${subjectId}`);
        setMaterials(refreshed.data ?? []);
      }
      setUploadStatus({ type: 'success', message: 'Material processed and saved successfully!' });
      toast.success('Material uploaded successfully');
      e.target.value = '';
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to upload material';
      setUploadStatus({ type: 'error', message: msg });
      toast.error(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteMaterial = async (id: string) => {
    try {
      await API.delete(`/materials/${id}`);
      setMaterials((prev) => prev.filter((m) => m._id !== id));
      toast.success('Material deleted successfully');
    } catch (err: any) {
      toast.error('Failed to delete material');
    }
  };

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentQuestion.trim() || !subjectId || chatLoading) return;
    const questionText = currentQuestion.trim();
    setCurrentQuestion('');
    setChatLoading(true);
    setIsStreaming(true);

    const levelLabels: Record<ExplainLevel, string> = {
      normal: '',
      eli6: 'ELI6',
      highschool: 'High School',
      university: 'University',
      exam: 'Exam Answer',
      interview: 'Interview Answer',
    };

    const assistantBadge = explainLevel !== 'normal' ? levelLabels[explainLevel] : undefined;

    const updatedMessages: ChatMessage[] = [
      ...messages,
      { role: 'user', content: questionText },
      { role: 'assistant', content: '', levelBadge: assistantBadge },
    ];
    setMessages(updatedMessages);

    try {
      const token = localStorage.getItem('token');
      const baseURL = API.defaults.baseURL || 'http://localhost:5000/api';

      let endpoint = '/chat/ask';
      let bodyPayload: any = { subjectId, question: questionText };

      if (isConfusionMode) {
        endpoint = '/chat/confusion';
        bodyPayload = { subjectId, confusedTopic: questionText };
      } else if (explainLevel !== 'normal') {
        endpoint = '/chat/explain-level';
        bodyPayload = { subjectId, topic: questionText, level: explainLevel };
      }

      const response = await fetch(`${baseURL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(bodyPayload),
      });

      if (!response.ok) {
        let errMessage = 'Failed to fetch AI response';
        try {
          const errData = await response.json();
          errMessage = errData.message || errMessage;
        } catch (_) {}
        throw new Error(errMessage);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('ReadableStream not supported by browser.');

      const decoder = new TextDecoder('utf-8');
      let done = false;
      let buffer = '';

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          buffer += decoder.decode(value, { stream: !done });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data:')) continue;
            if (trimmed === 'data: [DONE]') { done = true; break; }
            try {
              const jsonStr = trimmed.replace(/^data:\s*/, '');
              const data = JSON.parse(jsonStr);
              if (data.content) {
                setMessages((prev) => {
                  const newMsgs = [...prev];
                  const lastIdx = newMsgs.length - 1;
                  if (lastIdx >= 0 && newMsgs[lastIdx].role === 'assistant') {
                    newMsgs[lastIdx] = {
                      ...newMsgs[lastIdx],
                      content: newMsgs[lastIdx].content + data.content,
                    };
                  }
                  return newMsgs;
                });
              }
            } catch (err) {
              console.error('Error parsing SSE:', err);
            }
          }
        }
      }
    } catch (err: any) {
      setMessages((prev) => {
        const newMsgs = [...prev];
        const lastIdx = newMsgs.length - 1;
        if (lastIdx >= 0 && newMsgs[lastIdx].role === 'assistant' && !newMsgs[lastIdx].content) {
          newMsgs[lastIdx] = { role: 'assistant', content: err.message || 'Error occurred.' };
        }
        return newMsgs;
      });
    } finally {
      setChatLoading(false);
      setIsStreaming(false);
    }
  };

  const handleStartFeynman = (topicToTeach: string) => {
    if (!topicToTeach.trim()) return;
    setFeynmanTopic(topicToTeach.trim());
    setFeynmanStep(2);
    setFeynmanExplanation('');
  };

  const handleEvaluateFeynman = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feynmanTopic || !feynmanExplanation.trim() || !subjectId || chatLoading) return;
    setChatLoading(true);
    setIsStreaming(true);

    const userTeachingText = `Teaching: ${feynmanTopic}\n\nExplanation:\n${feynmanExplanation.trim()}`;
    const updatedMessages: ChatMessage[] = [
      ...messages,
      { role: 'user', content: userTeachingText },
      { role: 'assistant', content: '', levelBadge: 'Feynman Evaluation' },
    ];
    setMessages(updatedMessages);

    try {
      const token = localStorage.getItem('token');
      const baseURL = API.defaults.baseURL || 'http://localhost:5000/api';
      const response = await fetch(`${baseURL}/chat/feynman`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          subjectId,
          topic: feynmanTopic,
          studentExplanation: feynmanExplanation.trim(),
        }),
      });

      if (!response.ok) {
        let errMessage = 'Failed to evaluate explanation';
        try {
          const errData = await response.json();
          errMessage = errData.message || errMessage;
        } catch (_) {}
        throw new Error(errMessage);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Stream reader error');

      const decoder = new TextDecoder('utf-8');
      let done = false;
      let buffer = '';

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          buffer += decoder.decode(value, { stream: !done });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data:')) continue;
            if (trimmed === 'data: [DONE]') { done = true; break; }
            try {
              const jsonStr = trimmed.replace(/^data:\s*/, '');
              const data = JSON.parse(jsonStr);
              if (data.content) {
                setMessages((prev) => {
                  const newMsgs = [...prev];
                  const lastIdx = newMsgs.length - 1;
                  if (lastIdx >= 0 && newMsgs[lastIdx].role === 'assistant') {
                    newMsgs[lastIdx] = {
                      ...newMsgs[lastIdx],
                      content: newMsgs[lastIdx].content + data.content,
                    };
                  }
                  return newMsgs;
                });
              }
            } catch (err) {}
          }
        }
      }

      setFeynmanExplanation('');
      setFeynmanTopic('');
      setFeynmanStep(1);
    } catch (err: any) {
      setMessages((prev) => {
        const newMsgs = [...prev];
        const lastIdx = newMsgs.length - 1;
        if (lastIdx >= 0 && newMsgs[lastIdx].role === 'assistant' && !newMsgs[lastIdx].content) {
          newMsgs[lastIdx] = { role: 'assistant', content: err.message || 'Error evaluating explanation.' };
        }
        return newMsgs;
      });
    } finally {
      setChatLoading(false);
      setIsStreaming(false);
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
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setSpeakingMsgIndex(null);
    }
    if (!isFeynmanMode) {
      setIsFeynmanMode(true);
      setIsConfusionMode(false);
      setFeynmanStep(1);
    } else {
      setIsFeynmanMode(false);
    }
  };

  const handleToggleVoiceInput = () => {
    if (!isSpeechRecognitionSupported) {
      toast.error('Voice input is not supported in this browser. Please try Chrome or Edge.');
      return;
    }
    if (isListening) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    baseTranscriptRef.current = isFeynmanMode ? feynmanExplanation : currentQuestion;

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';
      for (let i = 0; i < event.results.length; ++i) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
        else interimTranscript += event.results[i][0].transcript;
      }
      const combined = (baseTranscriptRef.current ? baseTranscriptRef.current + ' ' : '') + finalTranscript + interimTranscript;
      if (isFeynmanMode) setFeynmanExplanation(combined);
      else setCurrentQuestion(combined);
    };

    recognition.onerror = (event: any) => {
      setIsListening(false);
      if (event.error === 'not-allowed' || event.error === 'permission-denied') {
        toast.error('Microphone access denied. Please allow microphone permissions in your browser.');
      } else if (event.error === 'no-speech') {
        toast.error('No speech detected. Please try speaking again.');
      } else if (event.error === 'audio-capture') {
        toast.error('No microphone detected. Please connect a microphone.');
      } else {
        toast.error(`Voice input error: ${event.error}`);
      }
    };

    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;

    try {
      recognition.start();
      setIsListening(true);
    } catch (err) {
      console.error('Failed voice input:', err);
    }
  };

  const cleanMarkdownForTTS = (md: string) => {
    return md
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/#{1,6}\s+/g, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/^[\s*->+-]+/gm, '')
      .trim();
  };

  const handleReadAloud = (text: string, msgIndex: number) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      toast.error('Text-to-speech is not supported in this browser.');
      return;
    }
    if (speakingMsgIndex === msgIndex) {
      window.speechSynthesis.cancel();
      setSpeakingMsgIndex(null);
      return;
    }
    window.speechSynthesis.cancel();
    const cleanText = cleanMarkdownForTTS(text);
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.onend = () => setSpeakingMsgIndex(null);
    utterance.onerror = () => setSpeakingMsgIndex(null);
    setSpeakingMsgIndex(msgIndex);
    window.speechSynthesis.speak(utterance);
  };

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
      toast.error('Study for at least 1 minute to log time');
      return;
    }
    if (!subjectId) return;
    setSavingTimer(true);
    setTimerMessage(null);

    try {
      await API.post(`/subjects/${subjectId}/log-time`, { minutes });
      const msg = `Logged ${minutes} minute${minutes > 1 ? 's' : ''} of study time!`;
      setTimerMessage({ type: 'success', text: msg });
      toast.success(msg);
      setElapsedSeconds(0);
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Failed to log study time';
      setTimerMessage({ type: 'error', text: errMsg });
      toast.error(errMsg);
    } finally {
      setSavingTimer(false);
    }
  };

  const handleGenerateKnowledgeMap = async () => {
    if (!subjectId) return;
    setGeneratingMap(true);
    setMapError('');
    try {
      const res = await API.post(`/subjects/${subjectId}/knowledge-map`);
      const mapData = res.data.knowledgeMap;
      setKnowledgeMapData(mapData);
      setSubject((prev) => (prev ? { ...prev, knowledgeMap: mapData } : prev));
      toast.success('Knowledge Map generated successfully!');
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Failed to generate Knowledge Map.';
      setMapError(errMsg);
      toast.error(errMsg);
    } finally {
      setGeneratingMap(false);
    }
  };

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
      toast.success('AI Study Plan generated successfully!');
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Failed to generate study plan.';
      setPlanError(errMsg);
      toast.error(errMsg);
    } finally {
      setGeneratingPlan(false);
    }
  };

  const handleExportPlanPDF = () => {
    if (!studyPlan || !studyPlan.schedule || studyPlan.schedule.length === 0) return;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const subjectName = subject?.name || 'Subject';
    const examDateStr = new Date(studyPlan.examDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    const cleanTitle = sanitizeTextForPDF(`AI Study Plan - ${subjectName}`);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(0, 128, 128);
    doc.text(cleanTitle, 14, 20);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(90, 90, 90);
    doc.text(`Target Exam Date: ${examDateStr}  |  Daily Goal: ${studyPlan.hoursPerDay} hours/day`, 14, 28);

    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(14, 32, 196, 32);

    let y = 40;
    studyPlan.schedule.forEach((item, idx) => {
      if (y > 260) {
        doc.addPage();
        y = 20;
      }
      const itemDate = new Date(item.date).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 58, 74);
      doc.text(`Day ${idx + 1} (${itemDate}) - ${item.durationMinutes} mins`, 14, y);
      y += 6;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(70, 70, 70);
      const rawTopics = item.topics && item.topics.length > 0 ? item.topics.join(', ') : 'General study & review';
      const cleanTopics = sanitizeTextForPDF(`Topics: ${rawTopics}`);
      const splitTopics = doc.splitTextToSize(cleanTopics, 175);
      doc.text(splitTopics, 18, y);
      y += splitTopics.length * 5 + 4;
    });

    const sanitizedSubj = subjectName.replace(/[^a-zA-Z0-9]/g, '_');
    doc.save(`StudyPlan-${sanitizedSubj}.pdf`);
    toast.success('Study Plan PDF exported!');
  };

  const getDaysUntilExam = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exam = new Date(dateStr);
    exam.setHours(0, 0, 0, 0);
    const diff = exam.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const handleGenerateQuiz = async () => {
    if (!subjectId) return;
    setQuizLoading(true);
    setQuizError('');
    try {
      const payload: any = { subjectId, difficulty: quizDifficulty };
      if (selectedQuizTopic) payload.topic = selectedQuizTopic;
      const res = await API.post('/quiz/generate', payload);
      const questions: QuizQuestion[] = res.data.questions || [];
      setQuizQuestions(questions);
      setUserAnswers(new Array(questions.length).fill(''));
      setQuizViewMode('taking');
      toast.success('Quiz generated!');
    } catch (err: any) {
      setQuizError(err.response?.data?.message || 'Failed to generate quiz.');
      toast.error('Failed to generate quiz');
    } finally {
      setQuizLoading(false);
    }
  };

  const handleSelectQuizOption = (questionIndex: number, option: string) => {
    setUserAnswers((prev) => {
      const next = [...prev];
      next[questionIndex] = option;
      console.log('[DEBUG Handoff 1 Frontend Option Selected]', { questionIndex, option, updatedAnswers: next });
      return next;
    });
  };

  const handleSubmitQuiz = async () => {
    if (!subjectId) return;
    setSubmittingQuiz(true);
    const payload = {
      subjectId,
      difficulty: quizDifficulty,
      topic: selectedQuizTopic || undefined,
      questions: quizQuestions,
      userAnswers: userAnswers,
    };
    console.log('[DEBUG Handoff 2 Frontend Submit Quiz Payload]', payload);
    try {
      const res = await API.post('/quiz/submit', payload);
      console.log('[DEBUG Handoff 2 Frontend Submit Quiz Response]', res.data);
      setQuizResults(res.data);
      setQuizViewMode('results');
      if (res.data.newBadges && Array.isArray(res.data.newBadges) && res.data.newBadges.length > 0) {
        setUnlockedBadgesModal(res.data.newBadges);
        triggerConfettiEffect();
      } else if (res.data.score >= 70) {
        triggerConfettiEffect();
      }
      fetchQuizHistory();
      toast.success(`Quiz completed! Score: ${res.data.score}%`);
    } catch (err: any) {
      console.error('[DEBUG Frontend Submit Quiz Error]', err.response?.data || err.message);
      toast.error('Failed to submit quiz');
    } finally {
      setSubmittingQuiz(false);
    }
  };

  const handleGenerateExam = async () => {
    if (!subjectId) return;
    setExamLoading(true);
    setExamError('');
    try {
      const payload: any = { subjectId, difficulty: examDifficulty, examMode: true };
      if (selectedExamTopic) payload.topic = selectedExamTopic;
      const res = await API.post('/quiz/generate', payload);
      const questions: QuizQuestion[] = res.data.questions || [];
      setExamQuestions(questions);
      setExamUserAnswers(new Array(questions.length).fill(''));
      setQuizQuestions(questions);
      setUserAnswers(new Array(questions.length).fill(''));
      setExamViewMode('taking');
      setQuizViewMode('taking');
      setExamTimeRemaining(questions.length * 60);

      if (examTimerIntervalRef.current) clearInterval(examTimerIntervalRef.current);
      examTimerIntervalRef.current = setInterval(() => {
        setExamTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(examTimerIntervalRef.current);
            handleSubmitExamAuto();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      toast.success('Exam session started!');
    } catch (err: any) {
      setExamError(err.response?.data?.message || 'Failed to start exam');
      toast.error('Failed to start exam');
    } finally {
      setExamLoading(false);
    }
  };

  const handleSubmitExamAuto = async () => {
    if (examTimerIntervalRef.current) clearInterval(examTimerIntervalRef.current);
    toast.error('Exam time expired! Submitting answers automatically...');
    handleSubmitExam();
  };

  const handleSubmitExam = async () => {
    if (examTimerIntervalRef.current) clearInterval(examTimerIntervalRef.current);
    if (!subjectId) return;
    setSubmittingExam(true);
    const payload = {
      subjectId,
      difficulty: examDifficulty,
      topic: selectedExamTopic || undefined,
      questions: examQuestions.length > 0 ? examQuestions : quizQuestions,
      userAnswers: examUserAnswers.some((a) => a !== '') ? examUserAnswers : userAnswers,
      examMode: true,
    };
    console.log('[DEBUG Handoff 2 Frontend Submit Exam Payload]', payload);
    try {
      const res = await API.post('/quiz/submit', payload);
      console.log('[DEBUG Handoff 2 Frontend Submit Exam Response]', res.data);
      setExamResults(res.data);
      setExamViewMode('results');
      if (res.data.newBadges && Array.isArray(res.data.newBadges) && res.data.newBadges.length > 0) {
        setUnlockedBadgesModal(res.data.newBadges);
        triggerConfettiEffect();
      } else if (res.data.score >= 70) {
        triggerConfettiEffect();
      }
      fetchQuizHistory();
      toast.success(`Exam completed! Score: ${res.data.score}%`);
    } catch (err: any) {
      console.error('[DEBUG Frontend Submit Exam Error]', err.response?.data || err.message);
      toast.error('Failed to submit exam');
    } finally {
      setSubmittingExam(false);
    }
  };

  const formatElapsedTime = (totalSecs: number) => {
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    const pad = (num: number) => num.toString().padStart(2, '0');
    return hours > 0 ? `${pad(hours)}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`;
  };

  const getKnowledgeMapTopicOptions = () => {
    const map = subject?.knowledgeMap || initialSubject?.knowledgeMap;
    if (!map || !map.topics || !Array.isArray(map.topics)) return [];
    const list: string[] = [];
    map.topics.forEach((t) => {
      if (t.name && !list.includes(t.name)) list.push(t.name);
      if (t.subtopics && Array.isArray(t.subtopics)) {
        t.subtopics.forEach((st) => {
          if (st && !list.includes(st)) list.push(st);
        });
      }
    });
    return list;
  };

  const backLink = subject?.semesterId ? `/semesters/${subject.semesterId}` : '/dashboard';
  const hasKnowledgeMap = !!(knowledgeMapData?.topics && knowledgeMapData.topics.length > 0);

  return (
    <div className="min-h-screen font-sans flex bg-[#F0F4F7] text-[#1E3A4A]">
      {/* ── Persistent Sidebar Navigation ── */}
      <Sidebar />

      {/* ── Main Content Area ── */}
      <main className="flex-1 ml-0 md:ml-64 pt-14 md:pt-0 min-h-screen flex flex-col overflow-y-auto bg-[#F0F4F7]">
        <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-4 sm:gap-6">

          {/* Top Navigation & Page Title */}
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-[#E5E7EB] gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-1.5 text-xs text-[#6B7B85] hover:text-[#2E7C87] font-medium no-underline transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Dashboard</span>
                </Link>
                <span className="text-xs text-[#6B7B85]">•</span>
                <Link
                  to={backLink}
                  className="inline-flex items-center gap-1 text-xs text-[#2E7C87] font-semibold hover:underline no-underline"
                >
                  <span>Semester Subjects</span>
                </Link>
              </div>
              <h1 className="font-sans font-semibold text-[#1E3A4A] text-lg md:text-xl tracking-tight">
                {loadingSubject ? 'Loading Subject...' : subject?.name || 'Subject Workspace'}
              </h1>
              <p className="text-sm text-[#6B7B85] mt-0.5 font-normal">
                Upload materials, ask AI questions, track study time, build knowledge maps, and take quizzes.
              </p>
            </div>
          </div>

          {/* ── SECTION 1: STUDY SESSION TIMER ── */}
          <div className="bg-white rounded-2xl p-6 border border-[#E5E7EB] flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#2E7C87]/10 text-[#2E7C87] flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-sans font-semibold text-base text-[#1E3A4A]">Study Session Timer</h2>
                <p className="text-xs text-[#6B7B85]">Track and log active study duration for this subject</p>
              </div>
            </div>

            <div className="flex items-center gap-4 flex-wrap justify-center md:justify-end">
              {/* Monospace Tabular Numerals Timer Display */}
              <div className="px-5 py-2 rounded-xl bg-[#F0F4F7] border border-[#E5E7EB] flex items-center justify-center min-w-[130px]">
                <span className="font-mono text-2xl md:text-3xl font-semibold text-[#1E3A4A] [font-variant-numeric:tabular-nums]">
                  {formatElapsedTime(elapsedSeconds)}
                </span>
              </div>

              {/* Start / Pause Button */}
              <button
                type="button"
                onClick={handleToggleTimer}
                className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  isTimerRunning
                    ? 'bg-amber-100 text-amber-800 border border-amber-200 hover:bg-amber-200'
                    : 'bg-[#2E7C87] text-white hover:bg-[#256770]'
                }`}
              >
                {isTimerRunning ? (
                  <>
                    <Pause className="w-3.5 h-3.5" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>Start Session</span>
                  </>
                )}
              </button>

              {/* Save & Finish Button */}
              <button
                type="button"
                onClick={handleSaveTimer}
                disabled={savingTimer || elapsedSeconds === 0}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#1E3A4A] hover:bg-[#152B37] disabled:opacity-40 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save Log</span>
              </button>
            </div>
          </div>

          {/* ── SECTION 2: AI KNOWLEDGE MAP ── */}
          <div className="bg-white rounded-2xl p-6 border border-[#E5E7EB] flex flex-col gap-6">
            <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-[#E5E7EB]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#2E7C87]/10 text-[#2E7C87] flex items-center justify-center shrink-0">
                  <Brain className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-sans font-semibold text-base text-[#1E3A4A]">AI Knowledge Map</h2>
                  <p className="text-xs text-[#6B7B85]">Structured topic hierarchy derived from uploaded course materials</p>
                </div>
              </div>

              {hasKnowledgeMap && (
                <button
                  type="button"
                  onClick={handleGenerateKnowledgeMap}
                  disabled={generatingMap}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-[#2E7C87] border border-[#2E7C87]/30 hover:bg-[#2E7C87]/10 disabled:opacity-50 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Regenerate Map</span>
                </button>
              )}
            </div>

            {!hasKnowledgeMap ? (
              <div className="flex flex-col items-center justify-center p-8 rounded-xl border border-dashed border-[#E5E7EB] text-center gap-3">
                <Brain className="w-8 h-8 text-[#2E7C87]" />
                <h3 className="font-sans font-semibold text-sm text-[#1E3A4A]">No Knowledge Map Generated Yet</h3>
                <p className="text-xs text-[#6B7B85] max-w-md">
                  Upload your study materials in the materials section below and click to build a topic roadmap.
                </p>
                <button
                  type="button"
                  onClick={handleGenerateKnowledgeMap}
                  disabled={generatingMap}
                  className="mt-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#2E7C87] hover:bg-[#256770] disabled:opacity-50 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{generatingMap ? 'Analyzing Materials...' : 'Generate Knowledge Map'}</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...knowledgeMapData!.topics]
                  .sort((a, b) => (a.order || 0) - (b.order || 0))
                  .map((topic, idx) => (
                    <div key={idx} className="bg-[#F0F4F7] rounded-xl p-4 border border-[#E5E7EB] flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#2E7C87] text-white text-[10px] font-semibold flex items-center justify-center shrink-0">
                          {topic.order ?? idx + 1}
                        </span>
                        <h4 className="font-sans font-semibold text-xs text-[#1E3A4A] truncate">{topic.name}</h4>
                      </div>
                      {topic.subtopics && topic.subtopics.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {topic.subtopics.map((sub, sIdx) => (
                            <span key={sIdx} className="text-[11px] px-2 py-0.5 rounded bg-white border border-[#E5E7EB] text-[#6B7B85] font-normal">
                              {sub}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* ── SECTION 3: AI STUDY PLANNER ── */}
          <div className="bg-white rounded-2xl p-6 border border-[#E5E7EB] flex flex-col gap-6">
            <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-[#E5E7EB]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#2E7C87]/10 text-[#2E7C87] flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-sans font-semibold text-base text-[#1E3A4A]">AI Study Planner</h2>
                  <p className="text-xs text-[#6B7B85]">Day-by-day exam preparation milestone schedule</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {studyPlan && (
                  <>
                    <button
                      type="button"
                      onClick={handleExportPlanPDF}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-[#2E7C87] border border-[#E5E7EB] bg-white hover:bg-[#F0F4F7] transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPlanSetup(!showPlanSetup)}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-[#2E7C87] border border-[#2E7C87]/30 hover:bg-[#2E7C87]/10 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{showPlanSetup ? 'Cancel' : 'Regenerate Plan'}</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Setup Form (when no plan exists or user clicked Regenerate) */}
            {(!studyPlan || showPlanSetup) && (
              <form onSubmit={handleGeneratePlan} className="bg-[#F0F4F7] rounded-xl p-5 border border-[#E5E7EB] flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-sans font-semibold text-sm text-[#1E3A4A]">Configure Exam Parameters</h3>
                  {planError && <p className="text-xs text-red-600 font-medium">{planError}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-[#6B7B85] mb-1">
                      Target Exam Date
                    </label>
                    <input
                      type="date"
                      required
                      value={examDateInput}
                      onChange={(e) => setExamDateInput(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-xs font-medium text-[#1E3A4A] bg-white focus:outline-none focus:border-[#2E7C87]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-[#6B7B85] mb-1">
                      Daily Study Goal (Hours)
                    </label>
                    <input
                      type="number"
                      min="0.5"
                      max="12"
                      step="0.5"
                      required
                      value={hoursPerDayInput}
                      onChange={(e) => setHoursPerDayInput(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-xs font-medium text-[#1E3A4A] bg-white focus:outline-none focus:border-[#2E7C87]"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  {studyPlan && (
                    <button
                      type="button"
                      onClick={() => setShowPlanSetup(false)}
                      className="px-4 py-2 rounded-lg text-xs font-medium text-[#6B7B85] hover:bg-gray-200/60 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={generatingPlan || !examDateInput || !hasKnowledgeMap}
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#2E7C87] hover:bg-[#256770] disabled:opacity-50 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{generatingPlan ? 'Building Schedule...' : 'Generate AI Schedule'}</span>
                  </button>
                </div>
                {!hasKnowledgeMap && (
                  <p className="text-[11px] text-[#6B7B85] italic">
                    Note: Generate a Knowledge Map above first so the AI can sequence your topics.
                  </p>
                )}
              </form>
            )}

            {/* Render Plan Day-by-Day Schedule if present */}
            {studyPlan && studyPlan.schedule && studyPlan.schedule.length > 0 && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between bg-[#F0F4F7] p-4 rounded-xl border border-[#E5E7EB]">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-[#6B7B85]">Exam Date</span>
                      <span className="font-mono text-sm font-semibold text-[#1E3A4A] [font-variant-numeric:tabular-nums]">
                        {new Date(studyPlan.examDate).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 text-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#2E7C87]" />
                      <span className="font-semibold text-[#1E3A4A] font-mono [font-variant-numeric:tabular-nums]">
                        {studyPlan.hoursPerDay} hrs/day
                      </span>
                    </div>
                    {(() => {
                      const daysLeft = getDaysUntilExam(studyPlan.examDate);
                      return (
                        <div className="px-3 py-1 rounded-lg bg-[#1E3A4A] text-white text-xs font-mono font-semibold [font-variant-numeric:tabular-nums]">
                          {daysLeft > 0 ? `${daysLeft} Days Remaining` : daysLeft === 0 ? 'Exam Today!' : 'Past Exam'}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {studyPlan.schedule.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-[#F0F4F7] rounded-xl p-4 border border-[#E5E7EB] flex flex-col justify-between gap-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#2E7C87] uppercase tracking-wide">
                          Day {idx + 1}
                        </span>
                        <span className="font-mono text-[11px] text-[#6B7B85] [font-variant-numeric:tabular-nums]">
                          {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>

                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-semibold text-[#1E3A4A]">Scheduled Topics</span>
                        <div className="flex flex-wrap gap-1.5 mt-0.5">
                          {item.topics && item.topics.length > 0 ? (
                            item.topics.map((top, tIdx) => (
                              <span
                                key={tIdx}
                                className="text-[11px] px-2 py-0.5 rounded bg-white border border-[#E5E7EB] text-[#1E3A4A] font-medium"
                              >
                                {top}
                              </span>
                            ))
                          ) : (
                            <span className="text-[11px] text-[#6B7B85] italic">General Review</span>
                          )}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-[#E5E7EB] flex items-center justify-between text-[11px] text-[#6B7B85]">
                        <span>Goal duration</span>
                        <span className="font-mono font-semibold text-[#1E3A4A] [font-variant-numeric:tabular-nums]">
                          {item.durationMinutes} mins
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── TWO COLUMN GRID: LEFT = MATERIALS, RIGHT = CHAT & QUIZZES ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* LEFT COLUMN: Study Materials (4 cols) */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              <div className="bg-white rounded-2xl p-6 border border-[#E5E7EB] flex flex-col gap-4">
                <div className="flex items-center gap-3 pb-3 border-b border-[#E5E7EB]">
                  <FileText className="w-5 h-5 text-[#2E7C87]" />
                  <div>
                    <h2 className="font-sans font-semibold text-base text-[#1E3A4A]">Course Materials</h2>
                    <p className="text-xs text-[#6B7B85]">Files uploaded for AI indexing</p>
                  </div>
                </div>

                {/* Upload Drop Zone */}
                <div className="relative">
                  <input
                    type="file"
                    id="upload-study-subject"
                    className="hidden"
                    accept=".pdf,.docx,.txt"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                  />
                  <label
                    htmlFor="upload-study-subject"
                    className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border border-dashed border-[#E5E7EB] bg-[#F0F4F7] cursor-pointer hover:border-[#2E7C87] transition-colors text-center"
                  >
                    <UploadCloud className="w-6 h-6 text-[#2E7C87]" />
                    <span className="text-xs font-semibold text-[#1E3A4A]">
                      {isUploading ? 'Uploading...' : 'Click to Upload Material'}
                    </span>
                    <span className="text-[11px] text-[#6B7B85]">PDF, DOCX, TXT</span>
                  </label>
                </div>

                {/* Materials List */}
                <div className="flex flex-col gap-2 mt-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-[#6B7B85]">
                    Uploaded Files ({materials.length})
                  </span>
                  {loadingMaterials ? (
                    <div className="flex justify-center py-4">
                      <div className="animate-spin h-5 w-5 border-2 border-[#2E7C87] border-t-transparent rounded-full" />
                    </div>
                  ) : materials.length === 0 ? (
                    <div className="text-center py-6 text-xs text-[#6B7B85] border border-dashed border-[#E5E7EB] rounded-xl">
                      No materials uploaded yet.
                    </div>
                  ) : (
                    materials.map((mat) => (
                      <div
                        key={mat._id}
                        className="flex items-center justify-between p-3 rounded-lg border border-[#E5E7EB] bg-[#F0F4F7]"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-4 h-4 text-[#2E7C87] shrink-0" />
                          <span className="text-xs font-medium text-[#1E3A4A] truncate">{mat.fileName}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteMaterial(mat._id)}
                          className="p-1 text-[#6B7B85] hover:text-red-600 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: AI Chat & Practice Quizzes (8 cols) */}
            <div className="lg:col-span-8 flex flex-col gap-6">

              {/* AI CHAT CONTAINER */}
              <div className="bg-white rounded-2xl p-6 border border-[#E5E7EB] flex flex-col gap-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB] flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-[#2E7C87]" />
                    <h2 className="font-sans font-semibold text-base text-[#1E3A4A]">AI Study Assistant</h2>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    {/* Explain-at-Level Selector Dropdown */}
                    <select
                      value={explainLevel}
                      onChange={(e) => setExplainLevel(e.target.value as ExplainLevel)}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[#F0F4F7] border border-[#E5E7EB] text-[#1E3A4A] focus:outline-none focus:border-[#2E7C87] cursor-pointer"
                    >
                      <option value="normal">Normal Mode</option>
                      <option value="eli6">Explain Like I'm 6 (ELI6)</option>
                      <option value="highschool">High School Teacher</option>
                      <option value="university">University Level</option>
                      <option value="exam">Model Exam Answer</option>
                      <option value="interview">Technical Interview Answer</option>
                    </select>

                    <button
                      type="button"
                      onClick={toggleConfusionMode}
                      className={`px-3 py-1 rounded-lg font-medium border transition-colors cursor-pointer ${
                        isConfusionMode
                          ? 'bg-purple-50 text-purple-700 border-purple-200 font-semibold'
                          : 'bg-white text-[#6B7B85] border-[#E5E7EB] hover:text-[#1E3A4A]'
                      }`}
                    >
                      Confusion Diagnostic
                    </button>
                    <button
                      type="button"
                      onClick={toggleFeynmanMode}
                      className={`px-3 py-1 rounded-lg font-medium border transition-colors cursor-pointer ${
                        isFeynmanMode
                          ? 'bg-amber-50 text-amber-800 border-amber-200 font-semibold'
                          : 'bg-white text-[#6B7B85] border-[#E5E7EB] hover:text-[#1E3A4A]'
                      }`}
                    >
                      Teach Mode
                    </button>
                  </div>
                </div>

                {/* Feynman Mode Interactive Two-Step Flow */}
                {isFeynmanMode && (
                  <div className="flex flex-col gap-3">
                    {feynmanStep === 1 ? (
                      <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/60 flex flex-col gap-3">
                        <div>
                          <h4 className="font-sans font-semibold text-xs text-amber-900">Feynman Technique: Step 1</h4>
                          <p className="text-xs text-amber-800 mt-0.5">Enter a concept you want to teach to test your understanding.</p>
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="e.g. Binary Search Trees, Photosynthesis, Special Relativity..."
                            value={feynmanTopic}
                            onChange={(e) => setFeynmanTopic(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleStartFeynman(feynmanTopic); }}
                            className="flex-1 px-3 py-1.5 rounded-lg border border-amber-200 bg-white text-xs font-medium text-[#1E3A4A] focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleStartFeynman(feynmanTopic)}
                            disabled={!feynmanTopic.trim()}
                            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 disabled:opacity-50 transition-colors cursor-pointer"
                          >
                            Start Teaching
                          </button>
                        </div>
                      </div>
                    ) : (
                      <form onSubmit={handleEvaluateFeynman} className="p-4 rounded-xl border border-amber-200 bg-amber-50/60 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-sans font-semibold text-xs text-amber-900 flex items-center gap-2">
                            <span>Teaching Concept: <strong className="text-amber-950 font-bold">{feynmanTopic}</strong></span>
                            {isListening && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-semibold animate-pulse">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                                Listening...
                              </span>
                            )}
                          </h4>
                          <button
                            type="button"
                            onClick={() => setFeynmanStep(1)}
                            className="text-[11px] text-amber-700 hover:underline cursor-pointer"
                          >
                            Change Topic
                          </button>
                        </div>
                        <p className="text-xs text-amber-800">
                          Explain this concept in your own words as if teaching a beginner:
                        </p>
                        <div className="relative">
                          <textarea
                            rows={3}
                            placeholder="Explain here... Click the microphone icon to speak your explanation."
                            value={feynmanExplanation}
                            onChange={(e) => setFeynmanExplanation(e.target.value)}
                            className="w-full px-3 py-2 pr-10 rounded-lg border border-amber-200 bg-white text-xs font-medium text-[#1E3A4A] focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={handleToggleVoiceInput}
                            title={isListening ? 'Stop recording' : 'Start voice input'}
                            className={`absolute right-2.5 bottom-3.5 p-1.5 rounded-full transition-colors cursor-pointer ${
                              isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                            }`}
                          >
                            {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        <div className="flex justify-end">
                          <button
                            type="submit"
                            disabled={chatLoading || !feynmanExplanation.trim()}
                            className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 disabled:opacity-50 transition-colors cursor-pointer"
                          >
                            Evaluate Explanation
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}

                {/* Messages Box */}
                <div className="h-80 overflow-y-auto flex flex-col gap-3 p-4 rounded-xl bg-[#F0F4F7] border border-[#E5E7EB]">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-xs text-[#6B7B85]">
                      Ask a question based on your uploaded course materials to start practicing!
                    </div>
                  ) : (
                    messages.map((msg, i) => (
                      <div
                        key={i}
                        className={`flex flex-col max-w-[85%] ${
                          msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
                        }`}
                      >
                        {msg.levelBadge && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#2E7C87]/15 text-[#2E7C87] uppercase tracking-wide mb-1">
                            {msg.levelBadge}
                          </span>
                        )}
                        <div
                          className={`px-4 py-2.5 rounded-2xl text-xs leading-relaxed ${
                            msg.role === 'user'
                              ? 'bg-[#1E3A4A] text-white rounded-br-none'
                              : 'bg-white text-[#1E3A4A] border border-[#E5E7EB] rounded-bl-none shadow-xs'
                          }`}
                        >
                          {msg.role === 'assistant' && msg.content ? (
                            <div className="chat-markdown">
                              <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                          ) : (
                            msg.content || (chatLoading && i === messages.length - 1 ? 'Thinking...' : '')
                          )}
                        </div>

                        {/* Read Feedback Aloud Button using SpeechSynthesis */}
                        {msg.role === 'assistant' && msg.content && (
                          <button
                            type="button"
                            onClick={() => handleReadAloud(msg.content, i)}
                            title={speakingMsgIndex === i ? 'Stop reading' : 'Read feedback aloud'}
                            className={`p-1 rounded-md text-xs transition-colors self-start mt-1 cursor-pointer flex items-center gap-1 ${
                              speakingMsgIndex === i ? 'text-[#2E7C87] bg-[#2E7C87]/10' : 'text-[#6B7B85] hover:text-[#1E3A4A]'
                            }`}
                          >
                            {speakingMsgIndex === i ? (
                              <>
                                <VolumeX className="w-3.5 h-3.5 animate-pulse text-[#2E7C87]" />
                                <span className="text-[10px] text-[#2E7C87] font-medium">Stop</span>
                              </>
                            ) : (
                              <>
                                <Volume2 className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-medium">Listen</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    ))
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Chat Form */}
                <form onSubmit={handleAskQuestion} className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder={
                        explainLevel !== 'normal'
                          ? `Ask question in ${explainLevel.toUpperCase()} mode...`
                          : "Ask a question about this subject..."
                      }
                      value={currentQuestion}
                      onChange={(e) => setCurrentQuestion(e.target.value)}
                      disabled={chatLoading}
                      className="w-full px-3 py-2 pr-9 rounded-lg border border-[#E5E7EB] text-xs font-medium text-[#1E3A4A] bg-white placeholder-[#6B7B85]/60 focus:outline-none focus:border-[#2E7C87]"
                    />
                    <button
                      type="button"
                      onClick={handleToggleVoiceInput}
                      title={isListening ? 'Stop voice input' : 'Voice input'}
                      className={`absolute right-2 top-1.5 p-1 rounded-md transition-colors cursor-pointer ${
                        isListening ? 'bg-red-500 text-white animate-pulse' : 'text-[#6B7B85] hover:text-[#1E3A4A]'
                      }`}
                    >
                      {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <button
                    type="submit"
                    disabled={chatLoading || !currentQuestion.trim()}
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#2E7C87] hover:bg-[#256770] disabled:opacity-50 transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                </form>
              </div>

              {/* PRACTICE QUIZ & EXAM GENERATOR */}
              <div className="bg-white rounded-2xl p-6 border border-[#E5E7EB] flex flex-col gap-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-[#2E7C87]" />
                    <h2 className="font-sans font-semibold text-base text-[#1E3A4A]">Practice Quiz & Exam Generator</h2>
                  </div>
                  <span className="text-xs text-[#6B7B85]">AI-generated assessments</span>
                </div>

                {quizViewMode === 'setup' && (
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-[#6B7B85] mb-1 uppercase tracking-wide">
                          Difficulty Level
                        </label>
                        <select
                          value={quizDifficulty}
                          onChange={(e) => setQuizDifficulty(e.target.value as any)}
                          className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-xs font-medium text-[#1E3A4A] bg-white focus:outline-none focus:border-[#2E7C87]"
                        >
                          <option value="easy">Easy (Fundamentals)</option>
                          <option value="medium">Medium (Standard Exam)</option>
                          <option value="hard">Hard (Advanced Reasoning)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#6B7B85] mb-1 uppercase tracking-wide">
                          Focus Topic (Optional)
                        </label>
                        <select
                          value={selectedQuizTopic}
                          onChange={(e) => setSelectedQuizTopic(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-xs font-medium text-[#1E3A4A] bg-white focus:outline-none focus:border-[#2E7C87]"
                        >
                          <option value="">All Topics</option>
                          {getKnowledgeMapTopicOptions().map((topic, i) => (
                            <option key={i} value={topic}>{topic}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={handleGenerateQuiz}
                        disabled={quizLoading}
                        className="flex-1 py-2.5 rounded-lg text-xs font-semibold text-white bg-[#2E7C87] hover:bg-[#256770] disabled:opacity-50 transition-colors cursor-pointer"
                      >
                        {quizLoading ? 'Generating Quiz...' : 'Generate Practice Quiz'}
                      </button>
                      <button
                        type="button"
                        onClick={handleGenerateExam}
                        disabled={examLoading}
                        className="flex-1 py-2.5 rounded-lg text-xs font-semibold text-white bg-[#1E3A4A] hover:bg-[#152B37] disabled:opacity-50 transition-colors cursor-pointer"
                      >
                        {examLoading ? 'Starting Exam...' : 'Start Timed Exam Mode'}
                      </button>
                    </div>
                  </div>
                )}

                {quizViewMode === 'taking' && (
                  <div className="flex flex-col gap-4">
                    {/* Prominent Countdown Clock Display for Timed Exam Mode */}
                    {examTimeRemaining > 0 && (
                      <div className="flex items-center justify-between p-4 bg-[#1E3A4A] text-white rounded-xl">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-[#2E7C87]" />
                          <span className="font-sans font-semibold text-xs uppercase tracking-wide">Timed Exam Mode</span>
                        </div>
                        <div className="flex items-center gap-2 font-mono text-base font-bold [font-variant-numeric:tabular-nums]">
                          <span className={examTimeRemaining < 60 ? 'text-red-400 animate-pulse' : 'text-[#2E7C87]'}>
                            {formatElapsedTime(examTimeRemaining)}
                          </span>
                          <span className="text-xs font-normal text-gray-300">Remaining</span>
                        </div>
                      </div>
                    )}

                    <h3 className="font-sans font-semibold text-sm text-[#1E3A4A]">
                      {examTimeRemaining > 0 ? 'Timed Exam in Progress' : 'Practice Quiz in Progress'}
                    </h3>
                    {quizQuestions.map((q, idx) => (
                      <div key={idx} className="p-4 rounded-xl border border-[#E5E7EB] bg-[#F0F4F7] flex flex-col gap-2">
                        <p className="text-xs font-semibold text-[#1E3A4A]">
                          {idx + 1}. {q.question}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                          {q.options?.map((opt, optIdx) => (
                            <button
                              key={optIdx}
                              type="button"
                              onClick={() => handleSelectQuizOption(idx, opt)}
                              className={`p-2 rounded-lg text-xs font-medium text-left border transition-colors cursor-pointer ${
                                userAnswers[idx] === opt
                                  ? 'bg-[#2E7C87] text-white border-[#2E7C87]'
                                  : 'bg-white text-[#1E3A4A] border-[#E5E7EB] hover:bg-gray-50'
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (examTimerIntervalRef.current) clearInterval(examTimerIntervalRef.current);
                          setQuizViewMode('setup');
                        }}
                        className="px-4 py-2 rounded-lg text-xs font-medium text-[#6B7B85] hover:bg-gray-100 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSubmitQuiz}
                        disabled={submittingQuiz}
                        className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#2E7C87] hover:bg-[#256770] cursor-pointer"
                      >
                        Submit Answers
                      </button>
                    </div>
                  </div>
                )}

                {quizViewMode === 'results' && quizResults && (
                  <div className="flex flex-col gap-4 text-center py-4">
                    <span className="text-xs font-semibold uppercase tracking-wide text-[#6B7B85]">Quiz Results</span>
                    <p className="text-3xl font-semibold text-[#1E3A4A] [font-variant-numeric:tabular-nums]">
                      {quizResults.score}%
                    </p>
                    <p className="text-xs text-[#6B7B85]">
                      Correct: {quizResults.correctCount} / {quizResults.totalQuestions}
                    </p>
                    <button
                      type="button"
                      onClick={() => setQuizViewMode('setup')}
                      className="self-center px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#2E7C87] hover:bg-[#256770] cursor-pointer"
                    >
                      Take Another Quiz
                    </button>
                  </div>
                )}

              </div>

            </div>

          </div>

          {/* Badge Unlocked Celebration Modal */}
          {unlockedBadgesModal && unlockedBadgesModal.length > 0 && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
              <div className="bg-white rounded-2xl p-6 border border-[#E5E7EB] shadow-2xl max-w-md w-full flex flex-col items-center text-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#2E7C87]/10 text-[#2E7C87] flex items-center justify-center">
                  <Trophy className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#2E7C87]">Achievement Unlocked!</span>
                  <h3 className="font-sans font-semibold text-lg text-[#1E3A4A] mt-0.5">
                    {unlockedBadgesModal.length === 1 ? 'New Badge Earned!' : 'New Badges Earned!'}
                  </h3>
                </div>

                <div className="flex flex-col gap-2 w-full">
                  {unlockedBadgesModal.map((bId) => (
                    <div key={bId} className="p-3 rounded-xl bg-[#F0F4F7] border border-[#E5E7EB] flex items-center gap-3 text-left">
                      <div className="w-9 h-9 rounded-lg bg-[#2E7C87] text-white flex items-center justify-center shrink-0">
                        <Award className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-sans font-semibold text-xs text-[#1E3A4A] capitalize">{bId.replace('_', ' ')}</h4>
                        <p className="text-[11px] text-[#6B7B85]">Keep studying to unlock more badges!</p>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setUnlockedBadgesModal(null)}
                  className="w-full py-2.5 rounded-lg text-xs font-semibold text-white bg-[#2E7C87] hover:bg-[#256770] transition-colors cursor-pointer"
                >
                  Awesome! Continue
                </button>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default StudySubject;
