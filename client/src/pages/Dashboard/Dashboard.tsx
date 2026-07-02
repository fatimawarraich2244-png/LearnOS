import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
// @ts-ignore - axios.js is a javascript file
import API from '../../api/axios';

interface Semester {
  _id: string;
  name: string;
  createdAt?: string;
}

const Dashboard: React.FC = () => {
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [newSemester, setNewSemester] = useState('');
  const [loading, setLoading] = useState(true);
  const [addLoading, setAddLoading] = useState(false);
  const [error, setError] = useState('');

  const { user, logoutUser } = useAuth();

  useEffect(() => {
    const fetchSemesters = async () => {
      try {
        const res = await API.get('/semesters');
        setSemesters(res.data);
      } catch (err: any) {
        console.error(err);
        setError('Failed to fetch semesters');
      } finally {
        setLoading(false);
      }
    };

    fetchSemesters();
  }, []);

  const handleAddSemester = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSemester.trim()) return;

    setAddLoading(true);
    setError('');
    try {
      const res = await API.post('/semesters', { name: newSemester.trim() });
      setSemesters((prev) => [...prev, res.data]);
      setNewSemester('');
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to add semester');
    } finally {
      setAddLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Navbar */}
      <nav className="bg-slate-900 border-b border-slate-800 px-6 py-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-black bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent tracking-wider">
              LearnOS
            </span>
          </div>
          <div className="flex items-center space-x-6">
            <span className="text-slate-300 font-medium hidden sm:inline">
              Welcome, <span className="text-white font-bold">{user?.name || 'User'}</span>
            </span>
            <button
              onClick={logoutUser}
              className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700/80 border border-slate-700/60 rounded-xl transition duration-150 shadow-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-10 space-y-8 relative">
        {/* Decorative elements */}
        <div className="absolute top-0 right-10 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              My Semesters
            </h1>
            <p className="text-slate-400 mt-1">Manage and track your subjects by semester.</p>
          </div>

          {/* Add Semester Form */}
          <form onSubmit={handleAddSemester} className="flex gap-3 max-w-md w-full">
            <input
              type="text"
              placeholder="e.g., Fall 2026"
              value={newSemester}
              onChange={(e) => setNewSemester(e.target.value)}
              className="flex-1 px-4 py-3 bg-slate-900/60 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition duration-150 text-sm"
            />
            <button
              type="submit"
              disabled={addLoading}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition duration-150 shadow-md shadow-indigo-600/10 disabled:opacity-50 flex items-center gap-2"
            >
              {addLoading ? (
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : null}
              Add Semester
            </button>
          </form>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Semesters State Displays */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <svg className="animate-spin h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-slate-400 text-sm animate-pulse">Loading semesters...</p>
          </div>
        ) : semesters.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/30 border border-dashed border-slate-800 rounded-2xl">
            <svg
              className="mx-auto h-12 w-12 text-slate-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2m-4-1v8m0 0l3-3m-3 3L9 8m-5 5h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293h3.172a1 1 0 00.707-.293l2.414-2.414a1 1 0 01.707-.293H20"
              />
            </svg>
            <p className="mt-4 text-slate-400 font-medium">No semesters yet. Add one above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {semesters.map((semester) => (
              <div
                key={semester._id}
                className="bg-white rounded-2xl p-6 shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 flex flex-col justify-between border border-slate-100 group cursor-pointer"
              >
                <div>
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {semester.name}
                  </h3>
                  <div className="w-12 h-1 bg-indigo-500 rounded mt-3 transform origin-left scale-x-50 group-hover:scale-x-100 transition-transform duration-300"></div>
                </div>
                <div className="mt-8 flex justify-between items-center text-xs text-slate-400">
                  <span>Semester</span>
                  <span className="text-indigo-500 font-semibold group-hover:translate-x-1 transition-transform">
                    View subjects →
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
