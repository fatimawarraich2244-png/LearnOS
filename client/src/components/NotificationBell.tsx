import React, { useState, useEffect, useRef } from 'react';
// @ts-ignore
import API from '../api/axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Zap,
  Trophy,
  Flame,
  CheckSquare,
  GraduationCap,
  CheckCheck,
  Trash2,
  CheckCircle2,
} from 'lucide-react';

export interface NotificationItem {
  _id: string;
  type: 'motivational' | 'system' | 'quiz' | 'exam' | 'streak' | 'badge';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export const NotificationBell: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await API.get('/notifications');
      const data = res.data || [];
      setNotifications(data);
      console.log('[DEBUG Handoff 3 Frontend Notifications Received]', data);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Poll every 30 seconds for background updates
    const interval = setInterval(() => {
      fetchNotifications();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await API.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      console.log('[DEBUG Handoff 4 Notification Marked Read]', id);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await API.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Failed to mark notifications as read');
    }
  };

  const handleClearAll = async () => {
    try {
      await API.delete('/notifications/clear');
      setNotifications([]);
      toast.success('All notifications cleared');
    } catch (error) {
      toast.error('Failed to clear notifications');
    }
  };

  const getRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffSecs = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSecs < 60) return 'Just now';
    if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;
    if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h ago`;
    if (diffSecs < 172800) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getIconAndColor = (type: string) => {
    switch (type) {
      case 'motivational':
        return {
          icon: Zap,
          bg: 'bg-amber-50 text-amber-600 border-amber-200',
          badge: '⚡ Motivation',
        };
      case 'badge':
        return {
          icon: Trophy,
          bg: 'bg-[#2E7C87]/10 text-[#2E7C87] border-[#2E7C87]/20',
          badge: '🏆 Achievement',
        };
      case 'streak':
        return {
          icon: Flame,
          bg: 'bg-orange-50 text-orange-600 border-orange-200',
          badge: '🔥 Streak',
        };
      case 'quiz':
        return {
          icon: CheckSquare,
          bg: 'bg-teal-50 text-teal-700 border-teal-200',
          badge: '📊 Quiz',
        };
      case 'exam':
        return {
          icon: GraduationCap,
          bg: 'bg-[#1E3A4A]/10 text-[#1E3A4A] border-[#1E3A4A]/20',
          badge: '📝 Exam',
        };
      default:
        return {
          icon: Bell,
          bg: 'bg-gray-100 text-gray-700 border-gray-200',
          badge: 'System',
        };
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          fetchNotifications();
        }}
        className="relative p-2 rounded-lg bg-white border border-[#E5E7EB] text-[#6B7B85] hover:text-[#1E3A4A] hover:bg-gray-50 transition-colors cursor-pointer focus:outline-none"
        title="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#2E7C87] text-white text-[10px] font-bold flex items-center justify-center border-2 border-white [font-variant-numeric:tabular-nums]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-[#E5E7EB] z-50 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-[#E5E7EB] flex items-center justify-between bg-[#F0F4F7]">
              <div className="flex items-center gap-2">
                <span className="font-sans font-semibold text-sm text-[#1E3A4A]">Notifications</span>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-[#2E7C87] text-white text-[11px] font-semibold">
                    {unreadCount} new
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllAsRead}
                    title="Mark all as read"
                    className="text-[11px] font-semibold text-[#2E7C87] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Read All</span>
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    title="Clear all notifications"
                    className="text-[11px] font-semibold text-[#6B7B85] hover:text-red-500 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>
                )}
              </div>
            </div>

            {/* List Body */}
            <div className="max-h-96 overflow-y-auto divide-y divide-[#E5E7EB]/60">
              {notifications.length === 0 ? (
                <div className="p-8 text-center flex flex-col items-center gap-2 text-[#6B7B85]">
                  <CheckCircle2 className="w-8 h-8 text-[#2E7C87]" />
                  <p className="text-xs font-medium text-[#1E3A4A]">All caught up!</p>
                  <p className="text-[11px]">No notifications right now.</p>
                </div>
              ) : (
                notifications.map((item) => {
                  const style = getIconAndColor(item.type);
                  const IconComp = style.icon;
                  return (
                    <div
                      key={item._id}
                      onClick={() => handleMarkAsRead(item._id)}
                      className={`p-3.5 transition-colors cursor-pointer flex gap-3 ${
                        !item.isRead ? 'bg-teal-50/40 hover:bg-teal-50/70' : 'bg-white hover:bg-gray-50'
                      }`}
                    >
                      {/* Icon */}
                      <div className={`p-2 rounded-xl border shrink-0 h-fit ${style.bg}`}>
                        <IconComp className="w-4 h-4" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 flex flex-col gap-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`text-xs truncate ${
                              !item.isRead ? 'font-semibold text-[#1E3A4A]' : 'font-medium text-[#1E3A4A]/80'
                            }`}
                          >
                            {item.title}
                          </span>
                          <span className="text-[10px] text-[#6B7B85] shrink-0 font-mono">
                            {getRelativeTime(item.createdAt)}
                          </span>
                        </div>

                        <p className="text-xs text-[#6B7B85] leading-relaxed line-clamp-2">
                          {item.message}
                        </p>

                        {!item.isRead && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#2E7C87]" />
                            <span className="text-[10px] font-semibold text-[#2E7C87] uppercase tracking-wide">
                              Unread
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
