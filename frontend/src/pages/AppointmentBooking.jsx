import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, CheckCircle, ChevronRight, User as UserIcon, Star } from 'lucide-react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import api from '../services/api';
import SmartCalendar from '../components/SmartCalendar';
import { format, startOfMonth, endOfMonth } from 'date-fns';

const getSlotStart = (s) => {
  if (typeof s === 'string') return s;
  return s?.startTime || s?.start_time || s?.time || s?.start || '';
};
const getSlotEnd = (s) => {
  if (typeof s === 'string') return '';
  return s?.endTime || s?.end_time || s?.end || '';
};

const formatAmPm = (val) => {
  if (!val) return '';
  let str = String(val);
  if (Array.isArray(val)) {
    str = `${String(val[0]).padStart(2, '0')}:${val.length > 1 ? String(val[1]).padStart(2, '0') : '00'}`;
  }
  const parts = str.split(':');
  if (parts.length < 2) return str;
  let h = parseInt(parts[0], 10);
  if (isNaN(h)) return str;
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h.toString().padStart(2, '0')}:${parts[1].substring(0,2)} ${ampm}`;
};

const format24Hour = (val) => {
  if (!val) return '';
  let str = String(val);
  if (Array.isArray(val)) {
    str = `${String(val[0]).padStart(2, '0')}:${val.length > 1 ? String(val[1]).padStart(2, '0') : '00'}`;
  }
  const parts = str.split(':');
  if (parts.length === 2) return `${str}:00`;
  return str;
};

const AppointmentBooking = () => {
  const { user } = useSelector(state => state.auth);
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedLawyer, setSelectedLawyer] = useState(null);
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [meetingType, setMeetingType] = useState('ONLINE');
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [lawyersList, setLawyersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [dateStatus, setDateStatus] = useState('WORKING');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedSlotObj, setSelectedSlotObj] = useState(null);
  const slotsRef = React.useRef(null);

  console.log("AppointmentBooking rendered");
  console.log({
    appointmentDate,
    appointmentTime,
    selectedLawyer: selectedLawyer?.id,
    availableSlots
  });

  React.useEffect(() => {
    console.log("AppointmentBooking MOUNTED");
    return () => console.log("AppointmentBooking UNMOUNTED");
  }, []);

  React.useEffect(() => {
    const fetchLawyers = async () => {
      try {
        const res = await api.get('lawyers/search');
        setLawyersList(res.data);
        
        const params = new URLSearchParams(window.location.search);
        const lId = params.get('lawyerId');
        if (lId) {
          const lawyer = res.data.find(l => l.id.toString() === lId);
          if (lawyer) {
            setSelectedLawyer(lawyer);
            setStep(2);
          }
        }
      } catch (err) {
        console.error("Failed to load lawyers", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLawyers();
  }, []);

  const handleLawyerSelect = (lawyer) => {
    setSelectedLawyer(lawyer);
    setStep(2);
  };

  const fetchCalendarEvents = React.useCallback(async (startStr, endStr) => {
    if (!selectedLawyer) return;
    try {
      const res = await api.get(`availability/lawyer/${selectedLawyer.id}/calendar?start=${startStr}&end=${endStr}&role=CLIENT`);
      setCalendarEvents(res.data);
    } catch (err) {
      console.error("Failed to load lawyer schedule", err);
    }
  }, [selectedLawyer]);

  React.useEffect(() => {
    console.log("AppointmentBooking.jsx: useEffect triggered. Dependencies: appointmentDate=", appointmentDate, "selectedLawyer=", selectedLawyer?.id);
    if (!appointmentDate || !selectedLawyer) {
      console.log("AppointmentBooking.jsx: Skipping fetchSlots because appointmentDate or selectedLawyer is null.");
      return;
    }

    let isMounted = true;
    let intervalId = null;

    const fetchSlots = async (isBackground = false) => {
      try {
        if (!isBackground) setLoadingSlots(true);
        const res = await api.get(`availability/lawyer/${selectedLawyer.id}/slots?date=${appointmentDate}`);
        if (isMounted) setAvailableSlots(res.data);
      } catch (error) {
        console.error("AppointmentBooking.jsx: Error fetching slots:", error);
      } finally {
        if (!isBackground && isMounted) setLoadingSlots(false);
      }
    };

    fetchSlots(false);

    // 10s short polling
    intervalId = setInterval(() => {
      fetchSlots(true);
    }, 10000);

    return () => {
      isMounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [appointmentDate, selectedLawyer, calendarEvents]);

  React.useEffect(() => {
    if (appointmentDate) {
      console.log("appointmentDate updated", appointmentDate);
    }
  }, [appointmentDate]);

  React.useEffect(() => {
    if (availableSlots && availableSlots.length > 0 && slotsRef.current) {
      setTimeout(() => {
        slotsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [availableSlots]);

  const handleCalendarEventClick = (event) => {
    if (!event || (!event.start && !event.isSlot)) {
      return;
    }

    if (event.resource && event.resource.type !== 'AVAILABLE') {
      return;
    }

    const startDate = new Date(event.start);
    const dateStr = `${startDate.getFullYear()}-${(startDate.getMonth() + 1).toString().padStart(2, '0')}-${startDate.getDate().toString().padStart(2, '0')}`;
    
    console.log("AppointmentBooking.jsx: Setting appointmentDate to:", dateStr);
    setAppointmentDate(dateStr);
    
    // Reset selections when date changes
    setAppointmentTime('');
    setAvailableSlots([]);

    if (event.resource && event.resource.type) {
      if (event.resource.type === 'HOLIDAY') setDateStatus('HOLIDAY');
      else if (event.resource.type === 'UNAVAILABLE') setDateStatus('UNAVAILABLE');
      else setDateStatus('WORKING');
    } else {
      setDateStatus('WORKING');
    }
  };

  const handleTimeSelect = (slotObj) => {
    if (appointmentDate && slotObj) {
      setAppointmentTime(getSlotStart(slotObj));
      setSelectedSlotObj(slotObj);
      setShowConfirmModal(true);
    }
  };

  const handleBooking = async () => {
    setIsProcessing(true);
    try {
      const dt = `${appointmentDate}T${format24Hour(appointmentTime)}`;

      const payload = {
        userId: user.id,
        lawyerId: selectedLawyer.id,
        appointmentDate: dt,
        meetingType: meetingType,
        notes: notes
      };
      console.log("Booking request payload:", payload);

      const res = await api.post('appointments/book', payload);
      console.log("Booking response:", res.data);
      
      // Refresh the calendar after successful booking
      const bookedDate = new Date(appointmentDate);
      const startStr = format(startOfMonth(bookedDate), 'yyyy-MM-dd');
      const endStr = format(endOfMonth(bookedDate), 'yyyy-MM-dd');
      fetchCalendarEvents(startStr, endStr);
      
      // Auto refresh slots
      if (selectedLawyer && appointmentDate) {
        api.get(`availability/lawyer/${selectedLawyer.id}/slots?date=${appointmentDate}`)
          .then(res => setAvailableSlots(res.data))
          .catch(e => console.error(e));
      }
      
      setPaymentSuccess(true);
      setShowConfirmModal(false);
      setStep(3);
    } catch (err) {
      console.error("Booking error:", err);
      const statusCode = err.response?.status;
      const errMsg = err.response?.data?.message || err.response?.data || "Failed to book appointment.";
      if (statusCode === 409 || errMsg.includes("fully booked") || errMsg.includes("outside") || errMsg.includes("already")) {
        alert("This slot was just booked by another client. Availability has been refreshed.");
        // refresh immediately so user sees it blocked
        if (selectedLawyer && appointmentDate) {
           api.get(`availability/lawyer/${selectedLawyer.id}/slots?date=${appointmentDate}`)
             .then(res => setAvailableSlots(res.data));
        }
        setShowConfirmModal(false);
      } else if (statusCode === 401) {
        alert("Please log in again.");
      } else {
        alert(typeof errMsg === 'string' ? errMsg : "Failed to book appointment. Please try again.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  console.log("STATE availableSlots =", availableSlots, "isArray?", Array.isArray(availableSlots));

  return (
    <div className="p-6 max-w-5xl mx-auto min-h-[calc(100vh-64px)]">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Book a Consultation</h1>
      
      {/* Stepper */}
      <div className="flex items-center mb-10 w-full md:w-3/4 mx-auto">
        <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${step >= 1 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'}`}>1</div>
        <div className={`flex-1 h-1 ${step >= 2 ? 'bg-indigo-600' : 'bg-gray-200'}`}></div>
        <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${step >= 2 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'}`}>2</div>
        <div className={`flex-1 h-1 ${step >= 3 ? 'bg-indigo-600' : 'bg-gray-200'}`}></div>
        <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${step >= 3 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'}`}>3</div>
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div 
            key="step1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {loading ? <p className="text-gray-500">Loading lawyers...</p> : lawyersList.map(lawyer => (
              <div key={lawyer.id} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleLawyerSelect(lawyer)}>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <UserIcon size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg dark:text-white">{lawyer.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{lawyer.specializationCategory || 'General'}</p>
                  </div>
                </div>
                <div className="flex justify-between items-center mt-6">
                  <span className="font-semibold text-gray-900 dark:text-white">₹{lawyer.consultationFee} / session</span>
                  <button className="text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1 hover:gap-2 transition-all">
                    Select <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {step === 2 && (
          <motion.div 
            key="step2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="max-w-6xl mx-auto bg-white dark:bg-gray-800 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col"
          >
            {/* Lawyer Profile Header */}
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-gray-800 dark:to-slate-800 p-8 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                <div className="w-20 h-20 bg-white dark:bg-gray-700 rounded-full shadow-sm flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <UserIcon size={36} />
                </div>
                <div className="text-center sm:text-left">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedLawyer?.name}</h2>
                  <p className="text-indigo-600 dark:text-indigo-400 font-medium mb-2">{selectedLawyer?.specializationCategory || 'General Practice'}</p>
                  <div className="flex items-center justify-center sm:justify-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="flex items-center gap-1"><Star size={16} className="text-amber-400 fill-amber-400" /> {selectedLawyer?.rating || '4.9'} ({selectedLawyer?.reviewsCount || '120'} reviews)</span>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-700 px-6 py-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-600 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">Consultation Fee</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">₹{selectedLawyer?.consultationFee}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[500px]">
              
              {/* Left Column: Calendar */}
              <div className="lg:col-span-5 p-8 lg:p-10 border-b lg:border-b-0 lg:border-r border-gray-100 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-800/50">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Select a Date</h2>
                  <p className="text-gray-500 dark:text-gray-400 mt-1">Pick a green highlighted date below.</p>
                </div>
                
                <div className="w-full relative z-10">
                  <SmartCalendar 
                    eventsData={calendarEvents}
                    onDateRangeChange={fetchCalendarEvents}
                    lawyerId={selectedLawyer?.id}
                    isLawyer={false}
                    onEventClick={handleCalendarEventClick}
                  />
                </div>
              </div>

              {/* Right Column: Slots */}
              <div className="lg:col-span-7 p-8 lg:p-10 flex flex-col h-full" ref={slotsRef}>
                {!appointmentDate ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mb-6">
                      <Calendar className="text-indigo-500 dark:text-indigo-400" size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">No Date Selected</h3>
                    <p className="text-gray-500 max-w-xs mx-auto">Please select an available date from the calendar to see booking slots.</p>
                  </div>
                ) : (
                  <div className="flex flex-col h-full">
                    <div className="mb-8 pb-4 border-b border-gray-100 dark:border-gray-700">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        {format(new Date(appointmentDate), 'EEEE')}
                      </h3>
                      <p className="text-indigo-600 dark:text-indigo-400 font-medium">
                        {format(new Date(appointmentDate), 'dd MMMM yyyy')}
                      </p>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 max-h-[500px] custom-scrollbar">
                      {dateStatus === 'HOLIDAY' ? (
                        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-8 rounded-xl border border-red-100 dark:border-red-500/20 flex flex-col items-center text-center">
                          <CheckCircle className="mb-3 opacity-50" size={36} />
                          <h4 className="font-bold text-xl mb-2">Holiday</h4>
                          <p className="text-sm">The lawyer is on holiday and no booking is available.</p>
                        </div>
                      ) : dateStatus === 'UNAVAILABLE' ? (
                        <div className="bg-gray-100 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 p-8 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col items-center text-center">
                          <CheckCircle className="mb-3 opacity-50" size={36} />
                          <h4 className="font-bold text-xl mb-2">Unavailable</h4>
                          <p className="text-sm">Lawyer is unavailable on this day.</p>
                        </div>
                      ) : loadingSlots ? (
                        <div className="space-y-4 pt-4">
                          {[1,2,3,4,5].map(i => (
                            <div key={i} className="h-[90px] bg-gray-100 dark:bg-gray-800 animate-pulse rounded-2xl"></div>
                          ))}
                        </div>
                      ) : (!Array.isArray(availableSlots) || availableSlots.length === 0) ? (
                        <div className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 p-10 rounded-2xl border border-gray-100 dark:border-gray-700 flex flex-col items-center text-center mt-4">
                          <CheckCircle className="mb-4 opacity-50 text-indigo-400" size={48} />
                          <h4 className="font-bold text-2xl mb-2 text-gray-800 dark:text-gray-200">All appointments booked</h4>
                          <p className="text-sm">There are no available slots left for this date. Please try another date.</p>
                        </div>
                      ) : (
                        (() => {
                          const parseHour = (s) => {
                            const timeStr = getSlotStart(s);
                            if (!timeStr) return 0;
                            let str = String(timeStr);
                            if (Array.isArray(timeStr)) str = String(timeStr[0]);
                            return parseInt(str.split(':')[0], 10);
                          };
                          const morningSlots = availableSlots.filter(s => parseHour(s) < 12);
                          const afternoonSlots = availableSlots.filter(s => {
                            const h = parseHour(s);
                            return h >= 12 && h < 17;
                          });
                          const eveningSlots = availableSlots.filter(s => {
                            const h = parseHour(s);
                            return h >= 17 && h < 20;
                          });
                          const nightSlots = availableSlots.filter(s => parseHour(s) >= 20);

                          const renderGroup = (title, slots, icon) => {
                            if (!slots.length) return null;
                            return (
                              <div className="mb-8">
                                <h4 className="flex items-center gap-2 text-lg font-bold text-gray-800 dark:text-gray-200 mb-4 pb-2 border-b border-gray-100 dark:border-gray-700">
                                  <span>{icon}</span> {title}
                                </h4>
                                <div className="space-y-3">
                                  {slots.map((slot, idx) => {
                                    const isFullyBooked = slot.remainingCapacity <= 0;
                                    const st = getSlotStart(slot);
                                    const et = getSlotEnd(slot);
                                    const formattedStart = formatAmPm(st);
                                    const formattedEnd = formatAmPm(et);
                                    const displayKey = st || `slot-${idx}`;
                                    const isSelected = selectedSlotObj && getSlotStart(selectedSlotObj) === st;

                                    return (
                                      <div 
                                        key={displayKey}
                                        className={`p-5 rounded-2xl border transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                                          isFullyBooked 
                                          ? 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-60 grayscale cursor-not-allowed' 
                                          : isSelected
                                            ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 shadow-md ring-1 ring-indigo-500 scale-[1.02]'
                                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-indigo-300 hover:-translate-y-0.5'
                                        }`}
                                      >
                                        <div className="flex flex-col gap-1.5">
                                          <div className="flex items-center gap-3">
                                            <span className={`text-[1.1rem] font-black tracking-tight ${isFullyBooked ? 'text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                                              {formattedStart}{formattedEnd ? ` \u2013 ${formattedEnd}` : ''}
                                            </span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                                              isFullyBooked ? 'bg-gray-300 text-gray-700 dark:bg-gray-600 dark:text-gray-300' : 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400'
                                            }`}>
                                              {isFullyBooked ? 'Booked' : 'Available'}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-4 text-xs font-semibold text-gray-500 dark:text-gray-400">
                                            <span className="flex items-center gap-1"><Clock size={12}/> {slot.duration || 30} Minutes</span>
                                            <span className="flex items-center gap-1 font-bold text-indigo-600 dark:text-indigo-400">₹{selectedLawyer?.consultationFee || 1500}</span>
                                          </div>
                                        </div>
                                        <div className="flex items-center justify-between sm:justify-end gap-4 mt-2 sm:mt-0">
                                          <button
                                            type="button"
                                            disabled={isFullyBooked}
                                            onClick={() => handleTimeSelect(slot)}
                                            className={`px-8 py-3 rounded-xl font-bold transition-all w-full sm:w-auto ${
                                              isFullyBooked
                                                ? 'bg-gray-200 text-gray-400 dark:bg-gray-700 cursor-not-allowed hidden sm:block'
                                                : isSelected
                                                  ? 'bg-indigo-800 text-white shadow-lg'
                                                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-indigo-500/30'
                                            }`}
                                          >
                                            {isFullyBooked ? 'Booked' : 'Book'}
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          };

                          return (
                            <>
                              {renderGroup("Morning", morningSlots, "🌅")}
                              {renderGroup("Afternoon", afternoonSlots, "☀️")}
                              {renderGroup("Evening", eveningSlots, "🌙")}
                              {renderGroup("Night", nightSlots, "🌃")}
                            </>
                          );
                        })()
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {step === 3 && paymentSuccess && (
          <motion.div 
            key="step3"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md mx-auto bg-white dark:bg-gray-800 p-10 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 text-center"
          >
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-400 mx-auto mb-6">
              <CheckCircle size={40} />
            </div>
            <h2 className="text-2xl font-bold dark:text-white mb-2">Appointment Confirmed!</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              Your appointment with <span className="font-bold text-gray-900 dark:text-white">{selectedLawyer?.name}</span> is successfully booked.
            </p>
            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700 mb-8 inline-block text-left w-full text-sm space-y-2 text-gray-700 dark:text-gray-300">
              <div className="flex justify-between border-b border-gray-200 dark:border-gray-700 pb-2 mb-2"><span className="font-medium">Date:</span> <span>{appointmentDate}</span></div>
              <div className="flex justify-between border-b border-gray-200 dark:border-gray-700 pb-2 mb-2"><span className="font-medium">Time:</span> <span>{appointmentTime}</span></div>
              <div className="flex justify-between border-b border-gray-200 dark:border-gray-700 pb-2 mb-2"><span className="font-medium">Fee:</span> <span>₹{selectedLawyer?.consultationFee}</span></div>
              <div className="flex justify-between"><span className="font-medium">Status:</span> <span className="text-emerald-600 font-bold">Confirmed</span></div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={() => navigate('/dashboard')}
                className="flex-1 py-3 px-6 bg-white dark:bg-gray-800 border-2 border-indigo-600 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl font-bold transition-colors"
              >
                View Dashboard
              </button>
              <button 
                onClick={() => {
                  setStep(1);
                  setPaymentSuccess(false);
                  setAppointmentDate('');
                  setAppointmentTime('');
                  setSelectedLawyer(null);
                }}
                className="flex-1 py-3 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors shadow-sm hover:shadow-indigo-500/25"
              >
                Book Another
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal overlay */}
      <AnimatePresence>
        {showConfirmModal && selectedSlotObj && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
              onClick={() => !isProcessing && setShowConfirmModal(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700 flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Confirm Booking</h3>
                <button 
                  onClick={() => !isProcessing && setShowConfirmModal(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>

              <div className="p-6 overflow-y-auto">
                <div className="flex items-center gap-4 mb-6 p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100 dark:border-indigo-500/20">
                  <div className="w-16 h-16 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm overflow-hidden border-2 border-indigo-200 dark:border-indigo-700">
                    {selectedLawyer?.profileImageUrl ? (
                      <img src={selectedLawyer.profileImageUrl} alt="Lawyer" className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon size={28} />
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-lg text-gray-900 dark:text-white">{selectedLawyer?.name}</h4>
                    <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">{selectedLawyer?.specializationCategory || 'General Practice'}</p>
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-gray-500 dark:text-gray-400 font-medium flex items-center gap-2">
                      <Calendar size={16} /> Date
                    </span>
                    <span className="font-bold text-gray-900 dark:text-white">{format(new Date(appointmentDate), 'dd MMM yyyy')}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-gray-500 dark:text-gray-400 font-medium flex items-center gap-2">
                      <Clock size={16} /> Time
                    </span>
                    <span className="font-bold text-gray-900 dark:text-white">
                      {formatAmPm(getSlotStart(selectedSlotObj))} &ndash; {formatAmPm(getSlotEnd(selectedSlotObj))}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-gray-500 dark:text-gray-400 font-medium flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"></path><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg> Duration
                    </span>
                    <span className="font-bold text-gray-900 dark:text-white">{selectedSlotObj?.duration || 30} Minutes</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-gray-500 dark:text-gray-400 font-medium flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"></path><path d="M12 18V6"></path></svg> Fee
                    </span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 text-lg">₹{selectedLawyer?.consultationFee}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Meeting Type</label>
                    <div className="flex gap-3">
                      <button 
                        type="button" 
                        onClick={() => setMeetingType('ONLINE')}
                        className={`flex-1 py-2.5 rounded-xl border text-sm font-bold transition-all ${meetingType === 'ONLINE' ? 'bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300' : 'bg-white border-gray-200 text-gray-600 dark:bg-gray-800 dark:border-gray-600 hover:border-gray-300'}`}
                      >
                        Online
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setMeetingType('IN_PERSON')}
                        className={`flex-1 py-2.5 rounded-xl border text-sm font-bold transition-all ${meetingType === 'IN_PERSON' ? 'bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300' : 'bg-white border-gray-200 text-gray-600 dark:bg-gray-800 dark:border-gray-600 hover:border-gray-300'}`}
                      >
                        In Person
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Case Notes (Optional)</label>
                    <textarea 
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Briefly describe your legal issue..."
                      className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-sm dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none transition-shadow"
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex gap-4">
                <button 
                  type="button" 
                  onClick={() => !isProcessing && setShowConfirmModal(false)} 
                  disabled={isProcessing}
                  className="w-1/3 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-white rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={handleBooking}
                  disabled={isProcessing} 
                  className="w-2/3 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-indigo-500/25 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      Confirming...
                    </span>
                  ) : (
                    <>
                      <CheckCircle size={18} />
                      Confirm Appointment
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AppointmentBooking;
