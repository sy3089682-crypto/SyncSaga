'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarEvent {
  date: number;
  events: string[];
  type: 'meeting' | 'deadline' | 'reminder';
}

const mockEvents: Record<number, CalendarEvent> = {
  3: { date: 3, events: ['Design Review'], type: 'meeting' },
  8: { date: 8, events: ['Project Deadline'], type: 'deadline' },
  15: { date: 15, events: ['Team Standup', 'Planning'], type: 'meeting' },
  22: { date: 22, events: ['Q3 Review'], type: 'meeting' },
  27: { date: 27, events: ['Reminder: Report Due'], type: 'reminder' },
};

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function CalendarSection() {
  const [currentDate, setCurrentDate] = useState(new Date(2024, 2)); // March 2024
  const [selectedDate, setSelectedDate] = useState<number | null>(null);

  const daysInMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  ).getDate();

  const firstDayOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
  ).getDay();

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const selectedDateEvents =
    selectedDate && mockEvents[selectedDate] ? mockEvents[selectedDate].events : [];

  const typeColors = {
    meeting: 'from-blue-400 to-cyan-400',
    deadline: 'from-red-400 to-pink-400',
    reminder: 'from-yellow-400 to-orange-400',
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
      {/* Header */}
      <motion.div variants={item}>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
          Calendar
        </h2>
      </motion.div>

      <motion.div
        variants={item}
        className="grid grid-cols-1 lg:grid-cols-3 gap-8"
      >
        {/* Calendar */}
        <div className="lg:col-span-2">
          <div className="glass-card p-8">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-8">
              <button
                onClick={prevMonth}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-900 dark:text-white" />
              </button>

              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                {currentDate.toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric',
                })}
              </h3>

              <button
                onClick={nextMonth}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-gray-900 dark:text-white" />
              </button>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div
                  key={day}
                  className="text-center text-sm font-600 text-gray-600 dark:text-gray-400 py-3"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <motion.div
              variants={container}
              className="grid grid-cols-7 gap-2"
            >
              {/* Empty days */}
              {emptyDays.map((_, idx) => (
                <div key={`empty-${idx}`} />
              ))}

              {/* Days */}
              {days.map(day => {
                const hasEvent = mockEvents[day];
                const isSelected = selectedDate === day;

                return (
                  <motion.button
                    key={day}
                    variants={item}
                    onClick={() => setSelectedDate(isSelected ? null : day)}
                    className={`aspect-square p-2 rounded-lg font-600 text-sm transition-all relative group ${
                      isSelected
                        ? 'bg-gradient-to-br from-green-400 to-blue-500 text-white shadow-lg'
                        : hasEvent
                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white border-2 border-green-400'
                        : 'bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center h-full">
                      <span>{day}</span>
                      {hasEvent && !isSelected && (
                        <div className="w-1 h-1 rounded-full bg-green-500 mt-1" />
                      )}
                    </div>

                    {/* Event Tooltip */}
                    {hasEvent && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 whitespace-nowrap">
                        {hasEvent.events[0]}
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </motion.div>
          </div>
        </div>

        {/* Sidebar - Events for Selected Date */}
        <div className="space-y-6">
          {/* Event Details */}
          {selectedDate && (
            <motion.div
              key="events"
              variants={item}
              className="glass-card p-8"
            >
              <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-6">
                {new Date(currentDate.getFullYear(), currentDate.getMonth(), selectedDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </h4>

              {selectedDateEvents.length > 0 ? (
                <div className="space-y-3">
                  {selectedDateEvents.map((event, idx) => {
                    const eventType =
                      mockEvents[selectedDate].type;
                    const colors =
                      typeColors[eventType] || typeColors.meeting;

                    return (
                      <motion.div
                        key={idx}
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: idx * 0.1 }}
                        className={`p-4 rounded-lg bg-gradient-to-br ${colors} text-white`}
                      >
                        <p className="font-600 text-sm">{event}</p>
                        <p className="text-xs opacity-90 mt-1">
                          {eventType === 'meeting'
                            ? '10:00 AM'
                            : eventType === 'deadline'
                            ? 'All day'
                            : '2:00 PM'}
                        </p>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  No events scheduled for this day
                </p>
              )}
            </motion.div>
          )}

          {/* Upcoming Events */}
          <motion.div variants={item} className="glass-card p-8">
            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-6">
              Upcoming
            </h4>

            <div className="space-y-3">
              {Object.entries(mockEvents)
                .slice(0, 4)
                .map(([date, event], idx) => {
                  const colors =
                    typeColors[event.type] || typeColors.meeting;

                  return (
                    <motion.div
                      key={date}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      className="p-4 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 bg-gradient-to-r ${colors}`}
                        />
                        <div className="min-w-0">
                          <p className="font-600 text-sm text-gray-900 dark:text-white line-clamp-1">
                            {event.events[0]}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            Mar {date}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}
