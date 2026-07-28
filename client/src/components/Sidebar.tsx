import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import logo from '../assets/logo.png';
import GlobalSearch from './GlobalSearch';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  GraduationCap,
  BookOpen,
  Calendar,
  BarChart2,
  Settings,
  CheckSquare,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';

interface NavItem {
  name: string;
  path: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
  { name: 'My Semesters', path: '/semesters', icon: <GraduationCap className="w-4 h-4" /> },
  { name: 'Subjects', path: '/subjects', icon: <BookOpen className="w-4 h-4" /> },
  { name: 'Exams', path: '/exams', icon: <Calendar className="w-4 h-4" /> },
  { name: 'Quizzes', path: '/quizzes', icon: <CheckSquare className="w-4 h-4" /> },
  { name: 'Progress', path: '/reports', icon: <BarChart2 className="w-4 h-4" /> },
  { name: 'Calendar', path: '/calendar', icon: <Calendar className="w-4 h-4" /> },
  { name: 'Settings', path: '/settings', icon: <Settings className="w-4 h-4" /> },
];

export const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile Fixed Top Header Bar (md:hidden) */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-[#1E3A4A] border-b border-[#152B37] z-30 flex items-center justify-between px-4">
        <button
          type="button"
          onClick={() => setIsMobileOpen(true)}
          className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title="Open navigation menu"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <NavLink to="/" className="flex items-center gap-2 no-underline">
          <div className="w-7 h-7 rounded-lg bg-[#152B37] border border-white/10 flex items-center justify-center p-1 shrink-0">
            <img src={logo} alt="LearnOS" className="w-full h-full object-contain" />
          </div>
          <span className="font-sans font-semibold text-sm text-white tracking-tight">LearnOS</span>
        </NavLink>

        <div className="w-7 h-7 rounded-full bg-[#2E7C87] text-white font-medium text-xs flex items-center justify-center shrink-0 font-mono">
          {user?.name?.charAt(0).toUpperCase() || 'U'}
        </div>
      </div>

      {/* Semi-transparent Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 bg-black/60 z-40 md:hidden transition-opacity"
        />
      )}

      {/* Sidebar Navigation Drawer */}
      <aside
        className={`fixed top-0 left-0 bottom-0 w-64 bg-[#1E3A4A] border-r border-[#152B37] flex flex-col justify-between z-50 p-6 overflow-y-auto transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex flex-col gap-6">
          {/* Top Logo & Close Button Area */}
          <div className="flex items-center justify-between">
            <NavLink to="/" onClick={() => setIsMobileOpen(false)} className="flex items-center gap-3 no-underline px-1">
              <div className="w-8 h-8 rounded-lg bg-[#152B37] border border-white/10 flex items-center justify-center p-1.5 shrink-0">
                <img src={logo} alt="LearnOS" className="w-full h-full object-contain" />
              </div>
              <span className="font-sans font-semibold text-base text-white tracking-tight">
                LearnOS
              </span>
            </NavLink>

            {/* Close Button on Mobile */}
            <button
              type="button"
              onClick={() => setIsMobileOpen(false)}
              className="md:hidden p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Global Search Bar */}
          <GlobalSearch placeholder="Search workspace..." className="w-full" />

          {/* Nav Links */}
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                end={item.path === '/'}
                onClick={() => setIsMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors no-underline ${
                    isActive
                      ? 'bg-[#2E7C87] text-white font-semibold'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`
                }
              >
                <span className="shrink-0">{item.icon}</span>
                <span>{item.name}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Bottom Area: Profile Summary */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#2E7C87] text-white font-medium text-xs flex items-center justify-center shrink-0 font-mono">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-white truncate leading-tight">{user?.name || 'Student'}</span>
              <NavLink
                to="/settings"
                onClick={() => setIsMobileOpen(false)}
                className="text-xs text-[#2E7C87] hover:text-white transition-colors truncate no-underline font-medium mt-0.5 flex items-center gap-0.5"
              >
                <span>View Profile</span>
                <ChevronRight className="w-3 h-3" />
              </NavLink>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
