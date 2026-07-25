import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
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

const subjectThemes = [
  { iconBg: 'linear-gradient(135deg,#0d3d3a 0%,#1a5c5a 100%)', glow: 'rgba(168,212,220,0.25)', iconColor: '#A8D4DC', bar: 'linear-gradient(90deg,#A8D4DC,#4EC9D4)' },
  { iconBg: 'linear-gradient(135deg,#1a2d4a 0%,#1e4a6e 100%)', glow: 'rgba(126,200,227,0.25)', iconColor: '#7EC8E3', bar: 'linear-gradient(90deg,#7EC8E3,#4EC9D4)' },
  { iconBg: 'linear-gradient(135deg,#2a1a4a 0%,#3d2070 100%)', glow: 'rgba(149,155,185,0.25)', iconColor: '#B8A0E8', bar: 'linear-gradient(90deg,#959BB9,#B8A0E8)' },
  { iconBg: 'linear-gradient(135deg,#3a1a2a 0%,#5c1a40 100%)', glow: 'rgba(244,114,182,0.2)',  iconColor: '#F472B6', bar: 'linear-gradient(90deg,#F472B6,#c084fc)' },
];

const SubjectIcons = [
  <svg key="1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M12 14l9-5-9-5-9 5 9 5z"/><path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/></svg>,
  <svg key="2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 10V7"/></svg>,
  <svg key="3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>,
  <svg key="4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>,
];

const SubjectPage: React.FC = () => {
  const { semesterId } = useParams();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [newSubject, setNewSubject] = useState('');
  const [loading, setLoading] = useState(true);
  const [addLoading, setAddLoading] = useState(false);
  const [error, setError] = useState('');

  // Dropdown & Edit & Delete modal states
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deletingSubject, setDeletingSubject] = useState<Subject | null>(null);

  const menuRef = useRef<HTMLDivElement | null>(null);
  const { logoutUser } = useAuth();

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await API.get(`/subjects/${semesterId}`);
        setSubjects(res.data);
      } catch (err: any) {
        setError('Failed to fetch subjects');
      } finally {
        setLoading(false);
      }
    };
    if (semesterId) {
      fetchSubjects();
    }
  }, [semesterId]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim()) return;
    setAddLoading(true);
    try {
      const res = await API.post('/subjects', { name: newSubject.trim(), semesterId });
      setSubjects((prev) => [...prev, res.data]);
      setNewSubject('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add subject');
    } finally {
      setAddLoading(false);
    }
  };

  const handleSaveRename = async (subjectId: string) => {
    if (!editName.trim()) {
      setEditingSubjectId(null);
      return;
    }
    try {
      const res = await API.put(`/subjects/${subjectId}`, { name: editName.trim() });
      setSubjects((prev) =>
        prev.map((s) => (s._id === subjectId ? { ...s, name: res.data.name } : s))
      );
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to rename subject');
    } finally {
      setEditingSubjectId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingSubject) return;
    try {
      await API.delete(`/subjects/${deletingSubject._id}`);
      setSubjects((prev) => prev.filter((s) => s._id !== deletingSubject._id));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete subject');
    } finally {
      setDeletingSubject(null);
    }
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

      {/* Body */}
      <div className="flex flex-col p-10 gap-8 max-w-screen-xl w-full mx-auto relative" style={{ zIndex: 1 }}>
        <div className="flex flex-col gap-6 w-full max-w-md">
          <h1 className="font-jakarta font-bold" style={{ fontSize: 32, background: 'linear-gradient(90deg, #DAF1DE 0%, #A8D4DC 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Subjects</h1>

          {/* Add subject form */}
          <form onSubmit={handleAddSubject} className="flex gap-3">
            <input
              type="text"
              placeholder="Add new subject (e.g., Data Structures)"
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              style={{ backgroundColor: '#0A1A1B', border: '1px solid rgba(168,212,220,0.15)', color: '#DAF1DE' }}
              className="flex-1 px-4 py-3 rounded-xl text-sm placeholder-[#235347] focus:outline-none focus:border-teal-400 transition-colors"
            />
            <button
              type="submit"
              disabled={addLoading}
              className="px-5 py-3 rounded-xl text-sm font-semibold font-jakarta transition-all flex items-center gap-1.5 disabled:opacity-50 whitespace-nowrap hover:shadow-lg"
              style={{ background: 'linear-gradient(135deg, #A8D4DC 0%, #4EC9D4 100%)', color: '#040D0E', boxShadow: '0 0 20px rgba(168,212,220,0.25)' }}
            >
              {addLoading ? (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
              ) : (<>+ Add Subject</>)}
            </button>
          </form>

          {error && <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-2">{error}</p>}
        </div>

        {/* Subjects grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <svg className="animate-spin h-6 w-6" style={{ color: '#A8D4DC' }} fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
          </div>
        ) : subjects.length === 0 ? (
          <div className="text-center py-12 text-sm rounded-2xl w-full max-w-md" style={{ color: '#235347', border: '1px dashed rgba(168,212,220,0.15)' }}>
            No subjects yet. Add one above.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full">
            {subjects.map((subject, idx) => {
              const theme = subjectThemes[idx % subjectThemes.length];
              const isMenuOpen = openMenuId === subject._id;
              const isEditing = editingSubjectId === subject._id;

              return (
                <div
                  key={subject._id}
                  style={{ background: 'linear-gradient(145deg, #0c1e1f 0%, #0a1720 100%)', border: '1px solid rgba(168,212,220,0.12)', transition: 'all 0.25s ease' }}
                  className="rounded-3xl p-7 flex flex-col gap-5 group relative"
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.border = '1px solid rgba(168,212,220,0.35)'; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 28px ${theme.glow}`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.border = '1px solid rgba(168,212,220,0.12)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}
                >
                  {/* Top row: icon + 3-dot menu */}
                  <div className="flex items-start justify-between">
                    <div style={{ width: 52, height: 52, background: theme.iconBg, boxShadow: `0 0 20px ${theme.glow}`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', color: theme.iconColor }}>
                      <div style={{ width: 22, height: 22 }}>{SubjectIcons[idx % SubjectIcons.length]}</div>
                    </div>

                    {/* 3-dot menu button */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(isMenuOpen ? null : subject._id);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                      </button>

                      {/* Dropdown Menu */}
                      {isMenuOpen && (
                        <div
                          ref={menuRef}
                          style={{
                            background: 'linear-gradient(135deg, #0a1f20 0%, #0d2826 100%)',
                            border: '1px solid rgba(168,212,220,0.25)',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                          }}
                          className="absolute right-0 mt-2 w-36 rounded-xl py-1.5 z-20 overflow-hidden"
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingSubjectId(subject._id);
                              setEditName(subject.name);
                              setOpenMenuId(null);
                            }}
                            className="w-full text-left px-4 py-2 text-xs font-medium text-[#DAF1DE] hover:bg-white/10 flex items-center gap-2 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5 text-[#A8D4DC]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Rename
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingSubject(subject);
                              setOpenMenuId(null);
                            }}
                            className="w-full text-left px-4 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Info / Rename Input */}
                  <div className="flex flex-col gap-1 flex-1">
                    {isEditing ? (
                      <div className="flex flex-col gap-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRename(subject._id);
                            if (e.key === 'Escape') setEditingSubjectId(null);
                          }}
                          autoFocus
                          style={{ backgroundColor: '#0A1A1B', border: '1px solid rgba(78,201,212,0.4)', color: '#DAF1DE' }}
                          className="w-full px-3 py-1.5 rounded-lg text-sm focus:outline-none"
                        />
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => setEditingSubjectId(null)}
                            className="px-2.5 py-1 rounded-md text-xs text-slate-400 hover:text-white bg-white/5 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSaveRename(subject._id)}
                            style={{ background: 'linear-gradient(135deg, #A8D4DC 0%, #4EC9D4 100%)', color: '#040D0E' }}
                            className="px-2.5 py-1 rounded-md text-xs font-semibold transition-all"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <h3 className="font-jakarta font-bold text-lg leading-snug" style={{ color: '#DAF1DE' }}>{subject.name}</h3>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <Link
                      to={`/subjects/${subject._id}`}
                      state={{ subject }}
                      className="text-xs font-medium inline-flex items-center gap-1 hover:gap-2 transition-all"
                      style={{ background: 'linear-gradient(90deg, #A8D4DC, #4EC9D4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
                    >
                      View subject <span style={{ color: '#4EC9D4' }}>→</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deletingSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div
            style={{
              background: 'linear-gradient(145deg, #0c1e1f 0%, #0a1720 100%)',
              border: '1px solid rgba(248,113,113,0.3)',
              boxShadow: '0 0 32px rgba(248,113,113,0.15)',
            }}
            className="rounded-3xl p-6 max-w-md w-full flex flex-col gap-5"
          >
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="font-jakarta font-bold text-lg text-white">Delete Subject</h3>
            </div>

            <p className="text-sm text-slate-300">
              Delete subject <strong className="text-white">{deletingSubject.name}</strong> and all its materials, quizzes, and chat history? This cannot be undone.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setDeletingSubject(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-white/5 hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-500 transition-colors shadow-lg shadow-red-600/20"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubjectPage;
