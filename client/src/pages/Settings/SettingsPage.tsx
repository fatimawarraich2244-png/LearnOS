import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import { useAuth } from '../../context/AuthContext';
// @ts-ignore
import API from '../../api/axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Lock,
  Zap,
  Flame,
  AlertTriangle,
  X,
  ArrowLeft,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();

  // Profile Form State
  const [name, setName] = useState<string>(user?.name || '');
  const [email, setEmail] = useState<string>(user?.email || '');
  const [savingProfile, setSavingProfile] = useState<boolean>(false);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [changingPassword, setChangingPassword] = useState<boolean>(false);

  // Account Stats State
  const [userStats, setUserStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState<boolean>(true);

  // Danger Zone Modal State
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [deletePasswordConfirm, setDeletePasswordConfirm] = useState<string>('');
  const [deletingAccount, setDeletingAccount] = useState<boolean>(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
    }
  }, [user]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await API.get('/stats');
        setUserStats(res.data);
      } catch (err) {
        console.error('Failed to fetch user stats', err);
      } finally {
        setLoadingStats(false);
      }
    };
    fetchStats();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error('Name and email cannot be empty');
      return;
    }

    setSavingProfile(true);
    try {
      const res = await API.put('/auth/profile', {
        name: name.trim(),
        email: email.trim(),
      });

      updateUser({
        name: res.data.name,
        email: res.data.email,
      });

      toast.success('Profile updated successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New password and confirmation do not match');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }

    setChangingPassword(true);
    try {
      await API.put('/auth/change-password', {
        currentPassword,
        newPassword,
      });

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password changed successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deletePasswordConfirm) {
      toast.error('Please enter your password to confirm deletion');
      return;
    }

    setDeletingAccount(true);
    try {
      await API.delete('/auth/account', {
        data: { password: deletePasswordConfirm },
      });

      toast.success('Your account has been deleted');
      logout();
      navigate('/login');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete account');
    } finally {
      setDeletingAccount(false);
    }
  };

  return (
    <div className="min-h-screen font-sans flex bg-[#F0F4F7] text-[#1E3A4A]">
      {/* ── Persistent Sidebar Navigation ── */}
      <Sidebar />

      {/* ── Main Content Area ── */}
      <main className="flex-1 ml-0 md:ml-64 pt-14 md:pt-0 min-h-screen flex flex-col overflow-y-auto bg-[#F0F4F7]">
        <div className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-4 sm:gap-6">

          {/* Top Header Row */}
          <div className="pb-4 border-b border-[#E5E7EB]">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs text-[#2E7C87] font-semibold hover:underline mb-2 no-underline"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Dashboard</span>
            </Link>
            <h1 className="font-sans font-semibold text-[#1E3A4A] text-lg md:text-xl tracking-tight">
              Account Settings
            </h1>
            <p className="text-sm text-[#6B7B85] mt-0.5 font-normal">
              Manage personal profile, security credentials, and account preferences.
            </p>
          </div>

          {/* SECTION 1: PROFILE SECTION */}
          <div className="bg-white rounded-2xl p-6 border border-[#E5E7EB] flex flex-col gap-4">
            <div className="flex items-center gap-3 pb-3 border-b border-[#E5E7EB]">
              <User className="w-5 h-5 text-[#2E7C87]" />
              <div>
                <h2 className="font-sans font-semibold text-base text-[#1E3A4A]">Personal Profile</h2>
                <p className="text-xs text-[#6B7B85]">Update display name and email address</p>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="flex flex-col gap-4 max-w-md">
              <div>
                <label className="block text-xs font-semibold text-[#6B7B85] mb-1 uppercase tracking-wide">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-xs font-medium text-[#1E3A4A] bg-white focus:outline-none focus:border-[#2E7C87]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6B7B85] mb-1 uppercase tracking-wide">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-xs font-medium text-[#1E3A4A] bg-white focus:outline-none focus:border-[#2E7C87]"
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#2E7C87] hover:bg-[#256770] disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {savingProfile ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>

          {/* SECTION 2: CHANGE PASSWORD SECTION */}
          <div className="bg-white rounded-2xl p-6 border border-[#E5E7EB] flex flex-col gap-4">
            <div className="flex items-center gap-3 pb-3 border-b border-[#E5E7EB]">
              <Lock className="w-5 h-5 text-[#2E7C87]" />
              <div>
                <h2 className="font-sans font-semibold text-base text-[#1E3A4A]">Security & Password</h2>
                <p className="text-xs text-[#6B7B85]">Change account security password</p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="flex flex-col gap-4 max-w-md">
              <div>
                <label className="block text-xs font-semibold text-[#6B7B85] mb-1 uppercase tracking-wide">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-xs font-medium text-[#1E3A4A] bg-white focus:outline-none focus:border-[#2E7C87]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6B7B85] mb-1 uppercase tracking-wide">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-xs font-medium text-[#1E3A4A] bg-white focus:outline-none focus:border-[#2E7C87]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6B7B85] mb-1 uppercase tracking-wide">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-xs font-medium text-[#1E3A4A] bg-white focus:outline-none focus:border-[#2E7C87]"
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#2E7C87] hover:bg-[#256770] disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {changingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>

          {/* SECTION 3: ACCOUNT STATS SECTION */}
          <div className="bg-white rounded-2xl p-6 border border-[#E5E7EB] flex flex-col gap-4">
            <div className="flex items-center gap-3 pb-3 border-b border-[#E5E7EB]">
              <Zap className="w-5 h-5 text-[#2E7C87]" />
              <div>
                <h2 className="font-sans font-semibold text-base text-[#1E3A4A]">Account Metrics</h2>
                <p className="text-xs text-[#6B7B85]">Overview of progression and member statistics</p>
              </div>
            </div>

            {loadingStats ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin h-5 w-5 border-2 border-[#2E7C87] border-t-transparent rounded-full" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl border border-[#E5E7EB] bg-[#F0F4F7] flex flex-col gap-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-[#6B7B85]">Status</span>
                  <span className="font-sans font-semibold text-xs text-[#1E3A4A]">Active Student</span>
                </div>

                <div className="p-4 rounded-xl border border-[#E5E7EB] bg-[#F0F4F7] flex flex-col gap-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-[#6B7B85]">Experience</span>
                  <span className="font-mono font-semibold text-xs text-[#2E7C87] [font-variant-numeric:tabular-nums]">
                    {userStats?.xp || 0} XP
                  </span>
                </div>

                <div className="p-4 rounded-xl border border-[#E5E7EB] bg-[#F0F4F7] flex flex-col gap-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-[#6B7B85]">Level</span>
                  <span className="font-mono font-semibold text-xs text-[#1E3A4A] [font-variant-numeric:tabular-nums]">
                    Level {userStats?.level || 1}
                  </span>
                </div>

                <div className="p-4 rounded-xl border border-[#E5E7EB] bg-[#F0F4F7] flex flex-col gap-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-[#6B7B85]">Streak</span>
                  <div className="flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-[#2E7C87]" />
                    <span className="font-mono font-semibold text-xs text-[#1E3A4A] [font-variant-numeric:tabular-nums]">
                      {userStats?.streak || 0} days
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 4: DANGER ZONE SECTION */}
          <div className="bg-white rounded-2xl p-6 border border-red-200 flex flex-col gap-4">
            <div className="flex items-center gap-3 pb-3 border-b border-red-100">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <div>
                <h2 className="font-sans font-semibold text-base text-red-600">Danger Zone</h2>
                <p className="text-xs text-[#6B7B85]">Permanently delete account and all study data</p>
              </div>
            </div>

            <div className="flex items-center justify-between flex-wrap gap-4">
              <p className="text-xs text-[#6B7B85]">
                Account deletion removes all semesters, subjects, materials, and quiz records permanently.
              </p>
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors cursor-pointer"
              >
                Delete Account
              </button>
            </div>
          </div>

        </div>
      </main>

      {/* Delete Account Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md p-6 rounded-2xl bg-white border border-[#E5E7EB] shadow-xl flex flex-col gap-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
                <h3 className="font-sans font-semibold text-base text-red-600 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span>Confirm Account Deletion</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="p-1 text-[#6B7B85] hover:text-[#1E3A4A] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-[#6B7B85] leading-relaxed">
                This action is <strong className="text-red-600 font-semibold">irreversible</strong>. All your study materials, flashcards, chat history, and exam scores will be permanently deleted.
              </p>

              <form onSubmit={handleDeleteAccount} className="flex flex-col gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#6B7B85] mb-1 uppercase tracking-wide">
                    Enter Password to Confirm
                  </label>
                  <input
                    type="password"
                    value={deletePasswordConfirm}
                    onChange={(e) => setDeletePasswordConfirm(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-xs font-medium text-[#1E3A4A] bg-white focus:outline-none focus:border-red-600"
                    autoFocus
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(false)}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-[#6B7B85] hover:bg-[#F0F4F7] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={deletingAccount || !deletePasswordConfirm}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    {deletingAccount ? 'Deleting Account...' : 'Permanently Delete'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SettingsPage;
