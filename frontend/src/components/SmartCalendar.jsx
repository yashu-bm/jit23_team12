import React, { useState, useMemo } from 'react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar as CalendarIcon, Clock, User, Download, Circle } from 'lucide-react';
import { useSelector } from 'react-redux';
import api from '../services/api';

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

export default function SmartCalendar({ appointments, availabilities = [], isLawyer, onEventClick, onAvailabilityChange }) {
  const [view, setView] = useState(Views.MONTH);
  const [date, setDate] = useState(new Date());
  
  const { user } = useSelector(state => state.auth);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [formData, setFormData] = useState({
    reason: '',
    startDate: '',
    endDate: '',
    startTime: '09:00',
    endTime: '17:00',
    isAvailable: 'false',
    isFullDay: false
  });

  const events = useMemo(() => {
    let allEvents = [];

    // Map Appointments
    appointments.forEach(apt => {
      const start = new Date(apt.appointmentDate);
      const end = new Date(start.getTime() + (apt.durationMinutes || 60) * 60000);
      
      let type = 'BOOKED';
      if (apt.status === 'COMPLETED') type = 'COMPLETED';

      allEvents.push({
        id: `apt-${apt.id}`,
        title: `${isLawyer ? apt.userName : apt.lawyerName} - ${apt.status}`,
        start,
        end,
        resource: { ...apt, type },
        allDay: false
      });
    });

    // Map Availabilities for the current month view (rough approximation: generate for +/- 45 days around 'date')
    if (availabilities.length > 0) {
      const startDate = new Date(date);
      startDate.setDate(startDate.getDate() - 45);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 45);

      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const dayOfWeek = d.getDay() || 7;

        availabilities.forEach(avail => {
          const matchesDate = avail.date && avail.date === dateStr;
          const matchesDay = avail.dayOfWeek && avail.dayOfWeek === dayOfWeek;

          if (matchesDate || matchesDay) {
            let start = new Date(d);
            let end = new Date(d);
            
            if (avail.startTime && avail.endTime) {
              const [sH, sM] = avail.startTime.split(':');
              start.setHours(parseInt(sH), parseInt(sM), 0);
              
              const [eH, eM] = avail.endTime.split(':');
              end.setHours(parseInt(eH), parseInt(eM), 0);
            } else {
              start.setHours(0, 0, 0);
              end.setHours(23, 59, 59);
            }

            allEvents.push({
              id: `avail-${avail.id}-${dateStr}`,
              title: avail.isAvailable ? 'Available' : (avail.reason || 'Unavailable'),
              start,
              end,
              resource: { 
                type: avail.isAvailable ? 'AVAILABLE' : 'UNAVAILABLE',
                reason: avail.reason,
                rawAvailability: avail
              },
              allDay: !avail.startTime || (avail.startTime === '00:00:00' && avail.endTime === '23:59:00')
            });
          }
        });
      }
    }

    return allEvents;
  }, [appointments, availabilities, isLawyer, date]);

  const eventStyleGetter = (event) => {
    const type = event.resource.type;
    let backgroundColor = '#3b82f6'; // Default

    // Required colors: 🟢 Available, 🔴 Unavailable, 🟡 Booked, 🔵 Completed
    if (type === 'AVAILABLE') backgroundColor = '#22c55e'; // Green
    else if (type === 'UNAVAILABLE') backgroundColor = '#ef4444'; // Red
    else if (type === 'BOOKED') backgroundColor = '#eab308'; // Yellow
    else if (type === 'COMPLETED') backgroundColor = '#3b82f6'; // Blue

    return {
      style: {
        backgroundColor,
        borderRadius: '8px',
        opacity: type === 'AVAILABLE' || type === 'UNAVAILABLE' ? 0.6 : 0.9,
        color: 'white',
        border: '0px',
        display: 'block',
        fontSize: '12px',
        padding: '2px 6px',
        pointerEvents: type === 'AVAILABLE' || type === 'UNAVAILABLE' ? 'none' : 'auto',
        zIndex: type === 'AVAILABLE' || type === 'UNAVAILABLE' ? 1 : 2
      }
    };
  };

  const handleExport = () => {
    // Generate simple CSV for calendar events
    let csvContent = "data:text/csv;charset=utf-8,Title,Start Date,End Date,Status\n";
    events.forEach(e => {
      const title = e.title.replace(/,/g, '');
      const start = e.start.toLocaleString();
      const end = e.end.toLocaleString();
      const status = e.resource.status;
      csvContent += `${title},${start},${end},${status}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "appointments_calendar.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSelectSlot = ({ start, end }) => {
    if (!isLawyer) return;
    
    // Default to 'Unavailable' when clicking empty slot
    setFormData({
      reason: 'GENERAL',
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd'),
      startTime: '09:00',
      endTime: '17:00',
      isAvailable: 'false',
      isFullDay: true
    });
    setModalMode('add');
    setModalOpen(true);
  };

  const handleEventClick = (event) => {
    if (event.resource.type === 'AVAILABLE' || event.resource.type === 'UNAVAILABLE') {
      if (isLawyer) {
        const raw = event.resource.rawAvailability;
        setFormData({
          id: raw.id,
          reason: raw.reason || 'GENERAL',
          startDate: raw.date || format(event.start, 'yyyy-MM-dd'),
          endDate: raw.endDate || (raw.date || format(event.end, 'yyyy-MM-dd')),
          startTime: raw.startTime ? raw.startTime.substring(0,5) : '00:00',
          endTime: raw.endTime ? raw.endTime.substring(0,5) : '23:59',
          isAvailable: raw.isAvailable.toString(),
          isFullDay: !raw.startTime || (raw.startTime === '00:00:00' && raw.endTime === '23:59:00')
        });
        setModalMode('edit');
        setModalOpen(true);
      }
    } else {
      if (isLawyer) {
        alert("This slot already contains a booked appointment and cannot be marked unavailable.");
      }
      if (onEventClick) onEventClick(event);
    }
  };

  const handleSaveAvailability = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        date: formData.startDate,
        endDate: formData.isFullDay ? formData.endDate : null,
        startTime: formData.isFullDay ? '00:00:00' : `${formData.startTime}:00`,
        endTime: formData.isFullDay ? '23:59:00' : `${formData.endTime}:00`,
        isAvailable: formData.isAvailable === 'true',
        reason: formData.reason
      };

      if (modalMode === 'add') {
        await api.post(`availability/lawyer/${user.id}`, payload);
      } else {
        await api.put(`availability/${formData.id}`, payload);
      }
      setModalOpen(false);
      if (onAvailabilityChange) onAvailabilityChange();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save availability');
    }
  };

  const handleDeleteAvailability = async () => {
    if (window.confirm("Are you sure you want to delete this availability rule?")) {
      try {
        await api.delete(`availability/${formData.id}`);
        setModalOpen(false);
        if (onAvailabilityChange) onAvailabilityChange();
      } catch (err) {
        alert('Failed to delete availability');
      }
    }
  };

  return (
    <div className="glass-panel rounded-3xl p-6 relative bg-white dark:bg-slate-900 border border-gray-100 dark:border-gray-800 shadow-xl overflow-hidden">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800 dark:text-white">
          <CalendarIcon className="text-primary-500" /> Smart Calendar
        </h2>
        <button 
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <Download size={16} /> Export CSV
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mb-4 text-sm font-medium bg-gray-50 dark:bg-slate-800/50 p-3 rounded-xl border border-gray-100 dark:border-slate-700">
        <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300"><Circle size={12} fill="#22c55e" color="#22c55e" /> Available</div>
        <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300"><Circle size={12} fill="#ef4444" color="#ef4444" /> Unavailable</div>
        <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300"><Circle size={12} fill="#eab308" color="#eab308" /> Booked</div>
        <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300"><Circle size={12} fill="#3b82f6" color="#3b82f6" /> Completed</div>
      </div>

      <div className="h-[600px] w-full bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-inner calendar-override">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%', fontFamily: 'inherit' }}
          view={view}
          onView={setView}
          date={date}
          onNavigate={setDate}
          eventPropGetter={eventStyleGetter}
          onSelectEvent={handleEventClick}
          selectable={isLawyer}
          onSelectSlot={handleSelectSlot}
          tooltipAccessor={(event) => {
            let tooltip = `Status: ${event.resource.type}\nTime: ${format(event.start, 'HH:mm')} - ${format(event.end, 'HH:mm')}`;
            if (event.resource.reason) {
              tooltip += `\nReason: ${event.resource.reason}`;
            }
            return tooltip;
          }}
          popup
        />
      </div>

      {/* Availability Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="flex justify-between items-center p-4 border-b dark:border-slate-700">
                <h3 className="text-lg font-bold dark:text-white">
                  {modalMode === 'add' ? 'Manage Availability' : 'Edit Availability'}
                </h3>
                <button onClick={() => setModalOpen(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSaveAvailability} className="p-4 space-y-4">
                
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-gray-300">Status</label>
                  <select 
                    className="w-full p-2 border rounded-xl dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    value={formData.isAvailable}
                    onChange={(e) => setFormData({...formData, isAvailable: e.target.value})}
                  >
                    <option value="false">Unavailable</option>
                    <option value="true">Available</option>
                  </select>
                </div>

                {formData.isAvailable === 'false' && (
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Reason</label>
                    <select 
                      className="w-full p-2 border rounded-xl dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                      value={formData.reason}
                      onChange={(e) => setFormData({...formData, reason: e.target.value})}
                    >
                      <option value="GENERAL">General</option>
                      <option value="VACATION">Vacation</option>
                      <option value="HOLIDAY">Holiday</option>
                    </select>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="isFullDay"
                    checked={formData.isFullDay}
                    onChange={(e) => setFormData({...formData, isFullDay: e.target.checked})}
                    className="rounded text-primary-600 focus:ring-primary-500"
                  />
                  <label htmlFor="isFullDay" className="text-sm font-medium dark:text-gray-300">Full Day</label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Start Date</label>
                    <input 
                      type="date"
                      required
                      className="w-full p-2 border rounded-xl dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                      value={formData.startDate}
                      onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                    />
                  </div>
                  {formData.isFullDay && (
                    <div>
                      <label className="block text-sm font-medium mb-1 dark:text-gray-300">End Date</label>
                      <input 
                        type="date"
                        required
                        className="w-full p-2 border rounded-xl dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                        value={formData.endDate}
                        min={formData.startDate}
                        onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                      />
                    </div>
                  )}
                </div>

                {!formData.isFullDay && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1 dark:text-gray-300">Start Time</label>
                      <input 
                        type="time"
                        required
                        className="w-full p-2 border rounded-xl dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                        value={formData.startTime}
                        onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 dark:text-gray-300">End Time</label>
                      <input 
                        type="time"
                        required
                        className="w-full p-2 border rounded-xl dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                        value={formData.endTime}
                        onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-4 border-t dark:border-slate-700">
                  {modalMode === 'edit' && (
                    <button 
                      type="button" 
                      onClick={handleDeleteAvailability}
                      className="px-4 py-2 bg-red-100 text-red-600 rounded-xl font-medium hover:bg-red-200 transition"
                    >
                      Delete
                    </button>
                  )}
                  <div className="flex-1"></div>
                  <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-slate-600 transition">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition">
                    Save
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{__html: `
        .calendar-override .rbc-calendar { font-family: inherit; }
        .calendar-override .rbc-toolbar button { border-radius: 8px; margin: 0 4px; border-color: #e5e7eb; padding: 6px 12px; }
        .calendar-override .rbc-toolbar button.rbc-active { background-color: #f3f4f6; color: #1f2937; box-shadow: none; border-color: #d1d5db; }
        .dark .calendar-override .rbc-toolbar button { border-color: #374151; color: #d1d5db; }
        .dark .calendar-override .rbc-toolbar button.rbc-active { background-color: #374151; color: white; }
        .calendar-override .rbc-header { padding: 8px 0; font-weight: 600; font-size: 14px; border-bottom: 1px solid #e5e7eb; }
        .dark .calendar-override .rbc-header { border-bottom-color: #374151; border-left-color: #374151; }
        .dark .calendar-override .rbc-month-view, .dark .calendar-override .rbc-month-row, .dark .calendar-override .rbc-day-bg { border-color: #374151; }
        .dark .calendar-override .rbc-off-range-bg { background-color: #1e293b; }
        .dark .calendar-override .rbc-today { background-color: rgba(59, 130, 246, 0.1); }
      `}} />
    </div>
  );
}
