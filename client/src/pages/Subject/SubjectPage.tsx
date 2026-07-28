import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
// @ts-ignore
import API from '../../api/axios';
import toast from 'react-hot-toast';
import {
  BookOpen,
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  ArrowLeft,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';

interface Subject {
  _id: string;
  name: string;
  semesterId: string;
  createdAt?: string;
}

const SubjectPage: React.FC = () => {
  const { semesterId } = useParams();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [newSubject, setNewSubject] = useState('');
  const [loading, setLoading] = useState(true);
  const [addLoading, setAddLoading] = useState(false);

  // Dropdown & Edit & Delete modal states
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deletingSubject, setDeletingSubject] = useState<Subject | null>(null);

  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await API.get(`/subjects/${semesterId}`);
        setSubjects(res.data);
      } catch (err: any) {
        toast.error('Failed to fetch subjects');
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
      toast.success('Subject added successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to add subject');
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
      toast.success('Subject renamed successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to rename subject');
    } finally {
      setEditingSubjectId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingSubject) return;
    try {
      await API.delete(`/subjects/${deletingSubject._id}`);
      setSubjects((prev) => prev.filter((s) => s._id !== deletingSubject._id));
      toast.success('Subject deleted successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete subject');
    } finally {
      setDeletingSubject(null);
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
                  to="/semesters"
                  className="inline-flex items-center gap-1 text-xs text-[#2E7C87] font-semibold hover:underline no-underline"
                >
                  <span>Semesters List</span>
                </Link>
              </div>
              <h1 className="font-sans font-semibold text-[#1E3A4A] text-lg md:text-xl tracking-tight">
                Semester Subjects
              </h1>
              <p className="text-sm text-[#6B7B85] mt-0.5 font-normal">
                Manage and study course subjects assigned to this semester.
              </p>
            </div>

            {/* Add subject form */}
            <form onSubmit={handleAddSubject} className="flex items-center gap-2 max-w-md w-full">
              <input
                type="text"
                placeholder="Add new subject (e.g. Data Structures)..."
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                maxLength={100}
                className="flex-1 px-3 py-2 rounded-lg border border-[#E5E7EB] text-xs font-medium text-[#1E3A4A] bg-white placeholder-[#6B7B85]/60 focus:outline-none focus:border-[#2E7C87]"
              />
              <button
                type="submit"
                disabled={addLoading || !newSubject.trim()}
                className="px-4 py-2 rounded-lg text-xs font-medium text-white bg-[#2E7C87] hover:bg-[#256770] disabled:opacity-50 transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Subject</span>
              </button>
            </form>
          </div>

          {/* Section Subtitle */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold uppercase tracking-wide text-[#6B7B85]">
              Enrolled Subjects ({subjects.length})
            </span>
          </div>

          {/* Subjects Grid */}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin h-6 w-6 border-2 border-[#2E7C87] border-t-transparent rounded-full" />
            </div>
          ) : subjects.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 border border-dashed border-[#E5E7EB] text-center text-xs text-[#6B7B85]">
              No subjects added to this semester yet. Use the input above to create your first subject.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {subjects.map((subject) => {
                const isMenuOpen = openMenuId === subject._id;
                const isEditing = editingSubjectId === subject._id;

                return (
                  <div
                    key={subject._id}
                    className="bg-white rounded-2xl p-6 border border-[#E5E7EB] flex flex-col justify-between gap-5 h-full transition-colors"
                  >
                    {/* Top Row: Icon + 3-dot Menu */}
                    <div className="flex items-start justify-between">
                      <div className="w-10 h-10 rounded-xl bg-[#2E7C87]/10 text-[#2E7C87] flex items-center justify-center shrink-0">
                        <BookOpen className="w-5 h-5" />
                      </div>

                      {/* Dropdown Menu */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(isMenuOpen ? null : subject._id);
                          }}
                          className="p-1 rounded-lg text-[#6B7B85] hover:text-[#1E3A4A] hover:bg-[#F0F4F7] transition-colors cursor-pointer"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {isMenuOpen && (
                          <div
                            ref={menuRef}
                            className="absolute right-0 mt-1 w-36 bg-white border border-[#E5E7EB] rounded-xl shadow-lg py-1 z-20 overflow-hidden"
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingSubjectId(subject._id);
                                setEditName(subject.name);
                                setOpenMenuId(null);
                              }}
                              className="w-full text-left px-3 py-2 text-xs font-medium text-[#1E3A4A] hover:bg-[#F0F4F7] flex items-center gap-2 transition-colors cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5 text-[#2E7C87]" />
                              <span>Rename</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingSubject(subject);
                                setOpenMenuId(null);
                              }}
                              className="w-full text-left px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-500" />
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Subject Name / Edit Form */}
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
                            maxLength={100}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-[#2E7C87] text-xs font-medium text-[#1E3A4A] bg-white focus:outline-none"
                          />
                          <div className="flex gap-2 justify-end">
                            <button
                              type="button"
                              onClick={() => setEditingSubjectId(null)}
                              className="px-2 py-1 rounded-md text-xs font-medium text-[#6B7B85] hover:bg-[#F0F4F7] transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveRename(subject._id)}
                              className="px-2 py-1 rounded-md text-xs font-semibold text-white bg-[#2E7C87] hover:bg-[#256770] transition-colors"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <h3 className="font-sans font-semibold text-base text-[#1E3A4A] leading-snug">
                          {subject.name}
                        </h3>
                      )}
                      <p className="text-xs text-[#6B7B85] font-normal">
                        Materials, AI Chat, and Quizzes
                      </p>
                    </div>

                    {/* Action Footer */}
                    <div className="pt-3 border-t border-[#E5E7EB]">
                      <Link
                        to={`/subjects/${subject._id}`}
                        state={{ subject }}
                        className="text-xs font-medium text-[#2E7C87] hover:underline flex items-center justify-between no-underline"
                      >
                        <span>Open Subject Workspace</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {deletingSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 border border-[#E5E7EB] shadow-xl max-w-md w-full flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-sans font-semibold text-base text-[#1E3A4A]">Delete Subject</h3>
                <p className="text-xs text-[#6B7B85]">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-[#6B7B85] leading-relaxed">
              Are you sure you want to delete <strong className="text-[#1E3A4A] font-semibold">{deletingSubject.name}</strong>? All associated study materials, quiz results, and chat history will be permanently deleted.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#E5E7EB]">
              <button
                type="button"
                onClick={() => setDeletingSubject(null)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-[#6B7B85] hover:bg-[#F0F4F7] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors"
              >
                Delete Subject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubjectPage;
