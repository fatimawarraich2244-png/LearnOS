import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
// @ts-ignore
import API from '../../api/axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap,
  Plus,
  MoreVertical,
  BookOpen,
  Pencil,
  Trash2,
  ArrowLeft,
} from 'lucide-react';

interface Semester {
  _id: string;
  name: string;
  createdAt?: string;
  subjectCount?: number;
}

export const SemestersPage: React.FC = () => {
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [newSemesterName, setNewSemesterName] = useState<string>('');
  const [creating, setCreating] = useState<boolean>(false);

  // Rename & Delete state
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [editingSemesterId, setEditingSemesterId] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState<string>('');

  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    fetchSemesters();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCreateSemester = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSemesterName.trim()) return;

    setCreating(true);
    try {
      const res = await API.post('/semesters', { name: newSemesterName.trim() });
      setSemesters((prev) => [...prev, res.data]);
      setNewSemesterName('');
      toast.success('Semester created successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create semester');
    } finally {
      setCreating(false);
    }
  };

  const handleSaveRename = async (semesterId: string) => {
    if (!renameInput.trim()) return;
    try {
      const res = await API.put(`/semesters/${semesterId}`, { name: renameInput.trim() });
      setSemesters((prev) =>
        prev.map((s) => (s._id === semesterId ? { ...s, name: res.data.name } : s))
      );
      setEditingSemesterId(null);
      setActiveMenuId(null);
      toast.success('Semester renamed successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to rename semester');
    }
  };

  const handleDeleteSemester = async (semesterId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      await API.delete(`/semesters/${semesterId}`);
      setSemesters((prev) => prev.filter((s) => s._id !== semesterId));
      setActiveMenuId(null);
      toast.success('Semester deleted');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete semester');
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
                My Semesters
              </h1>
              <p className="text-sm text-[#6B7B85] mt-0.5 font-normal">
                Organize academic terms, course curriculum, and semester progress.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2E7C87]" />
              <span className="text-xs font-semibold text-[#1E3A4A] font-mono [font-variant-numeric:tabular-nums]">
                {semesters.length} {semesters.length === 1 ? 'Semester' : 'Semesters'} Total
              </span>
            </div>
          </div>

          {/* Add Semester Form Card */}
          <div className="bg-white rounded-2xl p-6 border border-[#E5E7EB] flex flex-col gap-4">
            <div>
              <h2 className="font-sans font-semibold text-base text-[#1E3A4A]">Create New Semester</h2>
              <p className="text-xs text-[#6B7B85] mt-0.5 font-normal">Add an academic term to structure your subjects.</p>
            </div>

            <form onSubmit={handleCreateSemester} className="flex items-center gap-3 max-w-xl w-full">
              <input
                type="text"
                value={newSemesterName}
                onChange={(e) => setNewSemesterName(e.target.value)}
                placeholder="e.g. Fall 2026, Semester 4, Spring Term..."
                maxLength={100}
                className="flex-1 px-3 py-2 rounded-lg border border-[#E5E7EB] text-xs font-medium text-[#1E3A4A] bg-white placeholder-[#6B7B85]/60 focus:outline-none focus:border-[#2E7C87]"
              />
              <button
                type="submit"
                disabled={creating || !newSemesterName.trim()}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#2E7C87] hover:bg-[#256770] disabled:opacity-50 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{creating ? 'Creating...' : 'Add Semester'}</span>
              </button>
            </form>
          </div>

          {/* Semester List Card */}
          <div className="bg-white rounded-2xl p-6 border border-[#E5E7EB] flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[#6B7B85]">
                Academic Timeline
              </h2>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin h-6 w-6 border-2 border-[#2E7C87] border-t-transparent rounded-full" />
              </div>
            ) : semesters.length === 0 ? (
              <div className="bg-[#F0F4F7] rounded-xl p-8 border border-dashed border-[#E5E7EB] text-center text-xs text-[#6B7B85]">
                No semesters created yet. Add your first semester using the form above.
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {semesters.map((sem, idx) => {
                  const isEditing = editingSemesterId === sem._id;
                  const isMenuOpen = activeMenuId === sem._id;

                  return (
                    <motion.div
                      key={sem._id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      className="bg-[#F0F4F7] rounded-xl p-4 border border-[#E5E7EB] flex items-center justify-between gap-4 transition-colors"
                    >
                      {isEditing ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            value={renameInput}
                            onChange={(e) => setRenameInput(e.target.value)}
                            className="px-3 py-1.5 rounded-lg border border-[#2E7C87] text-xs font-medium text-[#1E3A4A] bg-white focus:outline-none flex-1"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveRename(sem._id)}
                            className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-[#2E7C87] hover:bg-[#256770] transition-colors"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingSemesterId(null)}
                            className="px-3 py-1.5 rounded-md text-xs font-medium text-[#6B7B85] hover:bg-white transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => navigate(`/semesters/${sem._id}`)}
                          className="flex-1 flex items-center gap-3 cursor-pointer group min-w-0"
                        >
                          <div className="w-9 h-9 rounded-lg bg-[#2E7C87]/10 text-[#2E7C87] flex items-center justify-center shrink-0">
                            <GraduationCap className="w-4 h-4" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <h3 className="font-sans font-semibold text-sm text-[#1E3A4A] group-hover:text-[#2E7C87] transition-colors truncate">
                              {sem.name}
                            </h3>
                            <p className="text-xs text-[#6B7B85] font-normal truncate">
                              <span className="text-[#1E3A4A] font-medium [font-variant-numeric:tabular-nums]">{sem.subjectCount ?? 0}</span>{' '}
                              {(sem.subjectCount ?? 0) === 1 ? 'Subject' : 'Subjects'} enrolled
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Dropdown Menu */}
                      <div className="relative" ref={isMenuOpen ? menuRef : null}>
                        <button
                          type="button"
                          onClick={() => setActiveMenuId(isMenuOpen ? null : sem._id)}
                          className="p-1.5 rounded-lg text-[#6B7B85] hover:text-[#1E3A4A] hover:bg-white transition-colors cursor-pointer"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        <AnimatePresence>
                          {isMenuOpen && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              className="absolute right-0 top-full mt-1 w-40 bg-white border border-[#E5E7EB] rounded-xl shadow-lg z-30 overflow-hidden py-1"
                            >
                              <button
                                type="button"
                                onClick={() => navigate(`/semesters/${sem._id}`)}
                                className="w-full text-left px-3 py-2 text-xs font-medium text-[#1E3A4A] hover:bg-[#F0F4F7] flex items-center gap-2 transition-colors cursor-pointer"
                              >
                                <BookOpen className="w-3.5 h-3.5 text-[#2E7C87]" />
                                <span>Open Subjects</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingSemesterId(sem._id);
                                  setRenameInput(sem.name);
                                  setActiveMenuId(null);
                                }}
                                className="w-full text-left px-3 py-2 text-xs font-medium text-[#1E3A4A] hover:bg-[#F0F4F7] flex items-center gap-2 transition-colors cursor-pointer"
                              >
                                <Pencil className="w-3.5 h-3.5 text-[#2E7C87]" />
                                <span>Rename</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteSemester(sem._id, sem.name)}
                                className="w-full text-left px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                <span>Delete</span>
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
};

export default SemestersPage;
