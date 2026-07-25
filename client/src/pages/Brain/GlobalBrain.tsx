import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
// @ts-ignore
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import logo from '../../assets/logo.png';

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

const GlobalBrainPage: React.FC = () => {
  const { logoutUser } = useAuth();

  const [brainData, setBrainData] = useState<BrainData | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [insufficientData, setInsufficientData] = useState(false);

  const hasData =
    brainData &&
    ((brainData.weakConcepts && brainData.weakConcepts.length > 0) ||
      (brainData.strongConcepts && brainData.strongConcepts.length > 0));

  // Fetch existing brain data on mount
  useEffect(() => {
    const fetchBrain = async () => {
      try {
        const res = await API.get('/brain');
        if (res.data) {
          setBrainData(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch brain data', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBrain();
  }, []);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setError('');
    setInsufficientData(false);

    try {
      const res = await API.post('/brain/update');
      setBrainData(res.data.brain);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to analyze patterns.';
      if (msg.toLowerCase().includes('at least 2')) {
        setInsufficientData(true);
      } else {
        setError(msg);
      }
    } finally {
      setAnalyzing(false);
    }
  };

  // Severity → red glow intensity
  const getSeverityGlow = (severity: number = 5) => {
    const base = Math.min(severity / 10, 1);
    const opacity = 0.15 + base * 0.35;
    return `0 0 ${12 + severity * 3}px rgba(248, 113, 113, ${opacity})`;
  };

  const getSeverityBarWidth = (severity: number = 5) => `${(severity / 10) * 100}%`;

  const getSeverityColor = (severity: number = 5) => {
    if (severity >= 8) return '#F87171';
    if (severity >= 5) return '#FB923C';
    return '#FBBF24';
  };

  const formatUpdatedAt = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  return (
    <div
      className="min-h-screen font-inter flex flex-col relative overflow-x-hidden"
      style={{ backgroundColor: '#060E10', color: '#DAF1DE' }}
    >
      {/* Ambient Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-15%', left: '-10%', width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,212,220,0.06) 0%, transparent 65%)', filter: 'blur(80px)' }} />
        <div style={{ position: 'absolute', top: '30%', right: '-10%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(184,160,232,0.06) 0%, transparent 65%)', filter: 'blur(80px)' }} />
        <div style={{ position: 'absolute', bottom: '10%', left: '35%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(248,113,113,0.04) 0%, transparent 65%)', filter: 'blur(70px)' }} />
      </div>

      {/* Navbar */}
      <nav
        style={{ background: 'linear-gradient(90deg, #0A1F20 0%, #0D2420 50%, #0A1A2A 100%)', borderBottom: '1px solid rgba(168,212,220,0.1)', position: 'relative', zIndex: 10 }}
        className="px-10 py-4 flex items-center justify-between gap-6"
      >
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="flex items-center gap-2 text-sm text-[#8EB69B] hover:text-[#A8D4DC] transition-colors font-medium">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
            Back to Dashboard
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

      {/* Main Content */}
      <div className="flex flex-col p-8 md:p-10 gap-8 max-w-screen-xl w-full mx-auto relative flex-1" style={{ zIndex: 1 }}>

        {/* Page Header */}
        <div className="flex items-start justify-between flex-wrap gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <div style={{ width: 46, height: 46, background: 'linear-gradient(135deg, #2a1a4a 0%, #3d2070 100%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#B8A0E8', boxShadow: '0 0 20px rgba(184,160,232,0.3)' }}>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
              </div>
              <h1 className="font-jakarta font-bold text-3xl md:text-4xl" style={{ background: 'linear-gradient(90deg, #DAF1DE 0%, #B8A0E8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Your Learning DNA
              </h1>
            </div>
            <p className="text-sm text-[#8EB69B] pl-1">Concepts that connect across your subjects — your hidden strengths and gaps revealed.</p>
            {brainData?.updatedAt && (
              <p className="text-xs text-[#4a7a68] pl-1">Last analyzed: {formatUpdatedAt(brainData.updatedAt)}</p>
            )}
          </div>

          {/* Refresh Analysis Button (only visible when data exists) */}
          {hasData && (
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer hover:shadow-lg shrink-0"
              style={{ background: 'linear-gradient(135deg, #0d2820 0%, #0a1a2a 100%)', border: '1px solid rgba(168,212,220,0.2)', color: '#DAF1DE' }}
            >
              {analyzing ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-[#4EC9D4]" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                  <span>Analyzing patterns...</span>
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                  <span>Refresh Analysis</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex justify-center items-center py-24">
            <div className="flex flex-col items-center gap-4">
              <svg className="animate-spin h-8 w-8 text-[#A8D4DC]" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
              <span className="text-sm text-[#8EB69B]">Loading learning patterns...</span>
            </div>
          </div>
        )}

        {/* Insufficient data state */}
        {!loading && insufficientData && (
          <div
            className="flex flex-col items-center justify-center p-10 rounded-3xl text-center gap-5 border border-dashed border-amber-500/30"
            style={{ backgroundColor: 'rgba(251, 191, 36, 0.04)' }}
          >
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-400">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            </div>
            <div className="max-w-lg flex flex-col gap-2">
              <h3 className="font-jakarta font-bold text-xl text-[#DAF1DE]">More Subjects Needed</h3>
              <p className="text-sm text-[#8EB69B]">
                You need at least <strong className="text-[#DAF1DE]">2 subjects with Knowledge Maps</strong> to unlock cross-subject learning insights.
              </p>
              <p className="text-xs text-[#4a7a68]">
                Go to each subject's page, upload your course materials, and click <strong>"Generate Knowledge Map"</strong> — then come back here.
              </p>
            </div>
            <Link
              to="/dashboard"
              className="mt-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 hover:shadow-lg"
              style={{ background: 'linear-gradient(135deg, #A8D4DC 0%, #4EC9D4 100%)', color: '#040D0E', boxShadow: '0 0 15px rgba(168,212,220,0.2)' }}
            >
              <span>Go to My Subjects</span>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
            </Link>
          </div>
        )}

        {/* Generic error state */}
        {!loading && error && (
          <div className="p-5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-3">
            <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            <span>{error}</span>
          </div>
        )}

        {/* Empty state — no data yet */}
        {!loading && !hasData && !insufficientData && (
          <div
            className="flex flex-col items-center justify-center p-12 rounded-3xl text-center gap-6 border border-dashed border-teal-500/20"
            style={{ backgroundColor: 'rgba(6, 14, 16, 0.6)', minHeight: 380 }}
          >
            <div className="relative">
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'radial-gradient(circle, rgba(184,160,232,0.25) 0%, transparent 70%)', position: 'absolute', inset: -10, filter: 'blur(12px)' }} />
              <div className="relative w-20 h-20 rounded-3xl bg-[#2a1a4a]/60 border border-purple-500/20 flex items-center justify-center text-[#B8A0E8]">
                <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.3} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
              </div>
            </div>
            <div className="flex flex-col gap-2 max-w-md">
              <h3 className="font-jakarta font-bold text-2xl text-[#DAF1DE]">No Learning Patterns Yet</h3>
              <p className="text-sm text-[#8EB69B]">
                Click below to let AI scan all your subjects' knowledge maps and surface patterns — identifying which concepts appear across multiple subjects and where your true gaps lie.
              </p>
              <p className="text-xs text-[#4a7a68] mt-1">
                Requires at least 2 subjects with generated Knowledge Maps.
              </p>
            </div>
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="px-8 py-3.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 flex items-center gap-3 cursor-pointer hover:shadow-xl"
              style={{ background: 'linear-gradient(135deg, #B8A0E8 0%, #9585C8 100%)', color: '#1a0a30', boxShadow: '0 0 20px rgba(184,160,232,0.3)' }}
            >
              {analyzing ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                  <span>Analyzing patterns across your subjects...</span>
                </>
              ) : (
                <>
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
                  <span>Analyze My Learning Patterns</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* ─── Brain Data Display ─────────────────────────────────────────────── */}
        {!loading && hasData && (
          <div className="flex flex-col gap-8">

            {/* ── WEAK CONCEPTS ── */}
            {brainData!.weakConcepts && brainData!.weakConcepts.length > 0 && (
              <div
                style={{ background: 'linear-gradient(145deg, #150c0c 0%, #0f0a16 100%)', border: '1px solid rgba(248,113,113,0.15)' }}
                className="rounded-3xl p-8 flex flex-col gap-6"
              >
                {/* Section header */}
                <div className="flex items-center gap-3 pb-4 border-b border-red-500/10">
                  <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg, #450a0a 0%, #7f1d1d 100%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F87171', boxShadow: '0 0 15px rgba(248,113,113,0.3)' }}>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"/></svg>
                  </div>
                  <div>
                    <h2 className="font-jakarta font-bold text-xl text-[#DAF1DE]">Concepts to Strengthen</h2>
                    <p className="text-xs text-[#8EB69B]">Shared concepts where your understanding needs more work across multiple subjects</p>
                  </div>
                  <span className="ml-auto text-xs font-semibold px-3 py-1.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                    {brainData!.weakConcepts.length} weak concept{brainData!.weakConcepts.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Weak concept cards grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {brainData!.weakConcepts.map((item, idx) => {
                    const severity = item.severity ?? 5;
                    const severityColor = getSeverityColor(severity);
                    return (
                      <div
                        key={idx}
                        className="flex flex-col gap-4 p-5 rounded-2xl transition-all hover:scale-[1.01]"
                        style={{
                          backgroundColor: 'rgba(10, 4, 4, 0.8)',
                          border: `1px solid rgba(248,113,113,${0.1 + (severity / 10) * 0.25})`,
                          boxShadow: getSeverityGlow(severity),
                        }}
                      >
                        {/* Concept Name */}
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-jakarta font-bold text-base capitalize" style={{ color: '#DAF1DE' }}>
                            {item.concept}
                          </h3>
                          {/* Severity badge */}
                          <span
                            className="text-xs font-extrabold px-2.5 py-1 rounded-lg shrink-0"
                            style={{ backgroundColor: `${severityColor}20`, color: severityColor, border: `1px solid ${severityColor}40` }}
                          >
                            {severity}/10
                          </span>
                        </div>

                        {/* Severity bar */}
                        <div>
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-[10px] uppercase tracking-wider text-[#8EB69B] font-semibold">Severity</span>
                          </div>
                          <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                            <div
                              className="h-2 rounded-full transition-all duration-700"
                              style={{
                                width: getSeverityBarWidth(severity),
                                background: `linear-gradient(90deg, #FCA5A5, ${severityColor})`,
                                boxShadow: `0 0 8px ${severityColor}80`,
                              }}
                            />
                          </div>
                        </div>

                        {/* Subject tags */}
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[10px] uppercase tracking-wider text-[#4a7a68] font-semibold">Appears in</span>
                          <div className="flex flex-wrap gap-2">
                            {item.subjects.map((sub, sIdx) => (
                              <span
                                key={sIdx}
                                className="text-xs px-2.5 py-1 rounded-lg font-medium"
                                style={{ backgroundColor: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#FCA5A5' }}
                              >
                                {sub}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── STRONG CONCEPTS ── */}
            {brainData!.strongConcepts && brainData!.strongConcepts.length > 0 && (
              <div
                style={{ background: 'linear-gradient(145deg, #0c1e1f 0%, #0a1720 100%)', border: '1px solid rgba(78,201,212,0.15)' }}
                className="rounded-3xl p-8 flex flex-col gap-6"
              >
                {/* Section header */}
                <div className="flex items-center gap-3 pb-4 border-b border-teal-500/10">
                  <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg, #0d3d3a 0%, #1a5c5a 100%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4EC9D4', boxShadow: '0 0 15px rgba(78,201,212,0.3)' }}>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
                  </div>
                  <div>
                    <h2 className="font-jakarta font-bold text-xl text-[#DAF1DE]">Your Cross-Subject Strengths</h2>
                    <p className="text-xs text-[#8EB69B]">Concepts you've mastered that span across multiple subjects</p>
                  </div>
                  <span className="ml-auto text-xs font-semibold px-3 py-1.5 rounded-full bg-teal-500/10 text-[#4EC9D4] border border-teal-500/20">
                    {brainData!.strongConcepts.length} strong concept{brainData!.strongConcepts.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Strong concept cards grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {brainData!.strongConcepts.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col gap-4 p-5 rounded-2xl transition-all hover:scale-[1.01] hover:border-teal-500/30"
                      style={{
                        backgroundColor: 'rgba(6, 14, 16, 0.8)',
                        border: '1px solid rgba(78,201,212,0.12)',
                        boxShadow: '0 0 12px rgba(78,201,212,0.1)',
                      }}
                    >
                      {/* Concept Name & check badge */}
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-jakarta font-bold text-base capitalize" style={{ color: '#DAF1DE' }}>
                          {item.concept}
                        </h3>
                        <div className="w-7 h-7 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                          <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                        </div>
                      </div>

                      {/* Mastery indicator */}
                      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-2 rounded-full w-full"
                          style={{ background: 'linear-gradient(90deg, #A8D4DC, #4EC9D4)', boxShadow: '0 0 8px rgba(78,201,212,0.5)' }}
                        />
                      </div>

                      {/* Subject tags */}
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] uppercase tracking-wider text-[#4a7a68] font-semibold">Appears in</span>
                        <div className="flex flex-wrap gap-2">
                          {item.subjects.map((sub, sIdx) => (
                            <span
                              key={sIdx}
                              className="text-xs px-2.5 py-1 rounded-lg font-medium"
                              style={{ backgroundColor: 'rgba(78,201,212,0.08)', border: '1px solid rgba(78,201,212,0.2)', color: '#A8D4DC' }}
                            >
                              {sub}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GlobalBrainPage;
