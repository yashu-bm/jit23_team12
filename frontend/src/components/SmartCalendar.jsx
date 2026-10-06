import React, { useState, useMemo, useEffect } from 'react';
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, 
  startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, 
  isSameDay, isToday, isBefore, startOfDay 
} from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { useSelector } from 'react-redux';

export default function SmartCalendar({ 
  eventsData = [], 
  isLawyer, 
  onEventClick, 
  onDateRangeChange, 
  lawyerId 
}) {
  const [currentDate, setCurrentDate] = useState(startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    if (onDateRangeChange) {
      const start = startOfWeek(startOfMonth(currentDate));
      const end = endOfWeek(endOfMonth(currentDate));
      onDateRangeChange(format(start, 'yyyy-MM-dd'), format(end, 'yyyy-MM-dd'));
    }
  }, [currentDate, onDateRangeChange]);

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const daysInMonth = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate));
    const end = endOfWeek(endOfMonth(currentDate));
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const dayStatusMap = useMemo(() => {
    const map = {};
    eventsData.forEach(e => {
      const dayStr = format(new Date(e.start), 'yyyy-MM-dd');
      const type = e.resource?.type || e.type || e.status;
      
      // Determine priority of status: Holiday > Fully Booked > Available
      if (!map[dayStr]) {
        map[dayStr] = type;
      } else {
        if (type === 'UNAVAILABLE') map[dayStr] = 'UNAVAILABLE';
        else if (type === 'FULLY_BOOKED' && map[dayStr] !== 'UNAVAILABLE') map[dayStr] = 'FULLY_BOOKED';
        else if (type === 'AVAILABLE' && map[dayStr] !== 'UNAVAILABLE' && map[dayStr] !== 'FULLY_BOOKED') map[dayStr] = 'AVAILABLE';
      }
    });
    return map;
  }, [eventsData]);

  const handleDayClick = (day) => {
    if (isBefore(day, startOfDay(new Date()))) return; // Cannot click past dates

    setSelectedDate(day);
    if (onEventClick) {
      const dayStr = format(day, 'yyyy-MM-dd');
      onEventClick({ start: day, end: day, isSlot: true, resource: { type: dayStatusMap[dayStr] } });
    }
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-xl border border-gray-100 dark:border-gray-800 relative overflow-hidden">
      {/* Decorative Blob */}
      <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-indigo-500/10 dark:bg-indigo-500/5 blur-[80px] rounded-full pointer-events-none"></div>

      <div className="flex justify-between items-center mb-8 relative z-10">
        <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <CalendarIcon size={24} />
          </div>
          Calendar
        </h2>
        <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-800 p-1.5 rounded-2xl border border-gray-100 dark:border-gray-700">
          <button onClick={handlePrevMonth} className="p-2 rounded-xl hover:bg-white dark:hover:bg-gray-700 hover:shadow-sm transition-all text-gray-600 dark:text-gray-300">
            <ChevronLeft size={20} />
          </button>
          <span className="font-bold text-gray-900 dark:text-white min-w-[120px] text-center">
            {format(currentDate, 'MMMM yyyy')}
          </span>
          <button onClick={handleNextMonth} className="p-2 rounded-xl hover:bg-white dark:hover:bg-gray-700 hover:shadow-sm transition-all text-gray-600 dark:text-gray-300">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 mb-4 relative z-10">
        {weekDays.map(day => (
          <div key={day} className="text-center font-bold text-sm text-gray-400 dark:text-gray-500 uppercase tracking-wider py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2 relative z-10">
        <AnimatePresence mode="popLayout">
          {daysInMonth.map((day, idx) => {
            const dayStr = format(day, 'yyyy-MM-dd');
            const status = dayStatusMap[dayStr];
            const isPast = isBefore(day, startOfDay(new Date()));
            const isCurrMonth = isSameMonth(day, currentDate);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isDayToday = isToday(day);

            let bgClass = "bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 border-transparent text-gray-700 dark:text-gray-300";
            let indicator = null;

            if (isSelected) {
              bgClass = "bg-purple-600 text-white shadow-lg shadow-purple-600/30 font-bold border-purple-500";
            } else if (isPast) {
              bgClass = "bg-gray-50/50 dark:bg-gray-900/30 text-gray-300 dark:text-gray-600 cursor-not-allowed border-transparent";
            } else if (isDayToday) {
              bgClass = "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800 font-bold hover:bg-blue-100";
              indicator = <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-blue-500"></div>;
            } else if (status === 'AVAILABLE') {
              bgClass = "bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900/50 hover:bg-green-100 font-semibold";
              indicator = <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]"></div>;
            } else if (status === 'HOLIDAY') {
              bgClass = "bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/30 hover:bg-red-100";
              indicator = <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]"></div>;
            } else if (status === 'UNAVAILABLE') {
              bgClass = "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-200";
              indicator = <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-gray-500"></div>;
            } else if (status === 'FULLY_BOOKED') {
              bgClass = "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 cursor-not-allowed";
              indicator = <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-gray-500"></div>;
            } else if (!isCurrMonth) {
              bgClass = "bg-transparent text-gray-300 dark:text-gray-700 cursor-default border-transparent";
            }

            return (
              <motion.button
                key={dayStr}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, delay: idx * 0.005 }}
                onClick={() => !isPast && isCurrMonth && handleDayClick(day)}
                disabled={isPast || !isCurrMonth}
                className={`relative aspect-square rounded-2xl flex items-center justify-center text-sm transition-all border ${bgClass}`}
              >
                {format(day, 'd')}
                {indicator}
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-4 text-xs font-semibold text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.5)]"></div> Available</div>
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.5)]"></div> Holiday</div>
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-gray-400"></div> Unavailable</div>
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-gray-600"></div> Fully Booked</div>
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div> Today</div>
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-purple-600 shadow-[0_0_4px_rgba(147,51,234,0.5)]"></div> Selected</div>
      </div>
    </div>
  );
}
