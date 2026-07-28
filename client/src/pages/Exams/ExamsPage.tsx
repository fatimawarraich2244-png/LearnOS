import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
// @ts-ignore
import API from '../../api/axios';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import {
  Calendar as CalendarIcon,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  Clock,
  ArrowLeft,
} from 'lucide-react';

interface SubjectOption {
  _id: string;
  name: string;
  semesterId?: any;
}

interface ExamItem {
  _id: string;
  name: string;
  examDate: string;
  subjectId: {
    _id: string;
    name: string;
  } | null;
  createdAt?: string;
}

export const ExamsPage: React.FC = () => {
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Form State
  const [subjectId, setSubjectId] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [examDate, setExamDate] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Filter State
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');

  // Edit State
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [editSubjectId, setEditSubjectId] = useState<string>('');
  const [editName, setEditName] = useState<string>('');
  const [editExamDate, setEditExamDate] = useState<string>('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [examsRes, subjectsRes] = await Promise.all([
        API.get('/exams'),
        API.get('/subjects/all'),
      ]);
      setExams(examsRes.data);
      setSubjects(subjectsRes.data);
      if (subjectsRes.data.length > 0 && !subjectId) {
        setSubjectId(subjectsRes.data[0]._id);
      }
    } catch (err: any) {
      toast.error('Failed to load exams and subjects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectId || !name.trim() || !examDate) {
      toast.error('Please fill in all fields');
      return;
    }

    setSubmitting(true);
    try {
      const res = await API.post('/exams', {
        subjectId,
        name: name.trim(),
        examDate,
      });
      setExams((prev) => [...prev, res.data]);
      setName('');
      setExamDate('');
      toast.success('Exam schedule created!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create exam');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartEdit = (exam: ExamItem) => {
    setEditingExamId(exam._id);
    setEditSubjectId(exam.subjectId ? exam.subjectId._id : subjects[0]?._id || '');
    setEditName(exam.name);
    const d = new Date(exam.examDate);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setEditExamDate(dateStr);
  };

  const handleSaveEdit = async (examId: string) => {
    if (!editName.trim() || !editExamDate) return;

    try {
      const res = await API.put(`/exams/${examId}`, {
        subjectId: editSubjectId,
        name: editName.trim(),
        examDate: editExamDate,
      });
      setExams((prev) => prev.map((e) => (e._id === examId ? res.data : e)));
      setEditingExamId(null);
      toast.success('Exam updated successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update exam');
    }
  };

  const handleDeleteExam = async (examId: string, examName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${examName}"?`)) return;

    try {
      await API.delete(`/exams/${examId}`);
      setExams((prev) => prev.filter((e) => e._id !== examId));
      toast.success('Exam deleted');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete exam');
    }
  };

  const filteredExams = exams.filter((e) => {
    if (selectedSubjectFilter === 'all') return true;
    return e.subjectId && e.subjectId._id === selectedSubjectFilter;
  });

  const getDaysDiff = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(dateStr);
    targetDate.setHours(0, 0, 0, 0);
    const diffTime = targetDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const formatExamDateNice = (dateStr: string) => {
    const d = new Date(dateStr);
    const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
    const day = String(d.getDate()).padStart(2, '0');
    return { month, day };
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingExams = filteredExams
    .filter((e) => new Date(e.examDate) >= today)
    .sort((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime());

  const pastExams = filteredExams
    .filter((e) => new Date(e.examDate) < today)
    .sort((a, b) => new Date(b.examDate).getTime() - new Date(a.examDate).getTime());

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
                Exam Schedule
              </h1>
              <p className="text-sm text-[#6B7B85] mt-0.5 font-normal">
                Track upcoming assessments, set study milestones, and view exam countdowns.
              </p>
            </div>

            {/* Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#6B7B85]">Filter:</span>
              <select
                value={selectedSubjectFilter}
                onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-xs font-medium text-[#1E3A4A] bg-white focus:outline-none focus:border-[#2E7C87]"
              >
                <option value="all">All Subjects ({exams.length})</option>
                {subjects.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Add Exam Form Card */}
          <div className="bg-white rounded-2xl p-6 border border-[#E5E7EB] flex flex-col gap-4">
            <div>
              <h2 className="font-sans font-semibold text-base text-[#1E3A4A]">Schedule New Exam</h2>
              <p className="text-xs text-[#6B7B85] mt-0.5 font-normal">Set target dates for AI planner sequence and reminder notifications.</p>
            </div>

            <form onSubmit={handleCreateExam} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#6B7B85] mb-1 uppercase tracking-wide">
                  Subject
                </label>
                <select
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-xs font-medium text-[#1E3A4A] bg-white focus:outline-none focus:border-[#2E7C87]"
                >
                  {subjects.length === 0 && <option value="">No subjects available</option>}
                  {subjects.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6B7B85] mb-1 uppercase tracking-wide">
                  Exam Title
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Midterm Exam, Final Assessment..."
                  className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-xs font-medium text-[#1E3A4A] bg-white placeholder-[#6B7B85]/60 focus:outline-none focus:border-[#2E7C87]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6B7B85] mb-1 uppercase tracking-wide">
                  Target Date
                </label>
                <input
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-xs font-medium text-[#1E3A4A] bg-white focus:outline-none focus:border-[#2E7C87]"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={submitting || !name.trim() || !examDate}
                  className="w-full py-2 rounded-lg text-xs font-semibold text-white bg-[#2E7C87] hover:bg-[#256770] disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Scheduling...' : 'Add Exam'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Section 1: Upcoming Exams */}
          <div className="bg-white rounded-2xl p-6 border border-[#E5E7EB] flex flex-col gap-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-[#2E7C87]" />
                <h2 className="text-sm font-semibold uppercase tracking-wide text-[#6B7B85]">
                  Upcoming Exams
                </h2>
              </div>
              <span className="text-xs font-semibold text-[#1E3A4A] font-mono [font-variant-numeric:tabular-nums]">
                {upcomingExams.length} Scheduled
              </span>
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin h-6 w-6 border-2 border-[#2E7C87] border-t-transparent rounded-full" />
              </div>
            ) : upcomingExams.length === 0 ? (
              <div className="bg-[#F0F4F7] rounded-xl p-8 border border-dashed border-[#E5E7EB] text-center text-xs text-[#6B7B85]">
                No upcoming exams scheduled.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcomingExams.map((exam, idx) => {
                  const daysDiff = getDaysDiff(exam.examDate);
                  const isEditing = editingExamId === exam._id;
                  const { month, day } = formatExamDateNice(exam.examDate);

                  return (
                    <motion.div
                      key={exam._id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="bg-[#F0F4F7] rounded-xl p-4 border border-[#E5E7EB] flex flex-col justify-between gap-4"
                    >
                      {isEditing ? (
                        <div className="flex flex-col gap-3">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="px-3 py-1.5 rounded-lg border border-[#2E7C87] text-xs font-medium text-[#1E3A4A] bg-white"
                          />
                          <div className="flex gap-2">
                            <select
                              value={editSubjectId}
                              onChange={(e) => setEditSubjectId(e.target.value)}
                              className="px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-xs font-medium text-[#1E3A4A] bg-white flex-1"
                            >
                              {subjects.map((s) => (
                                <option key={s._id} value={s._id}>{s.name}</option>
                              ))}
                            </select>
                            <input
                              type="date"
                              value={editExamDate}
                              onChange={(e) => setEditExamDate(e.target.value)}
                              className="px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-xs font-medium text-[#1E3A4A] bg-white"
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(exam._id)}
                              className="px-3 py-1 rounded-md text-xs font-semibold text-white bg-[#2E7C87] hover:bg-[#256770]"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingExamId(null)}
                              className="px-3 py-1 rounded-md text-xs font-medium text-[#6B7B85] hover:bg-white"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start gap-3">
                            <div className="bg-[#1E3A4A] rounded-lg p-2 w-11 h-11 flex flex-col items-center justify-center shrink-0">
                              <span className="font-mono text-[9px] text-[#2E7C87] font-semibold uppercase">{month}</span>
                              <span className="font-mono text-sm font-semibold text-white leading-none mt-0.5 [font-variant-numeric:tabular-nums]">{day}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-sans font-semibold text-sm text-[#1E3A4A] truncate">{exam.name}</h3>
                              <p className="text-xs text-[#6B7B85] font-normal truncate mt-0.5">
                                {exam.subjectId?.name || 'Subject'}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-[#2E7C87] font-medium shrink-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#2E7C87]" />
                              <span className="font-mono [font-variant-numeric:tabular-nums]">
                                {daysDiff === 0 ? 'Today' : daysDiff === 1 ? 'Tomorrow' : `In ${daysDiff}d`}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E7EB]">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(exam)}
                              className="p-1 text-[#6B7B85] hover:text-[#1E3A4A] transition-colors cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteExam(exam._id, exam.name)}
                              className="p-1 text-[#6B7B85] hover:text-red-600 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2: Past Exams */}
          <div className="bg-white rounded-2xl p-6 border border-[#E5E7EB] flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#6B7B85]" />
                <h2 className="text-sm font-semibold uppercase tracking-wide text-[#6B7B85]">
                  Past Exams
                </h2>
              </div>
              <span className="text-xs font-semibold text-[#6B7B85] font-mono [font-variant-numeric:tabular-nums]">
                {pastExams.length} Completed
              </span>
            </div>

            {pastExams.length === 0 ? (
              <div className="bg-[#F0F4F7] rounded-xl p-6 text-center text-xs text-[#6B7B85] border border-dashed border-[#E5E7EB]">
                No past exams recorded.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-80">
                {pastExams.map((exam) => (
                  <div
                    key={exam._id}
                    className="bg-[#F0F4F7] rounded-xl p-4 border border-[#E5E7EB] flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Clock className="w-4 h-4 text-[#6B7B85] shrink-0" />
                      <div className="min-w-0">
                        <h4 className="font-sans font-semibold text-xs text-[#1E3A4A] truncate">{exam.name}</h4>
                        <p className="text-[11px] text-[#6B7B85] truncate">{exam.subjectId?.name || 'Subject'}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteExam(exam._id, exam.name)}
                      className="p-1 text-[#6B7B85] hover:text-red-600 transition-colors shrink-0 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
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

export default ExamsPage;
