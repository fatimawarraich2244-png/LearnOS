import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
// @ts-ignore
import API from '../../api/axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  X,
  ArrowLeft,
} from 'lucide-react';

interface CalendarEvent {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  subtitle: string;
  type: 'exam' | 'study-plan';
}

interface CalendarDayCell {
  date: Date;
  dateStr: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: CalendarEvent[];
}

const WEEKDAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const CalendarPage: React.FC = () => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedDayCell, setSelectedDayCell] = useState<CalendarDayCell | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const res = await API.get('/subjects/calendar-events');
        setEvents(res.data);
      } catch (err: any) {
        toast.error('Failed to load calendar events');
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [year, month]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDayCell(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDayCell(null);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
    setSelectedDayCell(null);
  };

  const generateGrid = (): CalendarDayCell[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const cells: CalendarDayCell[] = [];
    const prevMonthLastDay = new Date(year, month, 0).getDate();

    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const pDay = prevMonthLastDay - i;
      const d = new Date(year, month - 1, pDay);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dayNum = String(d.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${dayNum}`;

      const cellEvents = events.filter((e) => e.date === dateStr);
      cells.push({
        date: d,
        dateStr,
        dayNumber: pDay,
        isCurrentMonth: false,
        isToday: false,
        events: cellEvents,
      });
    }

    for (let day = 1; day <= lastDay.getDate(); day++) {
      const d = new Date(year, month, day);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dayNum = String(d.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${dayNum}`;

      const isToday =
        d.getFullYear() === today.getFullYear() &&
        d.getMonth() === today.getMonth() &&
        d.getDate() === today.getDate();

      const cellEvents = events.filter((e) => e.date === dateStr);

      cells.push({
        date: d,
        dateStr,
        dayNumber: day,
        isCurrentMonth: true,
        isToday,
        events: cellEvents,
      });
    }

    const totalCellsSoFar = cells.length;
    const remainingCells = (7 - (totalCellsSoFar % 7)) % 7;
    for (let i = 1; i <= remainingCells; i++) {
      const d = new Date(year, month + 1, i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dayNum = String(d.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${dayNum}`;

      const cellEvents = events.filter((e) => e.date === dateStr);

      cells.push({
        date: d,
        dateStr,
        dayNumber: i,
        isCurrentMonth: false,
        isToday: false,
        events: cellEvents,
      });
    }

    return cells;
  };

  const gridCells = generateGrid();
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

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
                Study Calendar
              </h1>
              <p className="text-sm text-[#6B7B85] mt-0.5 font-normal">
                Overview of exams, scheduled study plans, and daily milestones.
              </p>
            </div>

            {/* Navigation Controls */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleToday}
                className="px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-xs font-semibold text-[#1E3A4A] bg-white hover:bg-[#F0F4F7] transition-colors cursor-pointer"
              >
                Today
              </button>
              <div className="flex items-center gap-1 bg-white border border-[#E5E7EB] rounded-lg p-1">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1 rounded-md text-[#6B7B85] hover:text-[#1E3A4A] hover:bg-[#F0F4F7] transition-colors cursor-pointer"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-mono text-xs font-semibold text-[#1E3A4A] px-3 min-w-[120px] text-center [font-variant-numeric:tabular-nums]">
                  {monthName}
                </span>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1 rounded-md text-[#6B7B85] hover:text-[#1E3A4A] hover:bg-[#F0F4F7] transition-colors cursor-pointer"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Calendar Grid Card */}
          <div className="bg-white rounded-2xl p-6 border border-[#E5E7EB] flex flex-col gap-4">
            {/* Weekday Header Row */}
            <div className="grid grid-cols-7 gap-2 pb-2 border-b border-[#E5E7EB] text-center">
              {WEEKDAY_NAMES.map((day) => (
                <div key={day} className="text-xs font-semibold uppercase tracking-wide text-[#6B7B85]">
                  {day}
                </div>
              ))}
            </div>

            {/* Grid Body */}
            {loading ? (
              <div className="flex justify-center py-16">
                <div className="animate-spin h-6 w-6 border-2 border-[#2E7C87] border-t-transparent rounded-full" />
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-2">
                {gridCells.map((cell, idx) => {
                  const isSelected = selectedDayCell?.dateStr === cell.dateStr;

                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedDayCell(cell)}
                      className={`min-h-[100px] p-2 rounded-xl flex flex-col justify-between transition-colors cursor-pointer border ${
                        !cell.isCurrentMonth
                          ? 'bg-[#F0F4F7]/40 border-[#E5E7EB]/50 text-[#6B7B85]/40'
                          : cell.isToday
                          ? 'bg-[#2E7C87]/10 border border-[#2E7C87] text-[#2E7C87]'
                          : isSelected
                          ? 'bg-[#F0F4F7] border-[#2E7C87]'
                          : 'bg-white border-[#E5E7EB] hover:bg-[#F0F4F7]'
                      }`}
                    >
                      {/* Cell Header */}
                      <div className="flex items-center justify-between">
                        <span
                          className={`font-mono text-xs font-semibold [font-variant-numeric:tabular-nums] ${
                            cell.isToday
                              ? 'text-[#2E7C87]'
                              : cell.isCurrentMonth
                              ? 'text-[#1E3A4A]'
                              : 'text-[#6B7B85]/40'
                          }`}
                        >
                          {cell.dayNumber}
                        </span>
                        {cell.isToday && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#2E7C87]" />
                        )}
                      </div>

                      {/* Event Indicator List */}
                      <div className="flex flex-col gap-1 mt-1 flex-1 overflow-hidden justify-end">
                        {cell.events.slice(0, 2).map((event) => (
                          <div
                            key={event.id}
                            title={`${event.title} - ${event.subtitle}`}
                            className={`px-1.5 py-0.5 rounded text-[10px] truncate font-medium ${
                              event.type === 'exam'
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : 'bg-[#2E7C87]/10 text-[#2E7C87] border border-[#2E7C87]/20'
                            }`}
                          >
                            {event.title}
                          </div>
                        ))}
                        {cell.events.length > 2 && (
                          <span className="font-mono text-[9px] text-[#6B7B85] pl-0.5 font-medium">
                            +{cell.events.length - 2} more
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </main>

      {/* Selected Day Details Popover Modal */}
      <AnimatePresence>
        {selectedDayCell && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md p-6 rounded-2xl bg-white border border-[#E5E7EB] shadow-xl flex flex-col gap-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
                <div>
                  <h3 className="font-sans font-semibold text-base text-[#1E3A4A]">
                    {selectedDayCell.date.toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </h3>
                  <p className="text-xs text-[#6B7B85]">
                    {selectedDayCell.events.length === 1
                      ? '1 event scheduled'
                      : `${selectedDayCell.events.length} events scheduled`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDayCell(null)}
                  className="p-1 text-[#6B7B85] hover:text-[#1E3A4A] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto">
                {selectedDayCell.events.length === 0 ? (
                  <div className="text-center py-6 text-xs text-[#6B7B85] rounded-xl border border-dashed border-[#E5E7EB] bg-[#F0F4F7]">
                    No events scheduled for this day.
                  </div>
                ) : (
                  selectedDayCell.events.map((evt) => (
                    <div
                      key={evt.id}
                      className="p-3 rounded-lg border border-[#E5E7EB] bg-[#F0F4F7] flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#2E7C87]" />
                          <span className="text-[11px] font-semibold uppercase tracking-wide text-[#6B7B85]">
                            {evt.type === 'exam' ? 'Exam' : 'Study Plan'}
                          </span>
                        </div>
                        <span className="font-mono text-xs text-[#6B7B85]">{evt.date}</span>
                      </div>
                      <h4 className="font-sans font-semibold text-xs text-[#1E3A4A] mt-0.5">{evt.title}</h4>
                      <p className="text-xs text-[#6B7B85]">{evt.subtitle}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-2 border-t border-[#E5E7EB] flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedDayCell(null)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#1E3A4A] hover:bg-[#152B37] transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CalendarPage;
