import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, Calendar, Clock, DollarSign, Users, Star, Briefcase, Plus, X, Upload, CheckCircle2, ChevronRight, Download, Camera, LogOut, Check, Percent, Trash2, Shield, Calendar as CalendarIcon, AlertCircle, MapPin, Save, ShieldCheck
} from 'lucide-react';
import api from '../services/api';
import { logout } from '../redux/authSlice';
import RealTimeChat from '../components/RealTimeChat';
import ErrorBoundary from '../components/ErrorBoundary';
import NotificationBell from '../components/NotificationBell';
import SmartCalendar from '../components/SmartCalendar';

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
    profileCompletion: 0,
    averageRating: 0.00,
    totalReviews: 0,
    profileImageUrl: ''
  });

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
  const [availabilityForm, setAvailabilityForm] = useState({
    dayOfWeek: '',
    date: '',
    startTime: '',
    endTime: '',
    isAvailable: 'true'
  });

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
            specializationCategoryId: res.data.specializationCategory ? res.data.specializationCategory.id : '',
            profileCompletion: res.data.profileCompletion || 0,
            averageRating: res.data.averageRating || 0.00,
            totalReviews: res.data.totalReviews || 0,
            profileImageUrl: res.data.profileImageUrl || ''
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
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-900 via-slate-800 to-primary-950 text-white p-10 md:p-12 shadow-2xl animate-fade-in border border-slate-700">
        <div className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[150%] bg-gradient-to-r from-brand-indigo to-transparent blur-[120px] rounded-full mix-blend-overlay"></div>
        </div>
        
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
          <div className="flex items-center gap-6">
            <div className="relative shrink-0 hidden sm:block w-20 h-20 md:w-24 md:h-24">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-3xl font-bold text-white border-4 border-white/20 shadow-lg">
                {user?.firstName?.charAt(0) || 'L'}
              </div>
              {profile?.profileImageUrl && (
                <img 
                  src={profile.profileImageUrl} 
                  alt="Lawyer Profile" 
                  className="absolute inset-0 w-full h-full rounded-full object-cover border-4 border-white/20 shadow-lg bg-white" 
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              )}
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3">
                Welcome, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-primary-400">Advocate {user?.firstName || ''}</span>
              </h1>
              <p className="text-slate-300 text-lg font-medium opacity-90 max-w-xl">Manage your practice, track earnings, and consult with clients all in one secure platform.</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 items-center bg-white/5 backdrop-blur-xl p-4 rounded-3xl border border-white/10 shadow-inner">
            <div className="flex items-center gap-3 px-3">
              <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Percent size={20} />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">Profile</p>
                <p className="font-bold text-sm text-white">{profile.profileCompletion}%</p>
              </div>
            </div>
            <div className="w-px h-10 bg-white/10 hidden sm:block"></div>
            <div className="flex items-center gap-3 px-3">
              <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-400">
                <Star className="fill-current" size={20} />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">Rating</p>
                <p className="font-bold text-sm text-white">{profile.averageRating} <span className="text-slate-500 text-xs font-normal">({profile.totalReviews})</span></p>
              </div>
            </div>
            <div className="w-px h-10 bg-white/10 hidden sm:block"></div>
            <div className="flex items-center gap-3 px-3">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
                <Clock size={20} />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">Status</p>
                <p className="font-bold text-sm text-green-400">{profile.availabilityStatus}</p>
              </div>
            </div>
            <div className="w-px h-10 bg-white/10 hidden sm:block"></div>
            <NotificationBell lightText={true} />
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors font-semibold ml-2 border border-red-500/30"
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 animate-slide-up">
        {[
          { label: 'Consultations', value: appointments.length, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'Pending', value: appointments.filter(a => a.status === 'PENDING').length, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20' },
          { label: 'Confirmed', value: appointments.filter(a => a.status === 'CONFIRMED' || a.status === 'PAID').length, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
          { label: 'Completed', value: appointments.filter(a => a.status === 'COMPLETED').length, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20' },
          { label: 'Earnings', value: `₹${earningsData.totalAmount}`, color: 'text-brand-indigo dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
          { label: 'Reviews', value: profile.totalReviews, color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
        ].map(stat => (
          <div key={stat.label} className="glass-card rounded-3xl p-5 flex flex-col justify-center items-center text-center border border-gray-100 dark:border-slate-700/50">
             <div className={`text-3xl font-extrabold ${stat.color} mb-1`}>{stat.value}</div>
             <div className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wide">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Navigation Sidebar */}
        <div className="lg:col-span-1 space-y-2">
          {[
            { id: 'appointments', label: 'Consultations', icon: Calendar },
            { id: 'availability', label: 'Availability', icon: CalendarIcon },
            { id: 'profile', label: 'Practice Profile', icon: Briefcase },
            { id: 'earnings', label: 'Earnings Summary', icon: DollarSign },
            { id: 'clients', label: 'My Client History', icon: Users },
            { id: 'reviews', label: 'Reviews & Ratings', icon: Star },
            { id: 'messages', label: 'Messages', icon: MessageSquare, badge: globalUnreadCount },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={18} />
                  <span>{tab.label}</span>
                </div>
                {tab.badge > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full shadow-md animate-fade-in border border-red-600">
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
                <div className="glass-panel rounded-3xl p-6 md:p-8">
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-bold flex items-center gap-3">
                      <div className="p-2 bg-primary-100 dark:bg-primary-900/30 text-primary-600 rounded-xl">
                        <Calendar size={24} />
                      </div>
                      Consultation Bookings
                    </h2>
                    
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                        <select 
                          className="bg-transparent text-sm font-medium outline-none px-2 py-1 text-gray-700 dark:text-gray-300"
                          value={appointmentFilter}
                          onChange={(e) => setAppointmentFilter(e.target.value)}
                        >
                          <option value="All">All</option>
                          <option value="Pending">Pending</option>
                          <option value="Completed">Completed</option>
                        </select>
                      </div>

                      <div className="relative">
                        <input 
                          type="text" 
                          placeholder="Search appointments..." 
                          className="pl-8 pr-3 py-1.5 rounded-lg text-sm bg-gray-100 dark:bg-gray-800 border-none outline-none dark:text-white"
                          value={appointmentSearch}
                          onChange={(e) => setAppointmentSearch(e.target.value)}
                        />
                      </div>

                      <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                        <button
                          onClick={() => setAppointmentView('list')}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${appointmentView === 'list' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                        >
                          List
                        </button>
                        <button
                          onClick={() => setAppointmentView('calendar')}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${appointmentView === 'calendar' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                        >
                          Calendar
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {appointmentView === 'calendar' ? (
                    <SmartCalendar 
                      appointments={appointments} 
                      availabilities={availabilities}
                      isLawyer={true}
                      onAvailabilityChange={loadAvailabilities}
                      onEventClick={(event) => {
                        // Details modal
                        // This will only be called for appointments, since availability events are handled inside SmartCalendar
                        if (event.resource && event.resource.type !== 'AVAILABLE' && event.resource.type !== 'UNAVAILABLE') {
                          // Existing logic if any
                        }
                      }}
                    />
                  ) : (
                    <div className="space-y-6">
                      {(() => {
                        let filtered = appointments;
                        
                        if (appointmentFilter === 'Completed') filtered = filtered.filter(a => a.status === 'COMPLETED');
                        if (appointmentFilter === 'Pending') filtered = filtered.filter(a => a.status === 'PENDING');
                        
                        // Search
                        if (appointmentSearch.trim()) {
                          const q = appointmentSearch.toLowerCase();
                          filtered = filtered.filter(a => 
                            (a.userName && a.userName.toLowerCase().includes(q)) || 
                            (a.notes && a.notes.toLowerCase().includes(q))
                          );
                        }

                        // Sorting
                        filtered = [...filtered].sort((a, b) => {
                          return new Date(b.appointmentDate) - new Date(a.appointmentDate);
                        });

                        if (filtered.length === 0) {
                          return (
                            <div className="text-center py-16 text-gray-500 bg-gray-50/50 dark:bg-slate-800/30 rounded-3xl border border-dashed border-gray-200 dark:border-slate-700">
                              <Calendar size={48} className="mx-auto mb-4 text-gray-300 dark:text-slate-600" />
                              <p className="text-lg">No consultation requests found.</p>
                            </div>
                          );
                        }

                        return (
                          <div className="space-y-6">
                            {filtered.map(app => (
                                    <div key={app.id} className="glass-card p-6 flex flex-col gap-6">
                                      <div className="flex flex-wrap gap-4 justify-between items-start">
                                        <div className="flex items-center gap-4">
                                          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-400 to-brand-purple flex items-center justify-center text-white font-bold text-2xl shadow-md">
                                            {app.userName ? app.userName.charAt(0) : 'U'}
                                          </div>
                                          <div>
                                            <div className="flex items-center gap-3 mb-1">
                                              <h3 className="font-extrabold text-xl text-gray-900 dark:text-white">{app.userName || `Client #${app.userId}`}</h3>
                                            </div>
                                            <div className="flex items-center gap-3 text-sm text-gray-500 font-medium">
                                              <span className="flex items-center gap-1.5 bg-gray-100 dark:bg-slate-700/50 px-2.5 py-1 rounded-lg">
                                                <Clock size={14} className="text-primary-500"/>
                                                {app.appointmentDate ? new Date(app.appointmentDate).toLocaleString() : 'Date TBD'}
                                              </span>
                                              {app.paymentStatus && (
                                                <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold ${
                                                  app.paymentStatus === 'SUCCESS' ? 'bg-green-100 text-green-700' :
                                                  app.paymentStatus === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                                                  'bg-red-100 text-red-700'
                                                }`}>
                                                  Payment: {app.paymentStatus}
                                                </span>
                                              )}
                                            </div>
                                            {app.notes && <p className="text-sm text-gray-600 dark:text-gray-400 mt-3 bg-gray-50 dark:bg-slate-800/50 p-3 rounded-xl border border-gray-100 dark:border-slate-700">"{app.notes}"</p>}
                                          </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-2">
                                          {app.status === 'PENDING' && (
                                            <>
                                              <button 
                                                onClick={() => handleAppointmentStatus(app.id, 'CONFIRMED')}
                                                className="btn-premium flex items-center gap-2 px-5 py-2.5 text-sm"
                                                title="Accept Request"
                                              >
                                                <Check size={16} /> Accept
                                              </button>
                                              <button 
                                                onClick={() => handleAppointmentStatus(app.id, 'REJECTED')}
                                                className="flex items-center gap-2 px-5 py-2.5 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-xl text-sm font-semibold hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors shadow-sm"
                                                title="Reject Request"
                                              >
                                                <X size={16} /> Reject
                                              </button>
                                            </>
                                          )}
                                          {app.status === 'PAID' && (
                                            <button 
                                              onClick={() => handleAppointmentStatus(app.id, 'COMPLETED')}
                                              className="flex items-center gap-2 px-5 py-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-xl text-sm font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors shadow-sm"
                                            >
                                              <CheckCircle2 size={16} /> Mark Completed
                                            </button>
                                          )}
                                          {(app.status === 'PAID' || app.status === 'COMPLETED') && (
                                            <button
                                              onClick={() => startChat(app.userId, app.userName)}
                                              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-xl text-sm font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors shadow-sm"
                                            >
                                              <MessageSquare size={16} /> Open Chat
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                      
                                      {/* Progress Timeline */}
                                      <div className="pt-5 border-t border-gray-100 dark:border-slate-700/50">
                                        <div className="flex items-center justify-between relative px-2">
                                          {/* Background Line */}
                                          <div className="absolute left-0 top-3 w-full h-1 bg-gray-100 dark:bg-slate-700 rounded-full"></div>
                                          
                                          {/* Timeline Steps */}
                                          {[
                                            { step: 'Requested', isActive: true, isDone: true },
                                            { step: 'Accepted', isActive: ['CONFIRMED', 'PAID', 'COMPLETED'].includes(app.status), isDone: ['CONFIRMED', 'PAID', 'COMPLETED'].includes(app.status) },
                                            { step: 'Paid', isActive: ['PAID', 'COMPLETED'].includes(app.status), isDone: ['PAID', 'COMPLETED'].includes(app.status) },
                                            { step: 'Completed', isActive: app.status === 'COMPLETED', isDone: app.status === 'COMPLETED' }
                                          ].map((item, idx) => (
                                            <div key={idx} className="relative z-10 flex flex-col items-center gap-2 w-1/4">
                                              <div className={`w-7 h-7 rounded-full flex items-center justify-center border-4 transition-colors ${item.isActive ? 'bg-primary-500 border-white dark:border-slate-800 text-white shadow-glow' : 'bg-gray-200 dark:bg-slate-600 border-white dark:border-slate-800 text-transparent'}`}>
                                                {item.isDone && <Check size={14} strokeWidth={3} />}
                                              </div>
                                              <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${item.isActive ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400'}`}>{item.step}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
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
                <div className="glass-panel rounded-3xl p-6 md:p-8">
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-bold flex items-center gap-3">
                      <div className="p-2 bg-primary-100 dark:bg-primary-900/30 text-primary-600 rounded-xl">
                        <CalendarIcon size={24} />
                      </div>
                      Availability Management
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Add New Availability */}
                    <div className="glass-card p-6">
                      <h3 className="text-xl font-bold mb-4">Add Availability Rule</h3>
                      <form onSubmit={async (e) => {
                        e.preventDefault();
                        try {
                          await api.post(`availability/lawyer/${user.id}`, {
                            ...availabilityForm,
                            dayOfWeek: availabilityForm.dayOfWeek ? parseInt(availabilityForm.dayOfWeek) : null,
                            isAvailable: availabilityForm.isAvailable === 'true'
                          });
                          alert('Availability added successfully');
                          setAvailabilityForm({ dayOfWeek: '', date: '', startTime: '', endTime: '', isAvailable: 'true' });
                          loadAvailabilities();
                        } catch (err) {
                          alert('Failed to add availability');
                        }
                      }} className="space-y-4">
                        
                        <div>
                          <label className="block text-sm font-medium mb-1">Rule Type</label>
                          <select 
                            className="w-full p-2 border rounded-xl dark:bg-gray-800 dark:border-gray-700"
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

                        {availabilityForm.dayOfWeek !== '' ? (
                          <div>
                            <label className="block text-sm font-medium mb-1">Day of Week</label>
                            <select 
                              className="w-full p-2 border rounded-xl dark:bg-gray-800 dark:border-gray-700"
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
                            <label className="block text-sm font-medium mb-1">Date</label>
                            <input 
                              type="date"
                              className="w-full p-2 border rounded-xl dark:bg-gray-800 dark:border-gray-700"
                              value={availabilityForm.date}
                              onChange={(e) => setAvailabilityForm({...availabilityForm, date: e.target.value})}
                              required
                            />
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-1">Start Time</label>
                            <input 
                              type="time"
                              className="w-full p-2 border rounded-xl dark:bg-gray-800 dark:border-gray-700"
                              value={availabilityForm.startTime}
                              onChange={(e) => setAvailabilityForm({...availabilityForm, startTime: e.target.value})}
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">End Time</label>
                            <input 
                              type="time"
                              className="w-full p-2 border rounded-xl dark:bg-gray-800 dark:border-gray-700"
                              value={availabilityForm.endTime}
                              onChange={(e) => setAvailabilityForm({...availabilityForm, endTime: e.target.value})}
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-1">Status</label>
                          <select 
                            className="w-full p-2 border rounded-xl dark:bg-gray-800 dark:border-gray-700"
                            value={availabilityForm.isAvailable}
                            onChange={(e) => setAvailabilityForm({...availabilityForm, isAvailable: e.target.value})}
                          >
                            <option value="true">Available (Working Hours)</option>
                            <option value="false">Unavailable (Vacation / Blocked)</option>
                          </select>
                        </div>

                        <button type="submit" className="w-full py-2 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition">
                          Add Rule
                        </button>
                      </form>
                    </div>

                    {/* List Availabilities */}
                    <div className="glass-card p-6 overflow-y-auto max-h-[500px]">
                      <h3 className="text-xl font-bold mb-4">Current Rules</h3>
                      <div className="space-y-4">
                        {availabilities.length === 0 ? (
                          <p className="text-gray-500">No availability rules set.</p>
                        ) : (
                          availabilities.map(avail => (
                            <div key={avail.id} className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex justify-between items-center bg-white/50 dark:bg-gray-800/50">
                              <div>
                                <p className="font-bold text-sm">
                                  {avail.dayOfWeek ? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][avail.dayOfWeek - 1] : avail.date}
                                </p>
                                <p className="text-xs text-gray-500">{avail.startTime} - {avail.endTime}</p>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 inline-block ${avail.isAvailable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                  {avail.isAvailable ? 'Available' : 'Unavailable'}
                                </span>
                              </div>
                              <button 
                                onClick={async () => {
                                  if (window.confirm('Delete this rule?')) {
                                    try {
                                      await api.delete(`availability/${avail.id}`);
                                      loadAvailabilities();
                                    } catch(err) {
                                      alert('Failed to delete');
                                    }
                                  }
                                }}
                                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* PRACTICE PROFILE TAB */}
              {activeTab === 'profile' && (
                <ErrorBoundary>
                <div className="glass-panel rounded-3xl p-6">
                  <h2 className="text-xl font-bold mb-6">Manage Professional Details</h2>
                  
                  {/* Profile Picture Upload Section */}
                  <div className="mb-8 flex flex-col sm:flex-row items-center gap-6 bg-gray-50/50 dark:bg-slate-800/30 p-6 rounded-2xl border border-gray-100 dark:border-slate-700">
                    <div className="relative group">
                      <div className="w-32 h-32 md:w-40 md:h-40 mx-auto rounded-full border-4 border-white shadow-xl overflow-hidden mb-4 relative bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                        <span className="text-5xl font-bold text-white">{user?.firstName?.charAt(0) || 'L'}</span>
                        {profile?.profileImageUrl && (
                          <img 
                            src={profile.profileImageUrl} 
                            alt="Profile" 
                            className="absolute inset-0 w-full h-full object-cover" 
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        )}
                        
                        {/* Hover Overlay */}
                        <label className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                          {uploadingImage ? (
                            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <>
                              <Camera size={24} className="mb-1" />
                              <span className="text-xs font-medium">Change</span>
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
                      <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-primary-400 to-brand-purple opacity-0 group-hover:opacity-100 blur transition duration-300 -z-10"></div>
                    </div>
                    
                    <div>
                      <h3 className="font-bold text-lg mb-1">Professional Photo</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-sm">
                        Upload a clear, professional headshot. Recommended size is 400x400px. Max size 5MB (JPG/PNG).
                      </p>
                      <div className="flex gap-3">
                        <label className="flex items-center gap-2 bg-primary-50 hover:bg-primary-100 dark:bg-primary-900/20 dark:hover:bg-primary-900/40 text-primary-600 px-4 py-2 rounded-xl text-sm font-semibold transition-colors cursor-pointer border border-primary-200 dark:border-primary-800">
                          <Upload size={16} />
                          {uploadingImage ? 'Uploading...' : 'Upload New'}
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
                            className="flex items-center gap-2 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 px-4 py-2 rounded-xl text-sm font-semibold transition-colors border border-red-200 dark:border-red-800"
                          >
                            <Trash2 size={16} /> Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleProfileSubmit} className="space-y-6">
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Lawyer Specialization</label>
                        <select
                          value={profile.specializationCategoryId}
                          onChange={(e) => setProfile({ ...profile, specializationCategoryId: e.target.value })}
                          required
                          className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-white"
                        >
                          <option value="">Select Specialization</option>
                          {categories.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Experience (Years)</label>
                        <input
                          type="number"
                          value={profile.experienceYears}
                          onChange={(e) => setProfile({ ...profile, experienceYears: e.target.value })}
                          required
                          className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bar Council Registration Number</label>
                        <input
                          type="text"
                          value={profile.barCouncilNumber}
                          onChange={(e) => setProfile({ ...profile, barCouncilNumber: e.target.value })}
                          required
                          className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Consultation Fee (INR)</label>
                        <input
                          type="number"
                          value={profile.consultationFee}
                          onChange={(e) => setProfile({ ...profile, consultationFee: e.target.value })}
                          required
                          className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">City</label>
                        <input
                          type="text"
                          value={profile.city}
                          onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                          required
                          className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">State</label>
                        <input
                          type="text"
                          value={profile.state}
                          onChange={(e) => setProfile({ ...profile, state: e.target.value })}
                          required
                          className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Languages (Comma separated)</label>
                        <input
                          type="text"
                          value={profile.languages}
                          onChange={(e) => setProfile({ ...profile, languages: e.target.value })}
                          placeholder="English, Hindi, Telugu"
                          className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Qualification</label>
                        <input
                          type="text"
                          value={profile.qualification}
                          onChange={(e) => setProfile({ ...profile, qualification: e.target.value })}
                          placeholder="B.A. LL.B (Hons)"
                          className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Availability Status</label>
                      <select
                        value={profile.availabilityStatus}
                        onChange={(e) => setProfile({ ...profile, availabilityStatus: e.target.value })}
                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-white"
                      >
                        <option value="AVAILABLE">Available</option>
                        <option value="BUSY">Busy</option>
                        <option value="ON_LEAVE">On Leave</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Biography / About Me</label>
                      <textarea
                        rows={5}
                        value={profile.bio}
                        onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                        placeholder="Describe your legal experience, case track records, and approach..."
                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl p-4 focus:ring-2 focus:ring-indigo-500 focus:outline-none outline-none dark:text-white resize-none"
                      />
                    </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl transition-all shadow-lg hover:shadow-indigo-500/20"
                      >
                        <Save size={18} /> {loading ? 'Saving...' : 'Save Profile Details'}
                      </button>
                    </form>
                  </div>
                </ErrorBoundary>
              )}

              {/* EARNINGS TAB */}
              {activeTab === 'earnings' && (
                <div className="space-y-6">
                  {/* Earnings Metrics Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="glass-panel rounded-3xl p-5 border-l-4 border-l-green-500">
                      <p className="text-xs text-gray-500">Total Consultations</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">₹{earningsData.totalAmount}</p>
                    </div>
                    <div className="glass-panel rounded-3xl p-5 border-l-4 border-l-indigo-500">
                      <p className="text-xs text-gray-500">Net Earnings (After Platform Fee)</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">₹{earningsData.netAmount}</p>
                    </div>
                    <div className="glass-panel rounded-3xl p-5 border-l-4 border-l-yellow-500">
                      <p className="text-xs text-gray-500">Platform Fees (10%)</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">₹{earningsData.platformFees}</p>
                    </div>
                  </div>

                  {/* Earnings list */}
                  <div className="glass-panel rounded-3xl p-6">
                    <h2 className="text-xl font-bold mb-6">Payment History Logs</h2>
                    <div className="space-y-4">
                      {earningsData.earnings.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">No earnings recorded.</div>
                      ) : (
                        earningsData.earnings.map(earn => (
                          <div key={earn.id} className="p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-white/40 dark:bg-dark-card/25 flex justify-between items-center">
                            <div>
                              <p className="font-semibold text-sm">Consultation Payment</p>
                              <p className="text-xs text-gray-500">{new Date(earn.createdAt).toLocaleDateString()}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-green-600 dark:text-green-400">+₹{earn.netAmount}</p>
                              <p className="text-xs text-gray-400">Gross: ₹{earn.amount}</p>
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
                <div className="glass-panel rounded-3xl p-6 md:p-8">
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-bold flex items-center gap-3">
                      <div className="p-2 bg-primary-100 dark:bg-primary-900/30 text-primary-600 rounded-xl">
                        <Users size={24} />
                      </div>
                      My Client History
                    </h2>
                  </div>
                  <div className="space-y-6">
                    {appointments.filter(a => a.status === 'COMPLETED').length === 0 ? (
                      <div className="text-center py-16 text-gray-500 bg-gray-50/50 dark:bg-slate-800/30 rounded-3xl border border-dashed border-gray-200 dark:border-slate-700">
                        <Users size={48} className="mx-auto mb-4 text-gray-300 dark:text-slate-600" />
                        <p className="text-lg">No completed consultations in history.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-6">
                        {appointments.filter(a => a.status === 'COMPLETED').map(app => (
                          <div key={app.id} className="glass-card p-6 flex flex-col gap-6 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex flex-wrap items-start justify-between gap-4">
                              <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-gradient-to-tr from-indigo-400 to-primary-500 text-white rounded-2xl flex items-center justify-center font-bold text-xl flex-shrink-0 shadow-md">
                                  {app.userName ? app.userName.charAt(0) : 'C'}
                                </div>
                                <div>
                                  <h3 className="font-extrabold text-lg text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                    {app.userName || `Client #${app.userId}`}
                                    <span className="text-[10px] font-medium px-2 py-0.5 bg-gray-100 dark:bg-slate-700/50 text-gray-500 rounded-lg">
                                      ID: #{app.id}
                                    </span>
                                  </h3>
                                  <div className="flex items-center gap-2 mt-1">
                                    {app.userEmail && <span className="text-xs text-gray-500">{app.userEmail}</span>}
                                    {app.userEmail && app.userPhone && <span className="text-gray-300">•</span>}
                                    {app.userPhone && <span className="text-xs text-gray-500">{app.userPhone}</span>}
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <div className="flex flex-wrap justify-end items-center gap-2">
                                  <span className="px-2.5 py-1 bg-blue-100/80 text-blue-700 text-[10px] rounded-lg font-bold tracking-wide uppercase border border-blue-200">{app.status}</span>
                                  <span className="px-2.5 py-1 bg-emerald-100/80 text-emerald-700 text-[10px] rounded-lg font-bold tracking-wide uppercase flex items-center gap-1 border border-emerald-200"><DollarSign size={10} /> {app.paymentStatus || 'SUCCESS'}</span>
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-4 bg-gray-50/80 dark:bg-slate-800/50 p-4 rounded-2xl text-sm border border-gray-100 dark:border-slate-700">
                              <div>
                                <p className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wider">Date &amp; Time</p>
                                <p className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5"><Clock size={14} className="text-primary-500" />{new Date(app.appointmentDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wider">Case Type</p>
                                <p className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5"><Briefcase size={14} className="text-primary-500" />{app.specializationCategory || 'General'}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wider">Consultation Fee</p>
                                <p className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5"><DollarSign size={14} className="text-emerald-500" />₹{app.consultationFee || '0'}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wider">Client Rating</p>
                                {app.clientRating ? (
                                  <div className="flex items-center gap-1.5 font-bold text-gray-800 dark:text-gray-200">
                                    <Star size={14} className="text-yellow-500 fill-current" />
                                    <span>{app.clientRating}/5</span>
                                  </div>
                                ) : (
                                  <p className="text-gray-400 italic text-xs mt-1">Pending review</p>
                                )}
                              </div>
                            </div>

                            <div className="flex justify-end border-t border-gray-100 dark:border-slate-700/50 pt-4">
                              <button
                                onClick={() => startChat(app.userId, app.userName)}
                                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-bold text-sm rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors shadow-sm"
                              >
                                <MessageSquare size={16} /> Open Chat
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
                <div className="space-y-6">
                  <div className="glass-panel rounded-3xl p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-bold">Client Reviews &amp; Ratings</h2>
                      <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl">
                        <Star className="text-yellow-500 fill-current" size={20} />
                        <span className="font-bold text-lg">{profile.averageRating}</span>
                        <span className="text-gray-500 text-sm">({profile.totalReviews} reviews)</span>
                      </div>
                    </div>
                    <div className="space-y-4">
                      {reviews.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                          <Star size={48} className="mx-auto mb-4 text-gray-300" />
                          <p>No reviews yet. Reviews appear here after clients complete consultations.</p>
                        </div>
                      ) : (
                        reviews.map((review) => (
                          <div key={review.id} className="p-5 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white/40 dark:bg-dark-card/25">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <p className="font-semibold">{review.clientName || 'Anonymous'}</p>
                                <p className="text-xs text-gray-400">{review.createdAt ? new Date(review.createdAt).toLocaleDateString() : ''}</p>
                              </div>
                              <div className="flex items-center gap-0.5">
                                {[1,2,3,4,5].map(s => (
                                  <Star key={s} size={16} className={s <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 dark:text-gray-600'} />
                                ))}
                              </div>
                            </div>
                            {review.reviewText && (
                              <p className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl italic">"{review.reviewText}"</p>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* MESSAGES TAB */}
              {activeTab === 'messages' && (
                <div className="glass-panel p-8 min-h-[500px] animate-fade-in">
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-bold flex items-center gap-3 text-gray-900 dark:text-white">
                      <div className="p-2 bg-primary-100 dark:bg-primary-900/30 text-primary-600 rounded-xl">
                        <MessageSquare size={24} />
                      </div>
                      Conversations
                    </h2>
                  </div>
                  
                  <div className="space-y-4">
                    {conversations.length === 0 ? (
                      <div className="text-center py-24 flex flex-col items-center justify-center bg-gray-50/50 dark:bg-slate-800/30 rounded-3xl border border-dashed border-gray-200 dark:border-slate-700">
                        <div className="w-24 h-24 bg-primary-50 dark:bg-primary-900/20 rounded-full flex items-center justify-center mb-6">
                          <MessageSquare size={40} className="text-primary-300 dark:text-primary-600" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">No Active Conversations</h3>
                        <p className="text-gray-500 dark:text-gray-400 max-w-md mb-8">
                          Once a booked consultation is PAID, a secure chat channel with the client will automatically appear here.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {conversations.map(conv => (
                          <div 
                            key={conv.id} 
                            onClick={() => startChat(conv.targetUserId, conv.targetUserName, conv.targetUserProfileImage)}
                            className="glass-card p-5 flex flex-col cursor-pointer group"
                          >
                            <div className="flex items-start justify-between mb-4">
                              <div className="relative">
                                <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-primary-400 to-brand-purple text-white font-bold text-xl flex items-center justify-center shadow-md group-hover:scale-105 transition-transform overflow-hidden border-2 border-white">
                                  {conv.targetUserProfileImage ? (
                                    <img src={conv.targetUserProfileImage} alt={conv.targetUserName} className="w-full h-full object-cover" />
                                  ) : (
                                    conv.targetUserName ? conv.targetUserName.charAt(0) : '?'
                                  )}
                                </div>
                                {conv.unreadCount > 0 && (
                                  <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 border-2 border-white dark:border-slate-800 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg animate-pulse-soft">
                                    {conv.unreadCount}
                                  </span>
                                )}
                                <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full shadow-sm"></span>
                              </div>
                              {conv.lastMessageTime && (
                                <span className="text-xs font-medium text-gray-500 bg-gray-100 dark:bg-slate-700/50 px-2 py-1 rounded-lg">
                                  {new Date(conv.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                            </div>
                            
                            <div className="flex-1">
                              <h3 className={`text-lg font-bold mb-1 ${conv.unreadCount > 0 ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-200'}`}>
                                {conv.targetUserName}
                              </h3>
                              <p className={`text-sm line-clamp-2 ${conv.unreadCount > 0 ? 'font-medium text-primary-700 dark:text-primary-300' : 'text-gray-500 dark:text-gray-400'}`}>
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

    </div>
  );
};

export default LawyerDashboard;
