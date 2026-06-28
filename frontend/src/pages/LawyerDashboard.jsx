import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Briefcase, Calendar, DollarSign, Users, Check, X, Clock, Star, 
  CheckCircle2, AlertCircle, Percent, MapPin, Save, ShieldCheck, LogOut
} from 'lucide-react';
import api from '../services/api';
import { logout } from '../redux/authSlice';

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
    totalReviews: 0
  });

  const [appointments, setAppointments] = useState([]);
  const [earningsData, setEarningsData] = useState({
    earnings: [],
    totalAmount: 0,
    netAmount: 0,
    platformFees: 0
  });
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProfile();
    loadAppointments();
    loadEarnings();
    loadClients();
  }, []);

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
            totalReviews: res.data.totalReviews || 0
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

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 min-h-screen">
      
      {/* Overview Header */}
      <div className="glass-panel rounded-3xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-purple-600">
            Welcome, Advocate {user.firstName}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Here is your professional practice overview.</p>
        </div>

        <div className="flex flex-wrap gap-6 items-center">
          <div className="flex items-center gap-3 bg-white/50 dark:bg-dark-bg/50 px-4 py-2 rounded-2xl border border-gray-100 dark:border-gray-800">
            <Percent className="text-indigo-500" size={20} />
            <div>
              <p className="text-xs text-gray-500">Profile Done</p>
              <p className="font-bold text-sm">{profile.profileCompletion}%</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-white/50 dark:bg-dark-bg/50 px-4 py-2 rounded-2xl border border-gray-100 dark:border-gray-800">
            <Star className="text-yellow-500 fill-current" size={20} />
            <div>
              <p className="text-xs text-gray-500">Rating</p>
              <p className="font-bold text-sm">{profile.averageRating} ({profile.totalReviews} reviews)</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-white/50 dark:bg-dark-bg/50 px-4 py-2 rounded-2xl border border-gray-100 dark:border-gray-800">
            <Clock className="text-green-500" size={20} />
            <div>
              <p className="text-xs text-gray-500">Status</p>
              <p className="font-bold text-sm text-green-600 dark:text-green-400">{profile.availabilityStatus}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors font-medium text-sm border border-red-100 dark:border-red-800"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Navigation Sidebar */}
        <div className="lg:col-span-1 space-y-2">
          {[
            { id: 'appointments', label: 'Consultations', icon: Calendar },
            { id: 'profile', label: 'Practice Profile', icon: Briefcase },
            { id: 'earnings', label: 'Earnings Summary', icon: DollarSign },
            { id: 'clients', label: 'My Client History', icon: Users },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-card/50'
                }`}
              >
                <Icon size={20} />
                {tab.label}
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
                <div className="glass-panel rounded-3xl p-6 space-y-6">
                  <h2 className="text-xl font-bold">Consultation Bookings</h2>
                  <div className="space-y-4">
                    {appointments.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">No appointments found.</div>
                    ) : (
                      appointments.map(app => (
                        <div key={app.id} className="p-5 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white/40 dark:bg-dark-card/25 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-lg">{app.user?.firstName} {app.user?.lastName}</span>
                              <span className={`px-2 py-0.5 text-xs rounded-full font-bold ${
                                app.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                                app.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                                app.status === 'COMPLETED' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                              }`}>{app.status}</span>
                            </div>
                            <p className="text-sm text-gray-500">{new Date(app.appointmentDate).toLocaleString()}</p>
                            {app.notes && <p className="text-xs text-gray-400 mt-2 bg-gray-50 dark:bg-gray-800 p-2 rounded-lg italic">Note: "{app.notes}"</p>}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {app.status === 'PENDING' && (
                              <>
                                <button 
                                  onClick={() => handleAppointmentStatus(app.id, 'CONFIRMED')}
                                  className="p-2 bg-green-100 text-green-700 rounded-xl hover:bg-green-200 transition-colors"
                                  title="Confirm"
                                >
                                  <Check size={18} />
                                </button>
                                <button 
                                  onClick={() => handleAppointmentStatus(app.id, 'REJECTED')}
                                  className="p-2 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition-colors"
                                  title="Reject"
                                >
                                  <X size={18} />
                                </button>
                              </>
                            )}
                            {app.status === 'CONFIRMED' && (
                              <button 
                                onClick={() => handleAppointmentStatus(app.id, 'COMPLETED')}
                                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors"
                              >
                                Mark Completed
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* PRACTICE PROFILE TAB */}
              {activeTab === 'profile' && (
                <div className="glass-panel rounded-3xl p-6">
                  <h2 className="text-xl font-bold mb-6">Manage Professional Details</h2>
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
                <div className="glass-panel rounded-3xl p-6">
                  <h2 className="text-xl font-bold mb-6">Clients History Directory</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {clients.length === 0 ? (
                      <div className="col-span-full text-center py-12 text-gray-500">No clients in history.</div>
                    ) : (
                      clients.map(client => (
                        <div key={client.id} className="p-5 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white/40 dark:bg-dark-card/25 flex items-center gap-4">
                          <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 rounded-full flex items-center justify-center font-bold text-lg">
                            {client.name ? client.name.charAt(0) : 'C'}
                          </div>
                          <div>
                            <h3 className="font-bold">{client.name}</h3>
                            <p className="text-xs text-gray-500">{client.email}</p>
                            {client.phone && <p className="text-xs text-gray-500 mt-1">Ph: {client.phone}</p>}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>

      </div>

    </div>
  );
};

export default LawyerDashboard;
