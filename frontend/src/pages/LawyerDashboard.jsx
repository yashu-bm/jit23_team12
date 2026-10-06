import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, Calendar, Clock, DollarSign, Users, Star, Briefcase, Plus, X, Upload, CheckCircle2, ChevronRight, Download, Camera, LogOut, Check, Percent, Trash2, Shield, Calendar as CalendarIcon, AlertCircle, MapPin, Save, ShieldCheck, TrendingDown, FileText
} from 'lucide-react';
import api from '../services/api';
import { logout } from '../redux/authSlice';
import RealTimeChat from '../components/RealTimeChat';
import ErrorBoundary from '../components/ErrorBoundary';
import NotificationBell from '../components/NotificationBell';
import SmartCalendar from '../components/SmartCalendar';
import { format, startOfMonth, endOfMonth } from 'date-fns';

const categories = [
  { id: 1, name: 'Criminal' },
  { id: 2, name: 'Family' },
  { id: 3, name: 'Property' },
  { id: 4, name: 'Corporate' },
  { id: 5, name: 'Cyber Crime' },
  { id: 6, name: 'Labour' },
  { id: 7, name: 'Tax' },
  { id: 8, name: 'Consumer' },
  { id: 9, name: 'Civil' },
  { id: 10, name: 'Intellectual Property' }
];

const LawyerDashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('appointments');
  const [appointmentView, setAppointmentView] = useState('list');
  const [appointmentFilter, setAppointmentFilter] = useState('All');
  const [appointmentSearch, setAppointmentSearch] = useState('');

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login', { replace: true });
  };
  
  // States
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const [profile, setProfile] = useState({
    experienceYears: '',
    qualification: '',
    city: '',
    state: '',
    languages: '',
    barCouncilNumber: '',
    consultationFee: '',
    availabilityStatus: 'AVAILABLE',
    bio: '',
    specializationCategoryId: '',
    verificationStatus: 'PENDING',
    adminRemarks: '',
    profileCompletion: 0,
    averageRating: 0.00,
    totalReviews: 0,
    profileImageUrl: '',
    workingDays: '1,2,3,4,5',
    startWorkingTime: '09:00:00',
    endWorkingTime: '18:00:00',
    slotDuration: 30,
    lunchBreakStart: '',
    lunchBreakEnd: '',
    advocateCertificateUrl: '',
    createdAt: null,
    approvedAt: null,
    rejectedAt: null,
    suspendedAt: null,
    approvedBy: ''
  });

  const handleWorkingDayToggle = (dayValue) => {
    const currentDays = profile.workingDays ? profile.workingDays.split(',') : [];
    if (currentDays.includes(dayValue)) {
      setProfile({ ...profile, workingDays: currentDays.filter(d => d !== dayValue).join(',') });
    } else {
      setProfile({ ...profile, workingDays: [...currentDays, dayValue].sort().join(',') });
    }
  };

  const [uploadingImage, setUploadingImage] = useState(false);

  const [appointments, setAppointments] = useState([]);
  const [earningsData, setEarningsData] = useState({
    earnings: [],
    totalAmount: 0,
    netAmount: 0,
    platformFees: 0
  });
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [globalUnreadCount, setGlobalUnreadCount] = useState(0);

  const [chatTarget, setChatTarget] = useState(null);
  const [chatSession, setChatSession] = useState(null);
  
  // Availability state
  const [availabilities, setAvailabilities] = useState([]);
  const [availabilityForm, setAvailabilityForm] = useState({ id: null, dayOfWeek: '', date: new Date().toISOString().split('T')[0], startTime: '09:00', endTime: '17:00', duration: '30', maxAppointments: '1', statusType: 'Available' });

  const hasOverlap = (form) => {
    if (form.statusType === 'Break') return false; // Breaks are allowed to overlap with working hours
    
    const normalizeTime = (t) => {
      if (!t) return '00:00';
      if (Array.isArray(t)) return `${String(t[0]).padStart(2, '0')}:${String(t[1] || 0).padStart(2, '0')}`;
      return typeof t === 'string' ? t.substring(0, 5) : '00:00';
    };

    // Overlap condition: max(start1, start2) < min(end1, end2)
    if (form.dayOfWeek === '') {
      const sameDateAvails = availabilities.filter(a => a.date === form.date && a.id !== form.id && a.isAvailable !== false && a.reason !== 'Break');
      for (let a of sameDateAvails) {
         const aStart = normalizeTime(a.startTime);
         const aEnd = normalizeTime(a.endTime);
         if (aStart < form.endTime && form.startTime < aEnd) {
            return true;
         }
      }
    } else {
      const sameDayAvails = availabilities.filter(a => a.dayOfWeek === parseInt(form.dayOfWeek) && a.id !== form.id && a.isAvailable !== false && a.reason !== 'Break');
      for (let a of sameDayAvails) {
         const aStart = normalizeTime(a.startTime);
         const aEnd = normalizeTime(a.endTime);
         if (aStart < form.endTime && form.startTime < aEnd) {
            return true;
         }
      }
    }
    return false;
  };

  const [calendarModal, setCalendarModal] = useState({ show: false, date: null, status: null, existingRuleId: null });

  const handleCalendarClick = (event) => {
    if (!event || !event.start) return;
    const dateStr = format(new Date(event.start), 'yyyy-MM-dd');
    const existingRule = availabilities.find(a => a.date === dateStr);
    setCalendarModal({
      show: true,
      date: dateStr,
      status: event.resource?.type || 'AVAILABLE',
      existingRuleId: existingRule ? existingRule.id : null
    });
  };

  const handleMarkStatus = async (statusType) => {
    try {
      if (calendarModal.existingRuleId) {
        await api.delete(`availability/${calendarModal.existingRuleId}`);
      }
      
      if (statusType !== 'AVAILABLE') {
        await api.post(`availability/lawyer/${user.id}`, {
          date: calendarModal.date,
          isAvailable: false,
          reason: statusType,
          startTime: '00:00:00',
          endTime: '23:59:59',
          maxAppointments: 0,
          duration: 0
        });
        showToast(`Date marked as ${statusType === 'HOLIDAY' ? 'Holiday' : 'Unavailable'}`, 'success');
      } else {
        showToast('Schedule restored to Available', 'success');
      }
      
      setCalendarModal({ show: false, date: null, status: null, existingRuleId: null });
      loadAvailabilities();
      
      // Refresh the calendar events immediately
      const startStr = format(startOfMonth(new Date(calendarModal.date)), 'yyyy-MM-dd');
      const endStr = format(endOfMonth(new Date(calendarModal.date)), 'yyyy-MM-dd');
      fetchCalendarEvents(startStr, endStr);
    } catch (err) {
      console.error(err);
      showToast('Failed to update status', 'error');
    }
  };
  const [calendarEvents, setCalendarEvents] = useState([]);
  const fetchCalendarEvents = React.useCallback(async (startStr, endStr) => {
    if (!user?.id) return;
    try {
      const storedUser = JSON.parse(localStorage.getItem('user')) || JSON.parse(sessionStorage.getItem('user'));
      const token = storedUser?.token || user?.token;
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      
      const res = await api.get(`availability/lawyer/${user.id}/calendar?start=${startStr}&end=${endStr}`, config);
      setCalendarEvents(res.data);
    } catch (err) {
      console.error("Failed to load calendar events", err);
    }
  }, [user?.id]);

  const startChat = async (targetUserId, targetName, targetUserProfileImage) => {
    try {
      const res = await api.post('chat/session', { targetUserId });
      setChatSession(res.data);
      setChatTarget({ targetUserId, targetName, targetUserProfileImage });
      loadConversations();
    } catch (error) {
      alert('Failed to start chat session');
    }
  };

  useEffect(() => {
    loadProfile();
    loadAppointments();
    loadEarnings();
    loadClients();
    loadReviews();
    loadConversations();
    loadAvailabilities();
    
    // Poll unread count every 10 seconds
    const interval = setInterval(loadConversations, 10000);
    return () => clearInterval(interval);
  }, [user]);

  const loadAvailabilities = () => {
    if (user?.id) {
      api.get(`availability/lawyer/${user.id}`)
        .then(res => setAvailabilities(res.data))
        .catch(err => console.error('Failed to load availabilities', err));
    }
  };

  const loadConversations = () => {
    api.get('chat/conversations')
      .then(res => {
        setConversations(res.data);
        const total = res.data.reduce((sum, c) => sum + c.unreadCount, 0);
        setGlobalUnreadCount(total);
      })
      .catch(err => console.error(err));
  };

  const loadProfile = () => {
    api.get('lawyers/profile')
      .then(res => {
        if (res.data) {
          setProfile({
            experienceYears: res.data.experienceYears || '',
            qualification: res.data.qualification || '',
            city: res.data.city || '',
            state: res.data.state || '',
            languages: res.data.languages || '',
            barCouncilNumber: res.data.barCouncilNumber || '',
            consultationFee: res.data.consultationFee || '',
            availabilityStatus: res.data.availabilityStatus || 'AVAILABLE',
            bio: res.data.bio || '',
            verificationStatus: res.data.verificationStatus || 'PENDING',
            adminRemarks: res.data.adminRemarks || '',
            specializationCategoryId: res.data.specializationCategory ? res.data.specializationCategory.id : '',
            profileCompletion: res.data.profileCompletion || 0,
            averageRating: res.data.averageRating || 0.00,
            totalReviews: res.data.totalReviews || 0,
            profileImageUrl: res.data.profileImageUrl || '',
            workingDays: res.data.workingDays || '1,2,3,4,5',
            startWorkingTime: res.data.startWorkingTime || '09:00:00',
            endWorkingTime: res.data.endWorkingTime || '18:00:00',
            slotDuration: res.data.slotDuration || 30,
            lunchBreakStart: res.data.lunchBreakStart || '',
            lunchBreakEnd: res.data.lunchBreakEnd || '',
            advocateCertificateUrl: res.data.advocateCertificateUrl || '',
            createdAt: res.data.createdAt || null,
            approvedAt: res.data.approvedAt || null,
            rejectedAt: res.data.rejectedAt || null,
            suspendedAt: res.data.suspendedAt || null,
            approvedBy: res.data.approvedBy || ''
          });
        }
      })
      .catch(err => console.error(err));
  };

  const loadAppointments = () => {
    api.get(`appointments/lawyer/${user.id}`)
      .then(res => setAppointments(res.data))
      .catch(err => console.error(err));
  };

  const loadEarnings = () => {
    api.get('lawyers/earnings')
      .then(res => setEarningsData(res.data))
      .catch(err => console.error(err));
  };

  const loadClients = () => {
    api.get('lawyers/clients')
      .then(res => setClients(res.data))
      .catch(err => console.error(err));
  };

  const loadReviews = () => {
    // Use the user.id (lawyer's user_id) to fetch reviews
    api.get(`reviews/lawyer/${user.id}`)
      .then(res => setReviews(res.data))
      .catch(err => console.error(err));
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.put('lawyers/profile', profile);
      setProfile(prev => ({
        ...prev,
        ...res.data,
        specializationCategoryId: res.data.specializationCategory ? res.data.specializationCategory.id : ''
      }));
      alert('Professional profile updated successfully!');
      loadProfile();
    } catch (err) {
      alert('Failed to update profile: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleCertificateUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      alert("Certificate size must be less than 5 MB.");
      return;
    }
    
    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await api.post('v1/lawyer/profile/upload-certificate', formData);
      setProfile(prev => ({ ...prev, advocateCertificateUrl: res.data.advocateCertificateUrl }));
      alert(res.data.message || 'Certificate uploaded successfully.');
    } catch (err) {
      alert(err.response?.data?.message || "Failed to upload certificate.");
    } finally {
      setLoading(false);
    }
  };

  const handleResubmitVerification = async () => {
    if (!profile.advocateCertificateUrl) {
      alert("You must upload an advocate certificate before resubmitting.");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('v1/lawyer/profile/resubmit');
      setProfile(prev => ({ ...prev, verificationStatus: 'PENDING', isApproved: false, rejectedAt: null, adminRemarks: '' }));
      alert(res.data.message || "Profile resubmitted successfully.");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to resubmit profile.");
    } finally {
      setLoading(false);
    }
  };

  const handleAppointmentStatus = async (appId, status) => {
    try {
      await api.put(`appointments/${appId}/status`, { status });
      alert(`Appointment marked as ${status}`);
      loadAppointments();
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Image size must be less than 5 MB.");
      return;
    }

    if (!file.type.match('image/(jpeg|jpg|png)')) {
      alert("Only JPG, JPEG, and PNG files are allowed.");
      return;
    }

    setUploadingImage(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      // Create a unique timestamp for cache busting
      const cacheBuster = `?t=${new Date().getTime()}`;
      const res = await api.post('lawyers/profile/upload-photo', formData);
      setProfile(prev => ({
        ...prev,
        profileImageUrl: res.data.profileImageUrl + cacheBuster
      }));
      alert(res.data.message || 'Profile photo updated successfully.');
      
      // Update User object in Redux with the new image so header updates immediately if applicable
      // Note: We might not need this if we just use the profileImageUrl from state
    } catch (err) {
      console.error(err);
      console.error(err.response);
      console.error(err.response?.data);
      alert(err.response?.data?.message || "Failed to upload photo.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDeletePhoto = async () => {
    if (!window.confirm('Are you sure you want to remove your profile photo?')) return;
    
    try {
      const res = await api.delete('lawyers/profile/photo');
      setProfile(prev => ({ ...prev, profileImageUrl: '' }));
      alert(res.data.message || 'Photo removed successfully.');
    } catch (err) {
      alert('Failed to delete photo.');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 min-h-screen">
      
      {/* Overview Header */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white p-10 md:p-14 shadow-2xl border border-slate-700/50">
        <div className="absolute top-0 left-0 w-full h-full opacity-40 pointer-events-none overflow-hidden">
          <div className="absolute top-[-30%] left-[-10%] w-[60%] h-[150%] bg-gradient-to-r from-primary-600/40 to-transparent blur-[120px] rounded-full mix-blend-screen"></div>
          <div className="absolute bottom-[-30%] right-[-10%] w-[50%] h-[150%] bg-gradient-to-l from-brand-indigo/30 to-transparent blur-[120px] rounded-full mix-blend-screen"></div>
        </div>
        
        <div className="relative z-10 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-10">
          <div className="flex items-center gap-8">
            <div className="relative shrink-0 hidden sm:block w-24 h-24 md:w-28 md:h-28 group">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary-500 to-brand-indigo flex items-center justify-center text-4xl font-black text-white shadow-xl shadow-primary-500/30 group-hover:scale-105 transition-transform duration-500 border-[4px] border-white/10 backdrop-blur-md">
                {user?.firstName?.charAt(0) || 'L'}
              </div>
              {profile?.profileImageUrl && (
                <img 
                  src={profile.profileImageUrl} 
                  alt="Lawyer Profile" 
                  className="absolute inset-0 w-full h-full rounded-full object-cover border-[4px] border-white/10 shadow-xl shadow-primary-500/30 group-hover:scale-105 transition-transform duration-500 bg-slate-800" 
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              )}
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
                Welcome, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-primary-300">Advocate {user?.firstName || ''}</span>
              </h1>
              <p className="text-slate-300 text-lg font-medium max-w-2xl leading-relaxed">Manage your premium legal practice, track high-value earnings, and consult with clients on a secure, enterprise-grade platform.</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 items-center bg-white/5 backdrop-blur-xl p-3 md:p-4 rounded-[2rem] border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
            <div className="flex items-center gap-4 px-4 py-2 hover:bg-white/5 rounded-2xl transition-colors cursor-default">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 border border-indigo-500/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
                <Percent size={22} strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-[11px] text-indigo-300/80 uppercase tracking-widest font-extrabold mb-0.5">Profile</p>
                <p className="font-black text-lg text-white tracking-tight">{profile.profileCompletion}%</p>
              </div>
            </div>
            <div className="w-px h-12 bg-white/10 hidden sm:block"></div>
            <div className="flex items-center gap-4 px-4 py-2 hover:bg-white/5 rounded-2xl transition-colors cursor-default">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-400 border border-amber-500/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
                <Star className="fill-current" size={22} />
              </div>
              <div>
                <p className="text-[11px] text-amber-300/80 uppercase tracking-widest font-extrabold mb-0.5">Rating</p>
                <p className="font-black text-lg text-white tracking-tight">{profile.averageRating} <span className="text-slate-400 text-xs font-semibold ml-1">({profile.totalReviews})</span></p>
              </div>
            </div>
            <div className="w-px h-12 bg-white/10 hidden sm:block"></div>
            <div className="flex items-center gap-4 px-4 py-2 hover:bg-white/5 rounded-2xl transition-colors cursor-default">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 border border-emerald-500/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
                <Clock size={22} strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-[11px] text-emerald-300/80 uppercase tracking-widest font-extrabold mb-0.5">Status</p>
                <p className="font-black text-lg text-emerald-400 tracking-tight">{profile.availabilityStatus}</p>
              </div>
            </div>
            <div className="w-px h-12 bg-white/10 hidden sm:block"></div>
            <div className="px-4 flex items-center gap-4">
              <NotificationBell lightText={true} />
              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all font-bold border border-red-500/20 hover:border-red-500/40 hover:shadow-[0_0_20px_rgba(239,68,68,0.2)] active:scale-95"
              >
                <LogOut size={18} strokeWidth={2.5} /> Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
        {[
          { label: 'Consultations', value: appointments.length, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10', border: 'border-blue-100 dark:border-blue-800/30' },
          { label: 'Pending', value: appointments.filter(a => a.status === 'PENDING').length, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-900/20 dark:to-orange-800/10', border: 'border-orange-100 dark:border-orange-800/30' },
          { label: 'Confirmed', value: appointments.filter(a => a.status === 'CONFIRMED' || a.status === 'PAID').length, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-800/10', border: 'border-emerald-100 dark:border-emerald-800/30' },
          { label: 'Completed', value: appointments.filter(a => a.status === 'COMPLETED').length, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-800/10', border: 'border-purple-100 dark:border-purple-800/30' },
          { label: 'Earnings', value: `₹${earningsData.totalAmount}`, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-indigo-900/20 dark:to-indigo-800/10', border: 'border-indigo-100 dark:border-indigo-800/30' },
          { label: 'Reviews', value: profile.totalReviews, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-800/10', border: 'border-amber-100 dark:border-amber-800/30' },
        ].map((stat, idx) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05, duration: 0.4 }}
            key={stat.label} 
            className={`rounded-[2rem] p-6 flex flex-col justify-center items-center text-center border ${stat.border} ${stat.bg} shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300`}
          >
             <div className={`text-3xl font-black ${stat.color} mb-2 tracking-tight`}>{stat.value}</div>
             <div className="text-[11px] text-gray-500 dark:text-gray-400 font-extrabold uppercase tracking-widest">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 lg:gap-10">
        
        {/* Navigation Sidebar */}
        <div className="lg:col-span-1 flex flex-col gap-2">
          {[
            { id: 'appointments', label: 'Consultations', icon: Calendar },
            { id: 'availability', label: 'Availability', icon: CalendarIcon },
            { id: 'profile', label: 'Practice Profile', icon: Briefcase },
            { id: 'verification', label: 'Verification', icon: ShieldCheck },
            { id: 'earnings', label: 'Earnings Summary', icon: DollarSign },
            { id: 'clients', label: 'My Client History', icon: Users },
            { id: 'reviews', label: 'Reviews & Ratings', icon: Star },
            { id: 'messages', label: 'Messages', icon: MessageSquare, badge: globalUnreadCount },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="relative w-full flex items-center justify-between px-5 py-4 rounded-[1.25rem] font-bold text-sm transition-all group overflow-hidden"
              >
                {/* Active Background */}
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 bg-primary-600 dark:bg-primary-500 shadow-lg shadow-primary-500/20"
                    initial={false}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                
                {/* Hover Background */}
                {!isActive && (
                  <div className="absolute inset-0 bg-gray-100 dark:bg-slate-800/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-[1.25rem]" />
                )}

                <div className={`relative z-10 flex items-center gap-4 transition-colors ${isActive ? 'text-white' : 'text-gray-600 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white'}`}>
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-white' : 'text-gray-400 dark:text-gray-500 group-hover:text-primary-500'} />
                  <span className="tracking-wide">{tab.label}</span>
                </div>
                
                {tab.badge > 0 && (
                  <span className={`relative z-10 flex h-6 w-6 items-center justify-center text-[11px] font-black rounded-full shadow-sm transition-colors ${isActive ? 'bg-white text-primary-600' : 'bg-red-500 text-white shadow-red-500/30'}`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab content area */}
        <div className="lg:col-span-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
            >
              
              {/* APPOINTMENTS TAB */}
              {activeTab === 'appointments' && (
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2.5rem] p-8 md:p-10 shadow-2xl border border-white/40 dark:border-slate-700/50">
                  <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-10">
                    <h2 className="text-3xl font-extrabold flex items-center gap-4 text-gray-900 dark:text-white tracking-tight">
                      <div className="p-3 bg-gradient-to-br from-primary-500 to-brand-indigo shadow-lg shadow-primary-500/30 text-white rounded-2xl">
                        <Calendar size={28} />
                      </div>
                      Consultation Bookings
                    </h2>
                    
                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
                      <div className="flex items-center bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-xl p-1 w-full sm:w-auto shadow-sm">
                        <select 
                          className="bg-transparent text-sm font-bold outline-none px-4 py-2 text-gray-700 dark:text-gray-300 w-full cursor-pointer appearance-none"
                          value={appointmentFilter}
                          onChange={(e) => setAppointmentFilter(e.target.value)}
                        >
                          <option value="All">All Requests</option>
                          <option value="Pending">Pending</option>
                          <option value="Completed">Completed</option>
                        </select>
                      </div>

                      <div className="relative w-full sm:w-64">
                        <input 
                          type="text" 
                          placeholder="Search clients..." 
                          className="w-full pl-10 pr-4 py-3 rounded-xl text-sm bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-primary-500/50 outline-none dark:text-white font-medium shadow-sm transition-all"
                          value={appointmentSearch}
                          onChange={(e) => setAppointmentSearch(e.target.value)}
                        />
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                        </div>
                      </div>

                      <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-xl shadow-inner border border-gray-200 dark:border-slate-700 w-full sm:w-auto">
                        <button
                          onClick={() => setAppointmentView('list')}
                          className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${appointmentView === 'list' ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm shadow-gray-200/50 dark:shadow-none' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}
                        >
                          List View
                        </button>
                        <button
                          onClick={() => setAppointmentView('calendar')}
                          className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${appointmentView === 'calendar' ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm shadow-gray-200/50 dark:shadow-none' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}
                        >
                          Calendar
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {appointmentView === 'calendar' ? (
                    <SmartCalendar 
                      eventsData={calendarEvents} 
                      onDateRangeChange={fetchCalendarEvents}
                      isLawyer={true}
                      onAvailabilityChange={() => {
                        loadAvailabilities();
                      }}
                      lawyerId={user?.id}
                      onEventClick={(event) => {
                        if (event.resource && event.resource.type !== 'AVAILABLE' && event.resource.type !== 'UNAVAILABLE') {
                          // Details modal
                        }
                      }}
                    />
                  ) : (
                    <div className="space-y-6">
                      {(() => {
                        let filtered = appointments;
                        
                        if (appointmentFilter === 'Completed') filtered = filtered.filter(a => a.status === 'COMPLETED');
                        if (appointmentFilter === 'Pending') filtered = filtered.filter(a => a.status === 'PENDING');
                        
                        if (appointmentSearch.trim()) {
                          const q = appointmentSearch.toLowerCase();
                          filtered = filtered.filter(a => 
                            (a.userName && a.userName.toLowerCase().includes(q)) || 
                            (a.notes && a.notes.toLowerCase().includes(q))
                          );
                        }

                        filtered = [...filtered].sort((a, b) => {
                          return new Date(b.appointmentDate) - new Date(a.appointmentDate);
                        });

                        if (filtered.length === 0) {
                          return (
                            <div className="text-center py-20 text-gray-500 bg-gray-50/50 dark:bg-slate-800/30 rounded-[2rem] border-2 border-dashed border-gray-200 dark:border-slate-700 flex flex-col items-center justify-center">
                              <div className="w-20 h-20 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                                <Calendar size={32} className="text-gray-400 dark:text-slate-500" />
                              </div>
                              <p className="text-xl font-bold text-gray-700 dark:text-gray-300">No consultations found.</p>
                              <p className="text-sm mt-2">Try adjusting your filters or search query.</p>
                            </div>
                          );
                        }

                        return (
                          <div className="grid grid-cols-1 gap-6">
                            {filtered.map((app, i) => (
                                    <motion.div 
                                      initial={{ opacity: 0, y: 20 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      transition={{ delay: i * 0.05 }}
                                      key={app.id} 
                                      className="bg-white dark:bg-slate-800/80 rounded-[2rem] p-6 sm:p-8 flex flex-col gap-8 shadow-sm hover:shadow-lg border border-gray-100 dark:border-slate-700/50 transition-all duration-300"
                                    >
                                      <div className="flex flex-col lg:flex-row gap-6 justify-between lg:items-start">
                                        <div className="flex items-start sm:items-center gap-5">
                                          <div className="w-16 h-16 shrink-0 rounded-[1.25rem] bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-indigo-500/30">
                                            {app.userName ? app.userName.charAt(0) : 'U'}
                                          </div>
                                          <div className="flex flex-col gap-2">
                                            <h3 className="font-extrabold text-2xl text-gray-900 dark:text-white tracking-tight">
                                              {app.userName || `Client #${app.userId}`}
                                            </h3>
                                            <div className="flex flex-wrap items-center gap-3 text-sm font-bold">
                                              <span className="flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 px-3 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-500/20">
                                                <Clock size={14} />
                                                {app.appointmentDate ? new Date(app.appointmentDate).toLocaleString() : 'Date TBD'}
                                              </span>
                                              {app.paymentStatus && (
                                                <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${
                                                  app.paymentStatus === 'SUCCESS' ? 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/20' :
                                                  app.paymentStatus === 'PENDING' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20' :
                                                  'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20'
                                                }`}>
                                                  Payment: {app.paymentStatus}
                                                </span>
                                              )}
                                            </div>
                                            {app.notes && <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 bg-gray-50 dark:bg-slate-900/50 p-4 rounded-xl border border-gray-100 dark:border-slate-800 leading-relaxed font-medium italic">"{app.notes}"</p>}
                                          </div>
                                        </div>
                                        
                                        <div className="flex flex-wrap items-center gap-3">
                                          {app.status === 'PENDING' && (
                                            <>
                                              <button 
                                                onClick={() => handleAppointmentStatus(app.id, 'CONFIRMED')}
                                                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 hover:-translate-y-0.5 transition-all active:scale-95"
                                              >
                                                <Check size={18} strokeWidth={2.5} /> Accept Request
                                              </button>
                                              <button 
                                                onClick={() => handleAppointmentStatus(app.id, 'REJECTED')}
                                                className="flex items-center gap-2 px-6 py-3 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20 rounded-xl text-sm font-bold hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors active:scale-95"
                                              >
                                                <X size={18} strokeWidth={2.5} /> Reject
                                              </button>
                                            </>
                                          )}
                                          {app.status === 'PAID' && (
                                            <button 
                                              onClick={() => handleAppointmentStatus(app.id, 'COMPLETED')}
                                              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all active:scale-95"
                                            >
                                              <CheckCircle2 size={18} strokeWidth={2.5} /> Mark Completed
                                            </button>
                                          )}
                                          {(app.status === 'PAID' || app.status === 'COMPLETED') && (
                                            <button
                                              onClick={() => startChat(app.userId, app.userName)}
                                              className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 border border-gray-200 dark:border-slate-600 rounded-xl text-sm font-bold shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all active:scale-95"
                                            >
                                              <MessageSquare size={18} strokeWidth={2.5} /> Message Client
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                      
                                      {/* Modern Progress Timeline */}
                                      <div className="pt-6 border-t border-gray-100 dark:border-slate-700/50">
                                        <div className="flex items-center justify-between relative px-4">
                                          {/* Background Track */}
                                          <div className="absolute left-8 right-8 top-[14px] h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                            {/* Fill Track */}
                                            <div className="h-full bg-gradient-to-r from-primary-400 to-primary-600 transition-all duration-700 ease-out" 
                                              style={{ 
                                                width: app.status === 'COMPLETED' ? '100%' : 
                                                       ['PAID'].includes(app.status) ? '66%' : 
                                                       ['CONFIRMED'].includes(app.status) ? '33%' : '0%' 
                                              }} 
                                            />
                                          </div>
                                          
                                          {/* Nodes */}
                                          {[
                                            { step: 'Requested', isActive: true, isDone: true },
                                            { step: 'Accepted', isActive: ['CONFIRMED', 'PAID', 'COMPLETED'].includes(app.status), isDone: ['CONFIRMED', 'PAID', 'COMPLETED'].includes(app.status) },
                                            { step: 'Paid', isActive: ['PAID', 'COMPLETED'].includes(app.status), isDone: ['PAID', 'COMPLETED'].includes(app.status) },
                                            { step: 'Completed', isActive: app.status === 'COMPLETED', isDone: app.status === 'COMPLETED' }
                                          ].map((item, idx) => (
                                            <div key={idx} className="relative z-10 flex flex-col items-center gap-3 w-1/4">
                                              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-[4px] transition-all duration-500 ${item.isActive ? 'bg-primary-600 border-primary-100 dark:border-primary-900/50 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)]' : 'bg-gray-200 dark:bg-slate-600 border-white dark:border-slate-800 text-transparent'}`}>
                                                {item.isDone && <Check size={14} strokeWidth={4} />}
                                              </div>
                                              <span className={`text-[10px] sm:text-[11px] font-black uppercase tracking-widest transition-colors ${item.isActive ? 'text-primary-700 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500'}`}>{item.step}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </motion.div>
                                  ))}
                          </div>
                        );
                      })()}
                  </div>
                  )}
                </div>
              )}

              {/* AVAILABILITY TAB */}
              {activeTab === 'availability' && (
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2.5rem] p-8 md:p-10 shadow-2xl border border-white/40 dark:border-slate-700/50">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10">
                    <h2 className="text-3xl font-extrabold flex items-center gap-4 text-gray-900 dark:text-white tracking-tight">
                      <div className="p-3 bg-gradient-to-br from-indigo-500 to-primary-600 shadow-lg shadow-indigo-500/30 text-white rounded-2xl">
                        <CalendarIcon size={28} />
                      </div>
                      Availability Management
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Add New Availability */}
                    <div className="bg-gray-50/50 dark:bg-slate-800/50 rounded-[2rem] p-8 border border-gray-100 dark:border-slate-700/50">
                      <h3 className="text-xl font-bold mb-6 text-gray-800 dark:text-gray-200">Configure Working Schedule</h3>
                      <form onSubmit={async (e) => {
                        e.preventDefault();
                        if (availabilityForm.endTime <= availabilityForm.startTime) {
                          showToast('End time must be after start time.', 'error');
                          return;
                        }
                        if (availabilityForm.dayOfWeek === '' && availabilityForm.date && availabilityForm.date < new Date().toISOString().split('T')[0]) {
                          showToast('Cannot configure schedule for past dates.', 'error');
                          return;
                        }
                        if (hasOverlap(availabilityForm)) {
                          showToast('This session overlaps an existing working session.', 'error');
                          return;
                        }
                        try {
                          const isAvail = availabilityForm.statusType === 'Available';
                          const reasonText = isAvail ? null : 'Break';
                          const payload = {
                            ...availabilityForm,
                            dayOfWeek: availabilityForm.dayOfWeek ? parseInt(availabilityForm.dayOfWeek) : null,
                            date: availabilityForm.dayOfWeek ? null : availabilityForm.date,
                            isAvailable: isAvail,
                            reason: reasonText,
                            duration: availabilityForm.duration ? parseInt(availabilityForm.duration) : null,
                            maxAppointments: availabilityForm.maxAppointments ? parseInt(availabilityForm.maxAppointments) : 1
                          };
                          
                          if (availabilityForm.id) {
                            await api.put(`availability/${availabilityForm.id}`, payload);
                            showToast('Working schedule updated successfully!', 'success');
                          } else {
                            await api.post(`availability/lawyer/${user.id}`, payload);
                            showToast('Working schedule added successfully!', 'success');
                          }
                          setAvailabilityForm({ id: null, dayOfWeek: '', date: new Date().toISOString().split('T')[0], startTime: '09:00', endTime: '17:00', duration: '30', maxAppointments: '1', statusType: 'Available' });
                          loadAvailabilities();
                          // trigger calendar refresh
                          const startStr = format(startOfMonth(new Date()), 'yyyy-MM-dd');
                          const endStr = format(endOfMonth(new Date()), 'yyyy-MM-dd');
                          fetchCalendarEvents(startStr, endStr);
                        } catch (err) {
                          console.error("API Error during Save Schedule:", err);
                          showToast(err.response?.data?.message || 'Failed to update availability', 'error');
                        }
                      }} className="space-y-5">
                        
                        <div className="grid grid-cols-2 gap-5">
                          <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Rule Type</label>
                            <select 
                              className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500/50 outline-none font-medium shadow-sm transition-all"
                              value={availabilityForm.dayOfWeek ? 'recurring' : 'specific'}
                              onChange={(e) => {
                                if (e.target.value === 'recurring') {
                                  setAvailabilityForm({...availabilityForm, date: '', dayOfWeek: '1'});
                                } else {
                                  setAvailabilityForm({...availabilityForm, dayOfWeek: '', date: new Date().toISOString().split('T')[0]});
                                }
                              }}
                            >
                              <option value="specific">Specific Date</option>
                              <option value="recurring">Recurring Weekly</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Status Type</label>
                            <select 
                              className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500/50 outline-none font-medium shadow-sm transition-all"
                              value={availabilityForm.statusType || 'Available'}
                              onChange={(e) => setAvailabilityForm({...availabilityForm, statusType: e.target.value})}
                            >
                              <option value="Available">Working Time</option>
                              <option value="Break">Break / Unavailable</option>
                            </select>
                          </div>
                        </div>

                        {availabilityForm.dayOfWeek !== '' ? (
                          <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Day of Week</label>
                            <select 
                              className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500/50 outline-none font-medium shadow-sm transition-all"
                              value={availabilityForm.dayOfWeek}
                              onChange={(e) => setAvailabilityForm({...availabilityForm, dayOfWeek: e.target.value})}
                              required
                            >
                              <option value="1">Monday</option>
                              <option value="2">Tuesday</option>
                              <option value="3">Wednesday</option>
                              <option value="4">Thursday</option>
                              <option value="5">Friday</option>
                              <option value="6">Saturday</option>
                              <option value="7">Sunday</option>
                            </select>
                          </div>
                        ) : (
                          <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Date</label>
                            <input 
                              type="date"
                              className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500/50 outline-none font-medium shadow-sm transition-all"
                              value={availabilityForm.date}
                              min={new Date().toISOString().split('T')[0]}
                              onChange={(e) => setAvailabilityForm({...availabilityForm, date: e.target.value})}
                              required
                            />
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-5">
                          <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Start Time</label>
                            <input 
                              type="time"
                              className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500/50 outline-none font-medium shadow-sm transition-all"
                              value={availabilityForm.startTime}
                              onChange={(e) => setAvailabilityForm({...availabilityForm, startTime: e.target.value})}
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">End Time</label>
                            <input 
                              type="time"
                              className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500/50 outline-none font-medium shadow-sm transition-all"
                              value={availabilityForm.endTime}
                              onChange={(e) => setAvailabilityForm({...availabilityForm, endTime: e.target.value})}
                              required
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-5">
                          <div>
                            <label className={`block text-sm font-bold mb-2 ${availabilityForm.statusType === 'Break' ? 'text-gray-400 dark:text-gray-600' : 'text-gray-700 dark:text-gray-300'}`}>Appointment Duration</label>
                            <select 
                              className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500/50 outline-none font-medium shadow-sm transition-all disabled:opacity-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
                              value={availabilityForm.duration}
                              onChange={(e) => setAvailabilityForm({...availabilityForm, duration: e.target.value})}
                              disabled={availabilityForm.statusType === 'Break'}
                            >
                              <option value="15">15 Minutes</option>
                              <option value="30">30 Minutes</option>
                              <option value="45">45 Minutes</option>
                              <option value="60">60 Minutes</option>
                              <option value="90">90 Minutes</option>
                              <option value="120">120 Minutes</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Consultation Fee</label>
                          <div className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-500 font-medium cursor-not-allowed flex items-center justify-between">
                            <span>₹{profile.consultationFee || 'Not Set'}</span>
                            <span className="text-xs font-bold px-2 py-1 bg-gray-200 dark:bg-slate-700 rounded-md">READ ONLY</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Configure your fee in the Professional Profile tab.</p>
                        </div>



                        <button type="submit" disabled={availabilityForm.dayOfWeek === '' && availabilityForm.date && availabilityForm.date < new Date().toISOString().split('T')[0]} className="w-full py-3.5 mt-2 bg-gradient-to-r from-primary-500 to-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-primary-500/30 hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 text-sm">
                          Save Schedule
                        </button>
                      </form>
                    </div>

                    {/* List Availabilities */}
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 lg:p-8 border border-gray-100 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col h-[600px]">
                      <h3 className="text-xl font-bold mb-6 text-gray-800 dark:text-gray-200">Schedule Overview</h3>
                      <div className="overflow-x-auto flex-1">
                        {availabilities.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-gray-400">
                            <CalendarIcon size={48} className="mb-4 opacity-30" />
                            <p>No schedule configured.</p>
                          </div>
                        ) : (
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-gray-100 dark:border-slate-800 text-sm font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                                <th className="pb-4 px-4">Date / Day</th>
                                <th className="pb-4 px-4">Working Hours</th>
                                <th className="pb-4 px-4">Duration</th>
                                <th className="pb-4 px-4">Fee</th>
                                <th className="pb-4 px-4">Status</th>
                                <th className="pb-4 px-4 text-center">Bookings</th>
                                <th className="pb-4 px-4 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="text-sm">
                              {availabilities.map(avail => {
                                const isPast = !avail.dayOfWeek && avail.date && avail.date < new Date().toISOString().split('T')[0];
                                const statusLabel = avail.reason || (avail.isAvailable ? 'Available' : 'Unavailable');
                                const hasBookings = avail.hasBookings || false;
                                
                                return (
                                  <tr key={avail.id} className={`border-b border-gray-50 dark:border-slate-800/50 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors ${isPast ? 'opacity-50 grayscale' : ''}`}>
                                    <td className="py-4 px-4 font-bold text-gray-900 dark:text-gray-100">
                                      {avail.dayOfWeek ? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][avail.dayOfWeek - 1] : avail.date}
                                      {isPast && <span className="ml-2 text-[10px] bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded uppercase">Past</span>}
                                    </td>
                                    <td className="py-4 px-4 text-gray-600 dark:text-gray-300 font-medium">
                                      {avail.startTime} - {avail.endTime}
                                    </td>
                                    <td className="py-4 px-4 text-gray-600 dark:text-gray-300">
                                      {avail.duration ? `${avail.duration} mins` : '-'}
                                    </td>
                                    <td className="py-4 px-4 text-gray-600 dark:text-gray-300 font-semibold">
                                      ₹{profile.consultationFee || '0'}
                                    </td>
                                    <td className="py-4 px-4">
                                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider ${avail.isAvailable ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20' : 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/20'}`}>
                                        {statusLabel}
                                      </span>
                                    </td>
                                    <td className="py-4 px-4 text-center">
                                      <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${hasBookings ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'}`}>
                                        {avail.bookedAppointmentsCount || 0}
                                      </span>
                                    </td>
                                    <td className="py-4 px-4 text-right">
                                      <div className="flex justify-end items-center gap-1.5">
                                        {!isPast && (
                                          <>
                                            <button 
                                              title={hasBookings ? 'Appointments already exist for this schedule.' : 'Edit Working Hours'}
                                              disabled={hasBookings}
                                              onClick={() => {
                                                setAvailabilityForm({
                                                  id: avail.id,
                                                  dayOfWeek: avail.dayOfWeek ? avail.dayOfWeek.toString() : '',
                                                  date: avail.date || '',
                                                  startTime: avail.startTime,
                                                  endTime: avail.endTime,
                                                  duration: avail.duration?.toString() || '30',
                                                  maxAppointments: avail.maxAppointments?.toString() || '1',
                                                  statusType: avail.isAvailable ? 'Available' : 'Break'
                                                });
                                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                              }}
                                              className={`p-1.5 rounded-lg transition-colors ${hasBookings ? 'opacity-30 cursor-not-allowed text-gray-400' : 'text-blue-500 hover:bg-blue-50'}`}
                                            >
                                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                                            </button>
                                            
                                            <button 
                                              title={hasBookings ? 'Appointments already exist for this schedule.' : 'Delete'}
                                              disabled={hasBookings}
                                              onClick={async () => {
                                                if (window.confirm('Delete this schedule?')) {
                                                  try {
                                                    await api.delete(`availability/${avail.id}`);
                                                    showToast('Schedule deleted successfully', 'success');
                                                    loadAvailabilities();
                                                    const startStr = format(startOfMonth(new Date()), 'yyyy-MM-dd');
                                                    const endStr = format(endOfMonth(new Date()), 'yyyy-MM-dd');
                                                    fetchCalendarEvents(startStr, endStr);
                                                  } catch(err) {
                                                    showToast(err.response?.data?.message || 'Failed to delete', 'error');
                                                  }
                                                }
                                              }}
                                              className={`p-1.5 rounded-lg transition-colors ${hasBookings ? 'opacity-30 cursor-not-allowed text-gray-400' : 'text-red-500 hover:bg-red-50'}`}
                                            >
                                              <Trash2 size={16} />
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-10 pt-10 border-t border-gray-100 dark:border-slate-700/50">
                    <SmartCalendar 
                      eventsData={calendarEvents}
                      onDateRangeChange={fetchCalendarEvents}
                      isLawyer={true}
                      onEventClick={handleCalendarClick}
                      onAvailabilityChange={loadAvailabilities}
                      lawyerId={user?.id}
                    />
                  </div>
                </div>
              )}

              {/* VERIFICATION TAB */}
              {activeTab === 'verification' && (
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2.5rem] p-8 md:p-10 shadow-2xl border border-white/40 dark:border-slate-700/50">
                  <div className="flex items-center gap-4 mb-10">
                    <div className="p-3 bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-orange-500/30 text-white rounded-2xl">
                      <ShieldCheck size={28} />
                    </div>
                    <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Verification & Account Status</h2>
                  </div>
                  
                  {/* Verification Banners */}
                  {profile.verificationStatus && profile.verificationStatus !== 'APPROVED' && (
                    <div className={`p-6 mb-10 rounded-[2rem] border-2 ${profile.verificationStatus === 'PENDING' ? 'bg-amber-50/80 dark:bg-amber-900/10 border-amber-200 dark:border-amber-500/30' : profile.verificationStatus === 'REJECTED' ? 'bg-red-50/80 dark:bg-red-900/10 border-red-200 dark:border-red-500/30' : 'bg-gray-50/80 dark:bg-slate-800/50 border-gray-200 dark:border-slate-700'} flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm`}>
                      <div className="flex items-start gap-5">
                        <div className={`p-3 rounded-2xl ${profile.verificationStatus === 'PENDING' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' : profile.verificationStatus === 'REJECTED' ? 'bg-red-100 dark:bg-red-900/30 text-red-600' : 'bg-gray-200 dark:bg-slate-700 text-gray-600'}`}>
                          <AlertCircle size={32} strokeWidth={2.5} />
                        </div>
                        <div>
                          <h3 className={`font-extrabold text-xl mb-1 ${profile.verificationStatus === 'PENDING' ? 'text-amber-900 dark:text-amber-400' : profile.verificationStatus === 'REJECTED' ? 'text-red-900 dark:text-red-400' : 'text-gray-900 dark:text-gray-300'}`}>
                            {profile.verificationStatus === 'PENDING' && 'Your account is under verification.'}
                            {profile.verificationStatus === 'REJECTED' && 'Your account has been rejected.'}
                            {profile.verificationStatus === 'SUSPENDED' && 'Your account has been suspended by the administrator.'}
                          </h3>
                          <p className={`text-sm font-medium ${profile.verificationStatus === 'PENDING' ? 'text-amber-700/80 dark:text-amber-500/80' : profile.verificationStatus === 'REJECTED' ? 'text-red-700/80 dark:text-red-500/80' : 'text-gray-600 dark:text-gray-400'}`}>
                            {profile.verificationStatus === 'PENDING' && 'Clients cannot book appointments until your profile is approved.'}
                            {profile.verificationStatus === 'REJECTED' && 'Please address the remarks below, update your certificate/profile, and resubmit.'}
                            {profile.verificationStatus === 'SUSPENDED' && 'Please contact support for more details.'}
                          </p>
                          {profile.adminRemarks && (
                            <div className={`mt-4 p-4 rounded-xl border ${profile.verificationStatus === 'REJECTED' ? 'bg-red-100/50 dark:bg-red-900/20 border-red-200 dark:border-red-900/50' : 'bg-white/50 dark:bg-slate-800/50 border-current/10'}`}>
                              <p className="text-sm font-medium"><strong className="font-extrabold uppercase tracking-wider text-[11px] block mb-1 opacity-70">Admin Remarks</strong> {profile.adminRemarks}</p>
                            </div>
                          )}
                        </div>
                      </div>
                      {profile.verificationStatus === 'REJECTED' && (
                        <button 
                          onClick={handleResubmitVerification}
                          disabled={loading}
                          className="px-6 py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-600/30 transition-all active:scale-95 shrink-0 disabled:opacity-50 flex items-center gap-2 text-sm"
                        >
                          {loading ? 'Processing...' : (
                            <>
                              <Upload size={18} strokeWidth={2.5} /> Resubmit Profile
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}
                  
                  {profile.verificationStatus === 'APPROVED' && (
                    <div className="p-6 mb-10 rounded-[2rem] border-2 bg-emerald-50/80 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-500/30 flex items-start gap-5 shadow-sm">
                      <div className="p-3 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 shrink-0">
                        <CheckCircle2 size={32} strokeWidth={2.5} />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-xl text-emerald-900 dark:text-emerald-400 mb-1">Your account has been verified successfully.</h3>
                        <p className="text-sm font-medium text-emerald-700/80 dark:text-emerald-500/80">You are now visible to clients and can accept consultation bookings seamlessly.</p>
                        {profile.adminRemarks && (
                          <div className="mt-4 p-4 rounded-xl border bg-white/50 dark:bg-slate-800/50 border-emerald-200/50 dark:border-emerald-900/50">
                            <p className="text-sm font-medium"><strong className="font-extrabold uppercase tracking-wider text-[11px] block mb-1 opacity-70">Remarks</strong> {profile.adminRemarks}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Verification Info & Certificate Card */}
                  <div className="bg-gray-50/50 dark:bg-slate-800/30 p-8 rounded-[2.5rem] border border-gray-100 dark:border-slate-700/50">
                    <h3 className="font-extrabold text-xl mb-6 flex items-center gap-3 text-gray-900 dark:text-white">
                      <ShieldCheck className="text-primary-500" size={24} /> Official Verification Details
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-gray-200 dark:border-slate-700 pb-4">
                          <span className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</span>
                          <span className={`text-sm font-black px-3 py-1 rounded-lg ${profile.verificationStatus === 'APPROVED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : profile.verificationStatus === 'REJECTED' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                            {profile.verificationStatus}
                          </span>
                        </div>
                        <div className="flex justify-between items-center border-b border-gray-200 dark:border-slate-700 pb-4">
                          <span className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Submitted On</span>
                          <span className="text-sm font-bold dark:text-gray-200">{profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}</span>
                        </div>
                        {profile.approvedAt && (
                          <div className="flex justify-between items-center border-b border-gray-200 dark:border-slate-700 pb-4">
                            <span className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Approved On</span>
                            <span className="text-sm font-bold text-emerald-600">{new Date(profile.approvedAt).toLocaleDateString()}</span>
                          </div>
                        )}
                        {profile.rejectedAt && (
                          <div className="flex justify-between items-center border-b border-gray-200 dark:border-slate-700 pb-4">
                            <span className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Rejected On</span>
                            <span className="text-sm font-bold text-red-600">{new Date(profile.rejectedAt).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border-2 border-dashed border-gray-200 dark:border-slate-700 shadow-sm flex flex-col items-center justify-center text-center">
                        <h4 className="text-sm font-bold mb-4 uppercase tracking-wider text-gray-500 dark:text-gray-400">Advocate Certificate</h4>
                        <div className="w-full flex flex-col items-center justify-center gap-4">
                          {profile.advocateCertificateUrl ? (
                            <>
                              <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500 flex items-center justify-center mb-2">
                                <ShieldCheck size={32} />
                              </div>
                              <div>
                                <p className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">Certificate Uploaded</p>
                                <a href={profile.advocateCertificateUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-primary-600 hover:text-primary-700 underline mt-2 inline-block">
                                  View Document
                                </a>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-slate-800 text-gray-400 flex items-center justify-center mb-2">
                                <Upload size={32} />
                              </div>
                              <p className="text-base font-bold text-gray-500">No certificate uploaded</p>
                            </>
                          )}
                          
                          <label className="mt-4 w-full cursor-pointer group">
                            <span className="block w-full py-3 px-4 rounded-xl bg-gray-50 dark:bg-slate-800 text-sm font-bold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-700 group-hover:bg-primary-50 group-hover:text-primary-600 group-hover:border-primary-200 dark:group-hover:bg-primary-900/20 dark:group-hover:text-primary-400 transition-colors">
                              {profile.advocateCertificateUrl ? 'Replace Certificate' : 'Upload PDF/JPG'}
                            </span>
                            <input type="file" accept=".pdf,image/jpeg,image/png,image/jpg" className="hidden" onChange={handleCertificateUpload} disabled={loading} />
                          </label>
                          <p className="text-[11px] font-medium text-gray-400 mt-1 uppercase tracking-widest">Max size 5MB</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* PRACTICE PROFILE TAB */}
              {activeTab === 'profile' && (
                <ErrorBoundary>
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2.5rem] p-8 md:p-10 shadow-2xl border border-white/40 dark:border-slate-700/50">
                  <div className="flex items-center gap-4 mb-10">
                    <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30 text-white rounded-2xl">
                      <Briefcase size={28} />
                    </div>
                    <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Manage Professional Details</h2>
                  </div>
                  
                  {/* Profile Picture Upload Section */}
                  <div className="mb-10 flex flex-col sm:flex-row items-center gap-8 bg-gray-50/50 dark:bg-slate-800/30 p-8 rounded-[2rem] border border-gray-100 dark:border-slate-700/50">
                    <div className="relative group">
                      <div className="w-36 h-36 md:w-44 md:h-44 mx-auto rounded-full border-[6px] border-white dark:border-slate-800 shadow-2xl overflow-hidden mb-2 relative bg-gradient-to-br from-indigo-500 to-primary-600 flex items-center justify-center">
                        <span className="text-6xl font-black text-white shadow-sm">{user?.firstName?.charAt(0) || 'L'}</span>
                        {profile?.profileImageUrl && (
                          <img 
                            src={profile.profileImageUrl} 
                            alt="Profile" 
                            className="absolute inset-0 w-full h-full object-cover" 
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        )}
                        
                        {/* Hover Overlay */}
                        <label className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-pointer backdrop-blur-sm">
                          {uploadingImage ? (
                            <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <>
                              <Camera size={28} strokeWidth={2.5} className="mb-2" />
                              <span className="text-sm font-bold tracking-wider uppercase">Change Photo</span>
                            </>
                          )}
                          <input 
                            type="file" 
                            accept="image/jpeg, image/png, image/jpg" 
                            className="hidden" 
                            onChange={handlePhotoUpload}
                            disabled={uploadingImage}
                          />
                        </label>
                      </div>
                      
                      {/* Gradient Ring on hover */}
                      <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-primary-400 to-indigo-600 opacity-0 group-hover:opacity-100 blur-lg transition duration-500 -z-10"></div>
                    </div>
                    
                    <div className="flex-1 text-center sm:text-left">
                      <h3 className="font-extrabold text-2xl mb-2 text-gray-900 dark:text-white">Professional Headshot</h3>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto sm:mx-0 leading-relaxed">
                        Upload a high-quality professional portrait to build trust with clients. Recommended size: 400x400px (JPG/PNG, up to 5MB).
                      </p>
                      <div className="flex flex-wrap justify-center sm:justify-start gap-3">
                        <label className="flex items-center gap-2 bg-gradient-to-r from-primary-500 to-indigo-600 hover:from-primary-600 hover:to-indigo-700 text-white px-6 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer shadow-lg shadow-primary-500/30 hover:shadow-xl hover:-translate-y-0.5 active:scale-95">
                          <Upload size={18} strokeWidth={2.5} />
                          {uploadingImage ? 'Uploading...' : 'Upload New Photo'}
                          <input 
                            type="file" 
                            accept="image/jpeg, image/png, image/jpg" 
                            className="hidden" 
                            onChange={handlePhotoUpload}
                            disabled={uploadingImage}
                          />
                        </label>
                        {profile.profileImageUrl && (
                          <button 
                            type="button"
                            onClick={handleDeletePhoto}
                            className="flex items-center gap-2 bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 px-6 py-3 rounded-xl text-sm font-bold transition-all border border-gray-200 dark:border-slate-700 hover:border-red-200 dark:hover:border-red-500/30 shadow-sm active:scale-95"
                          >
                            <Trash2 size={18} strokeWidth={2.5} /> Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleProfileSubmit} className="space-y-8">
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Lawyer Specialization</label>
                        <select
                          value={profile.specializationCategoryId}
                          onChange={(e) => setProfile({ ...profile, specializationCategoryId: e.target.value })}
                          required
                          className="w-full px-4 py-3.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500/50 outline-none font-bold text-gray-900 dark:text-white shadow-inner transition-all appearance-none cursor-pointer"
                        >
                          <option value="">Select Specialization</option>
                          {categories.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Experience (Years)</label>
                        <input
                          type="number"
                          value={profile.experienceYears}
                          onChange={(e) => setProfile({ ...profile, experienceYears: e.target.value })}
                          required
                          className="w-full px-4 py-3.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500/50 outline-none font-bold text-gray-900 dark:text-white shadow-inner transition-all"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Bar Council Registration Number</label>
                        <input
                          type="text"
                          value={profile.barCouncilNumber}
                          onChange={(e) => setProfile({ ...profile, barCouncilNumber: e.target.value })}
                          required
                          className="w-full px-4 py-3.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500/50 outline-none font-bold text-gray-900 dark:text-white shadow-inner transition-all uppercase"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Consultation Fee (INR)</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₹</span>
                          <input
                            type="number"
                            value={profile.consultationFee}
                            onChange={(e) => setProfile({ ...profile, consultationFee: e.target.value })}
                            required
                            className="w-full pl-10 pr-4 py-3.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500/50 outline-none font-bold text-gray-900 dark:text-white shadow-inner transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">City</label>
                        <input
                          type="text"
                          value={profile.city}
                          onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                          required
                          className="w-full px-4 py-3.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500/50 outline-none font-bold text-gray-900 dark:text-white shadow-inner transition-all capitalize"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">State</label>
                        <input
                          type="text"
                          value={profile.state}
                          onChange={(e) => setProfile({ ...profile, state: e.target.value })}
                          required
                          className="w-full px-4 py-3.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500/50 outline-none font-bold text-gray-900 dark:text-white shadow-inner transition-all capitalize"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Languages</label>
                        <input
                          type="text"
                          value={profile.languages}
                          onChange={(e) => setProfile({ ...profile, languages: e.target.value })}
                          placeholder="English, Hindi, Telugu"
                          className="w-full px-4 py-3.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500/50 outline-none font-bold text-gray-900 dark:text-white shadow-inner transition-all"
                        />
                        <p className="text-[11px] text-gray-500 font-medium tracking-wide uppercase mt-1">Comma separated</p>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Highest Qualification</label>
                        <input
                          type="text"
                          value={profile.qualification}
                          onChange={(e) => setProfile({ ...profile, qualification: e.target.value })}
                          placeholder="B.A. LL.B (Hons)"
                          className="w-full px-4 py-3.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500/50 outline-none font-bold text-gray-900 dark:text-white shadow-inner transition-all uppercase"
                        />
                      </div>
                    </div>

                    <div className="space-y-2 max-w-sm">
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Current Availability Status</label>
                      <select
                        value={profile.availabilityStatus}
                        onChange={(e) => setProfile({ ...profile, availabilityStatus: e.target.value })}
                        className="w-full px-4 py-3.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500/50 outline-none font-bold text-gray-900 dark:text-white shadow-inner transition-all appearance-none cursor-pointer"
                      >
                        <option value="AVAILABLE">🟢 Available for Bookings</option>
                        <option value="BUSY">🔴 Currently Busy</option>
                        <option value="ON_LEAVE">⚪ On Leave / Vacation</option>
                      </select>
                    </div>

                    <div className="bg-gray-50/50 dark:bg-slate-800/30 p-8 rounded-[2rem] border border-gray-100 dark:border-slate-700/50 mt-10">
                      <h3 className="text-xl font-extrabold mb-6 dark:text-white flex items-center gap-3">
                        <Clock className="text-primary-500" size={24} /> Default Working Schedule
                      </h3>
                      
                      <div className="mb-8">
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">Active Working Days</label>
                        <div className="flex flex-wrap gap-3">
                          {[{val: '1', lbl: 'Monday'}, {val: '2', lbl: 'Tuesday'}, {val: '3', lbl: 'Wednesday'}, {val: '4', lbl: 'Thursday'}, {val: '5', lbl: 'Friday'}, {val: '6', lbl: 'Saturday'}, {val: '7', lbl: 'Sunday'}].map(day => {
                            const isSelected = profile.workingDays?.split(',').includes(day.val);
                            return (
                              <button
                                type="button"
                                key={day.val}
                                onClick={() => handleWorkingDayToggle(day.val)}
                                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all border-2 ${
                                  isSelected 
                                    ? 'bg-primary-50 border-primary-500 text-primary-700 dark:bg-primary-900/40 dark:border-primary-500 dark:text-primary-300 shadow-sm' 
                                    : 'bg-white border-gray-200 text-gray-500 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-400 hover:border-gray-300 dark:hover:border-slate-600'
                                }`}
                              >
                                {day.lbl}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                        <div className="space-y-2">
                          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Shift Start Time</label>
                          <input
                            type="time"
                            value={profile.startWorkingTime}
                            onChange={(e) => setProfile({ ...profile, startWorkingTime: e.target.value })}
                            className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500/50 outline-none font-bold shadow-inner transition-all text-gray-900 dark:text-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Shift End Time</label>
                          <input
                            type="time"
                            value={profile.endWorkingTime}
                            onChange={(e) => setProfile({ ...profile, endWorkingTime: e.target.value })}
                            className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500/50 outline-none font-bold shadow-inner transition-all text-gray-900 dark:text-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Slot Duration</label>
                          <select
                            value={profile.slotDuration}
                            onChange={(e) => setProfile({ ...profile, slotDuration: parseInt(e.target.value) })}
                            className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500/50 outline-none font-bold shadow-inner transition-all appearance-none cursor-pointer text-gray-900 dark:text-white"
                          >
                            <option value={30}>30 Minutes / Session</option>
                            <option value={60}>60 Minutes / Session</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Lunch Break Start</label>
                          <input
                            type="time"
                            value={profile.lunchBreakStart}
                            onChange={(e) => setProfile({ ...profile, lunchBreakStart: e.target.value })}
                            className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500/50 outline-none font-bold shadow-inner transition-all text-gray-900 dark:text-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Lunch Break End</label>
                          <input
                            type="time"
                            value={profile.lunchBreakEnd}
                            onChange={(e) => setProfile({ ...profile, lunchBreakEnd: e.target.value })}
                            className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500/50 outline-none font-bold shadow-inner transition-all text-gray-900 dark:text-white"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Biography / About Me</label>
                      <textarea
                        rows={6}
                        value={profile.bio}
                        onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                        placeholder="Describe your legal experience, notable case track records, and your approach to helping clients..."
                        className="w-full px-5 py-4 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-[1.5rem] focus:ring-2 focus:ring-primary-500/50 outline-none font-medium shadow-inner transition-all text-gray-900 dark:text-white resize-none leading-relaxed"
                      />
                    </div>

                    <div className="flex justify-end pt-4">
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center gap-3 bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 text-white px-10 py-4 rounded-2xl text-base font-extrabold transition-all shadow-xl shadow-primary-500/30 hover:shadow-2xl hover:shadow-primary-500/40 hover:-translate-y-1 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 w-full sm:w-auto justify-center"
                      >
                        <Save size={20} strokeWidth={2.5} /> {loading ? 'Saving Changes...' : 'Save Profile Details'}
                      </button>
                    </div>
                    </form>
                  </div>
                </ErrorBoundary>
              )}

              {/* EARNINGS TAB */}
              {activeTab === 'earnings' && (
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2.5rem] p-8 md:p-10 shadow-2xl border border-white/40 dark:border-slate-700/50 space-y-8">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/30 text-white rounded-2xl">
                      <DollarSign size={28} />
                    </div>
                    <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Financial Overview</h2>
                  </div>

                  {/* Earnings Metrics Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/10 rounded-[2rem] p-8 border border-green-200 dark:border-green-500/20 shadow-sm relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500 text-green-600">
                        <DollarSign size={80} strokeWidth={3} />
                      </div>
                      <p className="text-sm font-extrabold text-green-700 dark:text-green-400 uppercase tracking-wider mb-2">Gross Revenue</p>
                      <p className="text-4xl font-black text-gray-900 dark:text-white mt-1">₹{earningsData.totalAmount}</p>
                    </div>
                    
                    <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-900/10 rounded-[2rem] p-8 border border-indigo-200 dark:border-indigo-500/20 shadow-sm relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500 text-indigo-600">
                        <CheckCircle2 size={80} strokeWidth={3} />
                      </div>
                      <p className="text-sm font-extrabold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider mb-2">Net Earnings</p>
                      <p className="text-4xl font-black text-gray-900 dark:text-white mt-1">₹{earningsData.netAmount}</p>
                    </div>
                    
                    <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-900/10 rounded-[2rem] p-8 border border-amber-200 dark:border-amber-500/20 shadow-sm relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500 text-amber-600">
                        <TrendingDown size={80} strokeWidth={3} />
                      </div>
                      <p className="text-sm font-extrabold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-2">Platform Fees (10%)</p>
                      <p className="text-4xl font-black text-gray-900 dark:text-white mt-1">₹{earningsData.platformFees}</p>
                    </div>
                  </div>

                  {/* Earnings list */}
                  <div className="bg-gray-50/50 dark:bg-slate-800/30 rounded-[2rem] p-8 border border-gray-100 dark:border-slate-700/50 mt-8">
                    <h3 className="text-xl font-extrabold mb-6 flex items-center gap-3 dark:text-white">
                      <FileText className="text-primary-500" size={24} /> Payment History Logs
                    </h3>
                    <div className="space-y-4">
                      {earningsData.earnings.length === 0 ? (
                        <div className="text-center py-12 flex flex-col items-center justify-center">
                          <div className="w-20 h-20 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                            <DollarSign size={32} className="text-gray-400" />
                          </div>
                          <p className="font-bold text-gray-500">No earnings recorded yet.</p>
                        </div>
                      ) : (
                        earningsData.earnings.map(earn => (
                          <div key={earn.id} className="p-5 rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex justify-between items-center shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-xl flex items-center justify-center">
                                <DollarSign size={20} strokeWidth={3} />
                              </div>
                              <div>
                                <p className="font-extrabold text-gray-900 dark:text-white text-base">Consultation Payment</p>
                                <p className="text-sm font-medium text-gray-500">{new Date(earn.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-black text-emerald-600 dark:text-emerald-400 text-lg">+₹{earn.netAmount}</p>
                              <p className="text-xs font-bold text-gray-400 tracking-wider">GROSS: ₹{earn.amount}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* CLIENTS TAB */}
              {activeTab === 'clients' && (
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2.5rem] p-8 md:p-10 shadow-2xl border border-white/40 dark:border-slate-700/50">
                  <div className="flex items-center gap-4 mb-10">
                    <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg shadow-purple-500/30 text-white rounded-2xl">
                      <Users size={28} />
                    </div>
                    <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">My Client History</h2>
                  </div>
                  
                  <div className="space-y-6">
                    {appointments.filter(a => a.status === 'COMPLETED').length === 0 ? (
                      <div className="text-center py-20 flex flex-col items-center justify-center bg-gray-50/50 dark:bg-slate-800/30 rounded-[2rem] border-2 border-dashed border-gray-200 dark:border-slate-700">
                        <div className="w-24 h-24 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                          <Users size={40} className="text-gray-400" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">No completed consultations</h3>
                        <p className="text-gray-500 dark:text-gray-400">Your client history will appear here once you complete sessions.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-6">
                        {appointments.filter(a => a.status === 'COMPLETED').map(app => (
                          <div key={app.id} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-lg transition-all flex flex-col gap-6 group">
                            <div className="flex flex-wrap items-start justify-between gap-4">
                              <div className="flex items-center gap-5">
                                <div className="w-16 h-16 bg-gradient-to-tr from-indigo-400 to-primary-600 text-white rounded-[1.25rem] flex items-center justify-center font-black text-2xl shadow-lg shadow-primary-500/20 group-hover:scale-105 transition-transform">
                                  {app.userName ? app.userName.charAt(0) : 'C'}
                                </div>
                                <div>
                                  <h3 className="font-black text-xl text-gray-900 dark:text-gray-100 flex items-center gap-3">
                                    {app.userName || `Client #${app.userId}`}
                                    <span className="text-[10px] font-extrabold px-2.5 py-1 bg-gray-100 dark:bg-slate-800 text-gray-500 rounded-lg uppercase tracking-wider">
                                      ID: #{app.id}
                                    </span>
                                  </h3>
                                  <div className="flex items-center gap-3 mt-1.5">
                                    {app.userEmail && <span className="text-sm font-medium text-gray-500">{app.userEmail}</span>}
                                    {app.userEmail && app.userPhone && <span className="text-gray-300 dark:text-slate-700">•</span>}
                                    {app.userPhone && <span className="text-sm font-medium text-gray-500">{app.userPhone}</span>}
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <div className="flex flex-wrap justify-end items-center gap-2">
                                  <span className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-xs rounded-xl font-bold tracking-wider uppercase border border-blue-200 dark:border-blue-500/20">{app.status}</span>
                                  <span className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-xs rounded-xl font-bold tracking-wider uppercase flex items-center gap-1.5 border border-emerald-200 dark:border-emerald-500/20"><DollarSign size={12} strokeWidth={3} /> {app.paymentStatus || 'SUCCESS'}</span>
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50/80 dark:bg-slate-800/50 p-5 rounded-2xl text-sm border border-gray-100 dark:border-slate-700/50">
                              <div>
                                <p className="text-[11px] text-gray-500 mb-1.5 font-bold uppercase tracking-wider">Date &amp; Time</p>
                                <p className="font-extrabold text-gray-900 dark:text-gray-100 flex items-center gap-2"><Clock size={16} className="text-primary-500" />{new Date(app.appointmentDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
                              </div>
                              <div>
                                <p className="text-[11px] text-gray-500 mb-1.5 font-bold uppercase tracking-wider">Case Type</p>
                                <p className="font-extrabold text-gray-900 dark:text-gray-100 flex items-center gap-2"><Briefcase size={16} className="text-primary-500" />{app.specializationCategory || 'General'}</p>
                              </div>
                              <div>
                                <p className="text-[11px] text-gray-500 mb-1.5 font-bold uppercase tracking-wider">Consultation Fee</p>
                                <p className="font-extrabold text-gray-900 dark:text-gray-100 flex items-center gap-2"><DollarSign size={16} className="text-emerald-500" />₹{app.consultationFee || '0'}</p>
                              </div>
                              <div>
                                <p className="text-[11px] text-gray-500 mb-1.5 font-bold uppercase tracking-wider">Client Rating</p>
                                {app.clientRating ? (
                                  <div className="flex items-center gap-2 font-extrabold text-gray-900 dark:text-gray-100 bg-yellow-50 dark:bg-yellow-900/20 px-3 py-1 rounded-lg w-max border border-yellow-200 dark:border-yellow-500/20">
                                    <Star size={14} className="text-yellow-500 fill-current" />
                                    <span className="text-yellow-700 dark:text-yellow-400">{app.clientRating}/5</span>
                                  </div>
                                ) : (
                                  <p className="text-gray-400 font-medium text-sm mt-1">Pending review</p>
                                )}
                              </div>
                            </div>

                            <div className="flex justify-end pt-2">
                              <button
                                onClick={() => startChat(app.userId, app.userName)}
                                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-50 to-blue-50 hover:from-indigo-100 hover:to-blue-100 dark:from-indigo-900/20 dark:to-blue-900/20 text-indigo-700 dark:text-indigo-400 font-bold text-sm rounded-xl transition-all shadow-sm hover:shadow-md border border-indigo-100 dark:border-indigo-500/20"
                              >
                                <MessageSquare size={16} strokeWidth={2.5} /> Message Client
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* REVIEWS TAB */}
              {activeTab === 'reviews' && (
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2.5rem] p-8 md:p-10 shadow-2xl border border-white/40 dark:border-slate-700/50">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-gradient-to-br from-yellow-400 to-amber-500 shadow-lg shadow-amber-500/30 text-white rounded-2xl">
                        <Star size={28} className="fill-white" />
                      </div>
                      <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Client Ratings</h2>
                    </div>
                    <div className="flex items-center gap-3 px-6 py-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl border border-yellow-200 dark:border-yellow-500/30 shadow-inner">
                      <Star className="text-yellow-500 fill-current" size={24} />
                      <span className="font-black text-2xl text-yellow-700 dark:text-yellow-500">{profile.averageRating}</span>
                      <span className="text-yellow-600/70 dark:text-yellow-500/70 font-bold tracking-wide uppercase text-sm">({profile.totalReviews} reviews)</span>
                    </div>
                  </div>
                  
                  <div className="space-y-5">
                    {reviews.length === 0 ? (
                      <div className="text-center py-20 flex flex-col items-center justify-center bg-gray-50/50 dark:bg-slate-800/30 rounded-[2rem] border-2 border-dashed border-gray-200 dark:border-slate-700">
                        <div className="w-24 h-24 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                          <Star size={40} className="text-gray-400" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">No reviews yet</h3>
                        <p className="text-gray-500 dark:text-gray-400">Reviews will appear here after clients complete consultations and rate you.</p>
                      </div>
                    ) : (
                      reviews.map((review) => (
                        <div key={review.id} className="p-6 rounded-[2rem] border border-gray-100 dark:border-slate-700/50 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow group">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-primary-50 dark:bg-primary-900/20 text-primary-600 rounded-full flex items-center justify-center font-bold text-lg">
                                {(review.clientName || 'A').charAt(0)}
                              </div>
                              <div>
                                <p className="font-extrabold text-lg text-gray-900 dark:text-white">{review.clientName || 'Anonymous Client'}</p>
                                <p className="text-sm font-medium text-gray-500">{review.createdAt ? new Date(review.createdAt).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' }) : ''}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 bg-gray-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-gray-100 dark:border-slate-700">
                              {[1,2,3,4,5].map(s => (
                                <Star key={s} size={16} className={s <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 dark:text-gray-600'} />
                              ))}
                            </div>
                          </div>
                          {review.reviewText && (
                            <p className="text-base text-gray-700 dark:text-gray-300 bg-gray-50/80 dark:bg-slate-800/50 p-5 rounded-2xl font-medium leading-relaxed border border-gray-100 dark:border-slate-700">"{review.reviewText}"</p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* MESSAGES TAB */}
              {activeTab === 'messages' && (
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2.5rem] p-8 md:p-10 shadow-2xl border border-white/40 dark:border-slate-700/50 min-h-[600px]">
                  <div className="flex items-center gap-4 mb-10">
                    <div className="p-3 bg-gradient-to-br from-blue-400 to-indigo-600 shadow-lg shadow-blue-500/30 text-white rounded-2xl relative">
                      <MessageSquare size={28} />
                      <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></div>
                    </div>
                    <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Active Conversations</h2>
                  </div>
                  
                  <div className="space-y-4">
                    {conversations.length === 0 ? (
                      <div className="text-center py-24 flex flex-col items-center justify-center bg-gray-50/50 dark:bg-slate-800/30 rounded-[2.5rem] border-2 border-dashed border-gray-200 dark:border-slate-700">
                        <div className="w-24 h-24 bg-primary-50 dark:bg-primary-900/20 rounded-full flex items-center justify-center mb-6">
                          <MessageSquare size={40} className="text-primary-400 dark:text-primary-600" />
                        </div>
                        <h3 className="text-xl font-extrabold text-gray-800 dark:text-gray-100 mb-2">No Active Conversations</h3>
                        <p className="text-gray-500 dark:text-gray-400 max-w-md font-medium">
                          Secure chat channels will appear here automatically once a booked consultation is PAID.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {conversations.map(conv => (
                          <div 
                            key={conv.id} 
                            onClick={() => startChat(conv.targetUserId, conv.targetUserName, conv.targetUserProfileImage)}
                            className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-xl hover:border-primary-200 dark:hover:border-primary-900/50 flex flex-col cursor-pointer group transition-all"
                          >
                            <div className="flex items-start justify-between mb-5">
                              <div className="relative">
                                <div className="w-16 h-16 rounded-[1.25rem] bg-gradient-to-tr from-primary-400 to-brand-purple text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-primary-500/20 group-hover:scale-105 transition-transform overflow-hidden">
                                  {conv.targetUserProfileImage ? (
                                    <img src={conv.targetUserProfileImage} alt={conv.targetUserName} className="w-full h-full object-cover" />
                                  ) : (
                                    conv.targetUserName ? conv.targetUserName.charAt(0) : '?'
                                  )}
                                </div>
                                {conv.unreadCount > 0 && (
                                  <span className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 border-[3px] border-white dark:border-slate-900 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg animate-pulse-soft">
                                    {conv.unreadCount}
                                  </span>
                                )}
                                <span className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 border-[3px] border-white dark:border-slate-900 rounded-full shadow-sm"></span>
                              </div>
                              {conv.lastMessageTime && (
                                <span className="text-xs font-bold text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-gray-100 dark:border-slate-700">
                                  {new Date(conv.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                            </div>
                            
                            <div className="flex-1">
                              <h3 className={`text-xl font-extrabold mb-1.5 ${conv.unreadCount > 0 ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-200'}`}>
                                {conv.targetUserName}
                              </h3>
                              <p className={`text-sm line-clamp-2 leading-relaxed ${conv.unreadCount > 0 ? 'font-bold text-primary-600 dark:text-primary-400' : 'font-medium text-gray-500 dark:text-gray-400'}`}>
                                {conv.lastMessage || 'Tap to view conversation'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}            </motion.div>
          </AnimatePresence>
        </div>

      </div>

      {/* Chat Modal */}
      <AnimatePresence>
        {chatTarget && chatSession && (
          <div 
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => { setChatTarget(null); setChatSession(null); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-3xl bg-white dark:bg-gray-900 rounded-[2rem] shadow-2xl relative overflow-hidden"
            >
              <RealTimeChat 
                selectedLawyerId={chatTarget.targetUserId} 
                sessionId={chatSession.id} 
                targetUserName={chatTarget.targetName}
                targetUserProfileImage={chatTarget.targetUserProfileImage}
                onClose={() => { setChatTarget(null); setChatSession(null); }} 
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Calendar Context Modal */}
      <AnimatePresence>
        {calendarModal.show && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
              onClick={() => setCalendarModal({ show: false, date: null, status: null, existingRuleId: null })}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700"
            >
              <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Manage Availability</h3>
                  <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                    {format(new Date(calendarModal.date), 'dd MMMM yyyy')}
                  </p>
                </div>
                <button 
                  onClick={() => setCalendarModal({ show: false, date: null, status: null, existingRuleId: null })}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-3">
                {!calendarModal.existingRuleId ? (
                  // NO SCHEDULE EXISTS
                  <>
                    <button
                      onClick={() => {
                        setAvailabilityForm({
                          id: null,
                          dayOfWeek: '',
                          date: calendarModal.date,
                          startTime: '09:00',
                          endTime: '17:00',
                          duration: '30',
                          maxAppointments: '1',
                          statusType: 'Available'
                        });
                        setCalendarModal({ show: false, date: null, status: null, existingRuleId: null });
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="w-full flex items-center justify-between p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50 dark:bg-indigo-900/10 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/20 transition-all font-bold group"
                    >
                      <span className="flex items-center gap-3">
                        <Plus size={16} /> Add Working Schedule
                      </span>
                      <ChevronRight size={18} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                    <button
                      onClick={() => handleMarkStatus('HOLIDAY')}
                      className="w-full flex items-center justify-between p-4 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20 transition-all font-bold group"
                    >
                      <span className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div> Mark Holiday
                      </span>
                      <ChevronRight size={18} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                    <button
                      onClick={() => handleMarkStatus('UNAVAILABLE')}
                      className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-all font-bold group"
                    >
                      <span className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-gray-500"></div> Mark Unavailable
                      </span>
                      <ChevronRight size={18} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  </>
                ) : (
                  // SCHEDULE EXISTS
                  <>
                    <button
                      onClick={() => {
                        const avail = availabilities.find(a => a.id === calendarModal.existingRuleId);
                        if (avail) {
                          setAvailabilityForm({
                            id: avail.id,
                            dayOfWeek: avail.dayOfWeek ? avail.dayOfWeek.toString() : '',
                            date: avail.date || '',
                            startTime: avail.startTime,
                            endTime: avail.endTime,
                            duration: avail.duration?.toString() || '30',
                            maxAppointments: avail.maxAppointments?.toString() || '1',
                            statusType: 'Available'
                          });
                        }
                        setCalendarModal({ show: false, date: null, status: null, existingRuleId: null });
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="w-full flex items-center justify-between p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50 dark:bg-indigo-900/10 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/20 transition-all font-bold group"
                    >
                      <span className="flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg> Edit Schedule
                      </span>
                      <ChevronRight size={18} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>

                    <button
                      onClick={async () => {
                        try {
                          await api.delete(`availability/${calendarModal.existingRuleId}`);
                          showToast('Schedule deleted successfully', 'success');
                          setCalendarModal({ show: false, date: null, status: null, existingRuleId: null });
                          loadAvailabilities();
                          const startStr = format(startOfMonth(new Date(calendarModal.date)), 'yyyy-MM-dd');
                          const endStr = format(endOfMonth(new Date(calendarModal.date)), 'yyyy-MM-dd');
                          fetchCalendarEvents(startStr, endStr);
                        } catch (err) {
                          showToast(err.response?.data?.message || 'Failed to delete', 'error');
                        }
                      }}
                      className="w-full flex items-center justify-between p-4 rounded-xl border border-red-200/50 dark:border-red-900/30 bg-white dark:bg-gray-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all font-bold group"
                    >
                      <span className="flex items-center gap-3">
                        <Trash2 size={16} /> Delete Schedule
                      </span>
                    </button>

                    <button
                      onClick={() => handleMarkStatus('HOLIDAY')}
                      className="w-full flex items-center justify-between p-4 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20 transition-all font-bold group"
                    >
                      <span className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div> Mark Holiday
                      </span>
                    </button>

                    <button
                      onClick={() => handleMarkStatus('UNAVAILABLE')}
                      className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-all font-bold group"
                    >
                      <span className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-gray-500"></div> Mark Unavailable
                      </span>
                    </button>
                    
                    {calendarModal.status !== 'AVAILABLE' && (
                      <button
                        onClick={() => handleMarkStatus('AVAILABLE')}
                        className="w-full flex items-center justify-between p-4 rounded-xl border border-green-200 dark:border-green-900/50 bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/20 transition-all font-bold group"
                      >
                        <span className="flex items-center gap-3">
                          <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div> Mark Available
                        </span>
                      </button>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* TOAST UI */}
      {toast.show && (
        <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-xl shadow-2xl font-bold flex items-center gap-3 animate-fade-in-up z-50 ${
          toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
        }`}>
          {toast.type === 'error' ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          )}
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default LawyerDashboard;
