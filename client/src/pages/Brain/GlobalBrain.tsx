import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
// @ts-ignore
import API from '../../api/axios';
import toast from 'react-hot-toast';
import {
  Brain,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Zap,
  Target,
  ArrowRight,
  Clock,
  ArrowLeft,
} from 'lucide-react';

interface ConceptItem {
  concept: string;
  subjects: string[];
  severity?: number;
}

interface BrainData {
  _id?: string;
  userId?: string;
  weakConcepts: ConceptItem[];
  strongConcepts: ConceptItem[];
  updatedAt?: string;
}

interface DNAPattern {
  insight: string;
  confidence: 'high' | 'medium' | string;
  category: 'time' | 'technique' | 'engagement' | string;
}

interface LearningDNAResult {
  patterns: DNAPattern[];
  dataPoints: number;
  lastAnalyzed?: string;
}

const GlobalBrainPage: React.FC = () => {
  const [brainData, setBrainData] = useState<BrainData | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [insufficientData, setInsufficientData] = useState(false);

  // Learning DNA State
  const [learningDNA, setLearningDNA] = useState<LearningDNAResult | null>(null);
  const [dnaLoading, setDnaLoading] = useState(true);
  const [dnaAnalyzing, setDnaAnalyzing] = useState(false);
  const [dnaMessage, setDnaMessage] = useState('');

  const hasData =
    brainData &&
    ((brainData.weakConcepts && brainData.weakConcepts.length > 0) ||
      (brainData.strongConcepts && brainData.strongConcepts.length > 0));

  useEffect(() => {
    const fetchBrain = async () => {
      try {
        const res = await API.get('/brain');
        if (res.data) setBrainData(res.data);
      } catch (err) {
        console.error('Failed to fetch brain data', err);
      } finally {
        setLoading(false);
      }
    };

    const fetchDNA = async () => {
      try {
        const res = await API.get('/stats/learning-dna');
        if (res.data?.message && !res.data.learningDNA?.patterns?.length) {
          setDnaMessage(res.data.message);
          setLearningDNA(null);
        } else if (res.data?.learningDNA) {
          setLearningDNA(res.data.learningDNA);
          setDnaMessage('');
        }
      } catch (err) {
        console.error('Failed to fetch Learning DNA', err);
      } finally {
        setDnaLoading(false);
      }
    };

    fetchBrain();
    fetchDNA();
  }, []);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setError('');
    setInsufficientData(false);

    try {
      const res = await API.post('/brain/update');
      setBrainData(res.data.brain);
      toast.success('Learning pattern analysis updated!');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to analyze patterns.';
      if (err.response?.status === 429) {
        toast.error(msg);
      } else if (msg.toLowerCase().includes('at least 2')) {
        setInsufficientData(true);
      } else {
        setError(msg);
        toast.error(msg);
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAnalyzeDNA = async () => {
    setDnaAnalyzing(true);
    setDnaMessage('');
    try {
      const res = await API.post('/stats/learning-dna');
      if (res.data.message && !res.data.learningDNA?.patterns?.length) {
        setDnaMessage(res.data.message);
        setLearningDNA(null);
      } else if (res.data.learningDNA) {
        setLearningDNA(res.data.learningDNA);
        setDnaMessage('');
        toast.success('Learning DNA analysis refreshed!');
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Failed to analyze Learning DNA.';
      setDnaMessage(errMsg);
      toast.error(errMsg);
    } finally {
      setDnaAnalyzing(false);
    }
  };

  const formatUpdatedAt = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
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
                Global Learning DNA & Knowledge Graph
              </h1>
              <p className="text-sm text-[#6B7B85] mt-0.5 font-normal">
                Cross-subject concepts, hidden knowledge gaps, and AI behavioral insights.
              </p>
              {brainData?.updatedAt && (
                <p className="text-xs text-[#6B7B85] mt-1 font-normal">
                  Last analyzed: {formatUpdatedAt(brainData.updatedAt)}
                </p>
              )}
            </div>

            {hasData && (
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={analyzing}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#2E7C87] hover:bg-[#256770] disabled:opacity-50 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{analyzing ? 'Analyzing Patterns...' : 'Refresh Analysis'}</span>
              </button>
            )}
          </div>

          {/* Loading state */}
          {loading && (
            <div className="flex justify-center items-center py-16">
              <div className="animate-spin h-6 w-6 border-2 border-[#2E7C87] border-t-transparent rounded-full" />
            </div>
          )}

          {/* Insufficient data state */}
          {!loading && insufficientData && (
            <div className="bg-white rounded-2xl p-8 border border-[#E5E7EB] flex flex-col items-center justify-center text-center gap-4 max-w-lg mx-auto my-8">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-sans font-semibold text-base text-[#1E3A4A]">More Subjects Required</h3>
                <p className="text-xs text-[#6B7B85] mt-1 leading-relaxed">
                  You need at least 2 subjects with generated Knowledge Maps to unlock cross-subject learning insights.
                </p>
              </div>
              <Link
                to="/dashboard"
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#2E7C87] hover:bg-[#256770] no-underline transition-colors flex items-center gap-1.5"
              >
                <span>Go to Workspace Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

          {/* Generic error */}
          {!loading && error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Empty state — no data yet */}
          {!loading && !hasData && !insufficientData && (
            <div className="bg-white rounded-2xl p-10 border border-dashed border-[#E5E7EB] flex flex-col items-center justify-center text-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#2E7C87]/10 text-[#2E7C87] flex items-center justify-center">
                <Brain className="w-6 h-6" />
              </div>
              <div className="max-w-md">
                <h3 className="font-sans font-semibold text-base text-[#1E3A4A]">No Learning Patterns Yet</h3>
                <p className="text-xs text-[#6B7B85] mt-1 leading-relaxed">
                  Click below to scan knowledge maps across your subjects and uncover cross-discipline concepts and weak points.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={analyzing}
                className="px-4 py-2.5 rounded-lg text-xs font-semibold text-white bg-[#2E7C87] hover:bg-[#256770] disabled:opacity-50 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{analyzing ? 'Analyzing...' : 'Analyze Learning Patterns'}</span>
              </button>
            </div>
          )}

          {/* ── Brain Data Display ── */}
          {!loading && hasData && (
            <div className="flex flex-col gap-6">

              {/* WEAK CONCEPTS */}
              {brainData!.weakConcepts && brainData!.weakConcepts.length > 0 && (
                <div className="bg-white rounded-2xl p-6 border border-[#E5E7EB] flex flex-col gap-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
                    <div className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-red-500" />
                      <h2 className="font-sans font-semibold text-base text-[#1E3A4A]">Concepts to Strengthen</h2>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-[#6B7B85] font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      <span>{brainData!.weakConcepts.length} weak concepts identified</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {brainData!.weakConcepts.map((item, idx) => {
                      const severity = item.severity ?? 5;
                      return (
                        <div
                          key={idx}
                          className="bg-[#F0F4F7] rounded-xl p-4 border border-[#E5E7EB] flex flex-col justify-between gap-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-sans font-semibold text-sm text-[#1E3A4A] capitalize">
                              {item.concept}
                            </h3>
                            <span className="text-xs font-semibold text-red-600 font-mono [font-variant-numeric:tabular-nums]">
                              {severity}/10
                            </span>
                          </div>

                          <div className="w-full h-1.5 rounded-full bg-white overflow-hidden">
                            <div
                              className="h-full rounded-full bg-red-500"
                              style={{ width: `${(severity / 10) * 100}%` }}
                            />
                          </div>

                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {item.subjects.map((sub, sIdx) => (
                              <span
                                key={sIdx}
                                className="text-[11px] px-2 py-0.5 rounded bg-white border border-[#E5E7EB] text-[#6B7B85]"
                              >
                                {sub}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STRONG CONCEPTS */}
              {brainData!.strongConcepts && brainData!.strongConcepts.length > 0 && (
                <div className="bg-white rounded-2xl p-6 border border-[#E5E7EB] flex flex-col gap-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-[#2E7C87]" />
                      <h2 className="font-sans font-semibold text-base text-[#1E3A4A]">Cross-Subject Strengths</h2>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-[#6B7B85] font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#2E7C87]" />
                      <span>{brainData!.strongConcepts.length} strong concepts mastered</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {brainData!.strongConcepts.map((item, idx) => (
                      <div
                        key={idx}
                        className="bg-[#F0F4F7] rounded-xl p-4 border border-[#E5E7EB] flex flex-col justify-between gap-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-sans font-semibold text-sm text-[#1E3A4A] capitalize">
                            {item.concept}
                          </h3>
                          <CheckCircle2 className="w-4 h-4 text-[#2E7C87] shrink-0" />
                        </div>

                        <div className="w-full h-1.5 rounded-full bg-white overflow-hidden">
                          <div className="h-full rounded-full bg-[#2E7C87] w-full" />
                        </div>

                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {item.subjects.map((sub, sIdx) => (
                            <span
                              key={sIdx}
                              className="text-[11px] px-2 py-0.5 rounded bg-white border border-[#E5E7EB] text-[#6B7B85]"
                            >
                              {sub}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ── LEARNING DNA BEHAVIORAL INSIGHTS ── */}
          <div className="bg-white rounded-2xl p-6 border border-[#E5E7EB] flex flex-col gap-6">
            <div className="flex items-center justify-between flex-wrap gap-4 pb-3 border-b border-[#E5E7EB]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#2E7C87]/10 text-[#2E7C87] flex items-center justify-center shrink-0">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-sans font-semibold text-base text-[#1E3A4A]">Learning DNA Profile</h2>
                  <p className="text-xs text-[#6B7B85]">Behavioral trends and personalized study habits</p>
                </div>
              </div>

              {learningDNA && learningDNA.patterns && learningDNA.patterns.length > 0 && (
                <button
                  type="button"
                  onClick={handleAnalyzeDNA}
                  disabled={dnaAnalyzing}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-[#2E7C87] border border-[#2E7C87]/30 hover:bg-[#2E7C87]/10 disabled:opacity-50 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{dnaAnalyzing ? 'Refreshing...' : 'Re-analyze DNA'}</span>
                </button>
              )}
            </div>

            {dnaLoading || dnaAnalyzing ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin h-5 w-5 border-2 border-[#2E7C87] border-t-transparent rounded-full" />
              </div>
            ) : dnaMessage ? (
              <div className="p-6 rounded-xl bg-[#F0F4F7] border border-[#E5E7EB] text-center text-xs text-[#6B7B85] flex flex-col items-center gap-3">
                <p className="font-medium text-[#1E3A4A]">{dnaMessage}</p>
                <button
                  type="button"
                  onClick={handleAnalyzeDNA}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#2E7C87] hover:bg-[#256770]"
                >
                  Discover Learning DNA
                </button>
              </div>
            ) : !learningDNA || !learningDNA.patterns || learningDNA.patterns.length === 0 ? (
              <div className="p-8 rounded-xl border border-dashed border-[#E5E7EB] text-center flex flex-col items-center gap-3">
                <Zap className="w-8 h-8 text-[#2E7C87]" />
                <h3 className="font-sans font-semibold text-sm text-[#1E3A4A]">Discover Your Learning DNA</h3>
                <p className="text-xs text-[#6B7B85] max-w-md">
                  AI analyzes study session durations and quiz preparation to identify peak focus times and effective study strategies.
                </p>
                <button
                  type="button"
                  onClick={handleAnalyzeDNA}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#2E7C87] hover:bg-[#256770] transition-colors"
                >
                  Discover Learning DNA
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {learningDNA.patterns.map((p, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-[#E5E7EB] bg-[#F0F4F7] flex flex-col justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-[#2E7C87]/10 text-[#2E7C87] flex items-center justify-center shrink-0 mt-0.5">
                        <Clock className="w-3.5 h-3.5" />
                      </div>
                      <p className="text-xs font-medium text-[#1E3A4A] leading-relaxed">
                        {p.insight}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[#E5E7EB] text-xs">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-[#6B7B85]">
                        {p.category}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#2E7C87]" />
                        <span className="text-xs text-[#1E3A4A] font-medium capitalize">{p.confidence} Confidence</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
};

export default GlobalBrainPage;
