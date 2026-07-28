import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
// @ts-ignore
import API from '../../api/axios';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Search,
  GraduationCap,
  ChevronRight,
  Clock,
  ArrowLeft,
} from 'lucide-react';

interface SubjectItem {
  _id: string;
  name: string;
  semesterId?: {
    _id: string;
    name: string;
  } | null;
  studyTimeMinutes?: number;
  weakTopicsCount?: number;
  strongTopicsCount?: number;
  createdAt?: string;
}

export const AllSubjectsPage: React.FC = () => {
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterQuery, setFilterQuery] = useState<string>('');

  useEffect(() => {
    const fetchAllSubjects = async () => {
      try {
        const res = await API.get('/subjects/all');
        setSubjects(res.data);
      } catch (err: any) {
        toast.error('Failed to fetch subjects');
      } finally {
        setLoading(false);
      }
    };

    fetchAllSubjects();
  }, []);

  const filteredSubjects = subjects.filter((subj) =>
    subj.name.toLowerCase().includes(filterQuery.toLowerCase().trim())
  );

  const groupedBySemester: { [semName: string]: SubjectItem[] } = {};
  filteredSubjects.forEach((subj) => {
    const semName = subj.semesterId?.name || 'Unassigned Semester';
    if (!groupedBySemester[semName]) {
      groupedBySemester[semName] = [];
    }
    groupedBySemester[semName].push(subj);
  });

  const semesterNames = Object.keys(groupedBySemester);

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
                All Subjects
              </h1>
              <p className="text-sm text-[#6B7B85] mt-0.5 font-normal">
                Explore course subjects across your entire academic timeline.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2E7C87]" />
              <span className="text-xs font-semibold text-[#1E3A4A] font-mono [font-variant-numeric:tabular-nums]">
                {subjects.length} {subjects.length === 1 ? 'Subject' : 'Subjects'} Enrolled
              </span>
            </div>
          </div>

          {/* Search Filter Bar */}
          <div className="bg-white rounded-2xl p-4 border border-[#E5E7EB] flex items-center gap-3">
            <Search className="w-4 h-4 text-[#6B7B85] shrink-0" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Search subjects by name across all semesters..."
              className="flex-1 text-xs font-medium text-[#1E3A4A] placeholder-[#6B7B85]/60 bg-transparent focus:outline-none"
            />
            {filterQuery && (
              <button
                type="button"
                onClick={() => setFilterQuery('')}
                className="text-xs font-medium text-[#6B7B85] hover:text-[#1E3A4A] transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          {/* Subjects Content */}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin h-6 w-6 border-2 border-[#2E7C87] border-t-transparent rounded-full" />
            </div>
          ) : filteredSubjects.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 border border-dashed border-[#E5E7EB] text-center text-xs text-[#6B7B85]">
              {filterQuery ? `No subjects found matching "${filterQuery}"` : 'No subjects enrolled yet.'}
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              {semesterNames.map((semName) => {
                const semesterSubjects = groupedBySemester[semName];

                return (
                  <div key={semName} className="flex flex-col gap-4">
                    {/* Semester Group Header */}
                    <div className="flex items-center justify-between pb-2 border-b border-[#E5E7EB]">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-[#2E7C87]" />
                        <h2 className="text-sm font-semibold uppercase tracking-wide text-[#6B7B85]">
                          {semName}
                        </h2>
                      </div>
                      <span className="text-xs font-medium text-[#6B7B85] font-mono [font-variant-numeric:tabular-nums]">
                        {semesterSubjects.length} {semesterSubjects.length === 1 ? 'course' : 'courses'}
                      </span>
                    </div>

                    {/* Subject Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                      {semesterSubjects.map((subj, idx) => {
                        const studyMins = subj.studyTimeMinutes || 0;
                        const studyHours = (studyMins / 60).toFixed(1);

                        return (
                          <motion.div
                            key={subj._id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.03 }}
                            className="bg-white rounded-2xl p-6 border border-[#E5E7EB] flex flex-col justify-between gap-4 h-full"
                          >
                            <div className="flex flex-col gap-2">
                              <div className="w-9 h-9 rounded-lg bg-[#2E7C87]/10 text-[#2E7C87] flex items-center justify-center shrink-0">
                                <BookOpen className="w-4 h-4" />
                              </div>
                              <h3 className="font-sans font-semibold text-base text-[#1E3A4A] leading-snug">
                                {subj.name}
                              </h3>
                              <p className="text-xs text-[#6B7B85] font-normal">
                                Semester: {subj.semesterId?.name || 'Unassigned'}
                              </p>
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-[#E5E7EB]">
                              <div className="flex items-center gap-1.5 text-xs text-[#6B7B85]">
                                <Clock className="w-3.5 h-3.5 text-[#2E7C87]" />
                                <span className="font-mono font-medium text-[#1E3A4A] [font-variant-numeric:tabular-nums]">
                                  {studyHours}h studied
                                </span>
                              </div>

                              <Link
                                to={`/subjects/${subj._id}`}
                                className="text-xs font-medium text-[#2E7C87] hover:underline flex items-center gap-0.5 no-underline"
                              >
                                <span>Open</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </Link>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default AllSubjectsPage;
