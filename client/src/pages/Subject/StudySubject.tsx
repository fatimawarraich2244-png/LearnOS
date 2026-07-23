import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
// @ts-ignore
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import logo from '../../assets/logo.png';

interface Subject {
  _id: string;
  name: string;
  semesterId: string;
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
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { logoutUser } = useAuth();

  // Scroll chat window to bottom when messages update
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatLoading]);

  // Fetch subject details if not provided via location state
  useEffect(() => {
    const fetchSubjectDetails = async () => {
      if (!subjectId) return;
      try {
        const res = await API.get(`/subjects/single/${subjectId}`);
        setSubject(res.data);
      } catch (err) {
        console.error('Failed to fetch subject details', err);
      } finally {
        setLoadingSubject(false);
      }
    };

    fetchSubjectDetails();
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
    setMessages((prev) => [...prev, { role: 'user', content: question }]);
    setCurrentQuestion('');
    setChatLoading(true);

    try {
      const res = await API.post('/chat/ask', { subjectId, question });
      setMessages((prev) => [...prev, { role: 'assistant', content: res.data.answer }]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: err.response?.data?.message || 'Sorry, something went wrong answering your question.' },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const backLink = subject?.semesterId ? `/semesters/${subject.semesterId}` : '/dashboard';

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
          <p className="text-sm text-[#8EB69B]">Upload course materials and interact with your AI study assistant</p>
        </div>

        {/* Two Column Layout */}
        <div className="flex flex-col lg:flex-row gap-8 w-full flex-1">
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
              <div className="flex items-center gap-3 pb-4 mb-4 border-b border-white/5">
                <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg, #0d3d3a 0%, #1a5c5a 100%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A8D4DC' }}>
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>
                </div>
                <div>
                  <h2 className="font-jakarta font-bold text-lg" style={{ color: '#DAF1DE' }}>AI Study Assistant</h2>
                  <p className="text-xs text-[#8EB69B]">Ask questions powered by your uploaded course materials</p>
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
                      Upload your course documents on the left, then ask any question about key concepts, formulas, or summaries!
                    </p>
                  </div>
                )}

                {messages.map((msg, i) => (
                  <div key={i} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed whitespace-pre-wrap ${
                        msg.role === 'user' ? 'rounded-tr-xs text-[#040D0E] font-medium' : 'rounded-tl-xs text-[#DAF1DE]'
                      }`}
                      style={{
                        backgroundColor: msg.role === 'user' ? '#4EC9D4' : '#0A1A1B',
                        border: msg.role === 'assistant' ? '1px solid rgba(168,212,220,0.15)' : 'none',
                        boxShadow: msg.role === 'user' ? '0 0 20px rgba(78,201,212,0.15)' : 'none',
                      }}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}

                {chatLoading && (
                  <div className="flex w-full justify-start">
                    <div className="max-w-[85%] rounded-2xl rounded-tl-xs p-4 flex items-center gap-2" style={{ backgroundColor: '#0A1A1B', border: '1px solid rgba(168,212,220,0.15)' }}>
                      <span className="text-xs text-[#8EB69B]">AI is analyzing your materials...</span>
                      <span className="h-1.5 w-1.5 rounded-full bg-[#A8D4DC] animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-[#A8D4DC] animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-[#A8D4DC] animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input & Send Button Pinned at Bottom */}
              <form onSubmit={handleAskQuestion} className="flex gap-3">
                <input
                  type="text"
                  placeholder="Ask a question about this subject..."
                  value={currentQuestion}
                  onChange={(e) => setCurrentQuestion(e.target.value)}
                  disabled={chatLoading}
                  style={{ backgroundColor: '#0A1A1B', border: '1px solid rgba(168,212,220,0.18)', color: '#DAF1DE' }}
                  className="flex-1 px-4 py-3.5 rounded-xl text-sm placeholder-[#235347] focus:outline-none focus:border-teal-400 transition-colors"
                />
                <button
                  type="submit"
                  disabled={chatLoading || !currentQuestion.trim()}
                  className="px-6 py-3.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 flex items-center gap-2 hover:shadow-lg shrink-0 cursor-pointer"
                  style={{ background: 'linear-gradient(135deg, #A8D4DC 0%, #4EC9D4 100%)', color: '#040D0E', boxShadow: '0 0 15px rgba(168,212,220,0.2)' }}
                >
                  <span>Send</span>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudySubject;
