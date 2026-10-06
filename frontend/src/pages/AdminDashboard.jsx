import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, FileText, Calendar, CreditCard, Download, TrendingUp, AlertTriangle, ShieldCheck, Activity, MessageSquare, Trash2, Search, Filter, X, CheckCircle, XCircle, MinusCircle, Eye, LogOut } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout } from '../redux/authSlice';
import api from '../services/api';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalLawyers: 0,
    totalAppointments: 0,
    totalPayments: 0,
    totalDocuments: 0,
    totalRevenue: 0,
    approvedLawyers: 0
  });
  const [auditLogs, setAuditLogs] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  // Verification state
  const [verificationLawyers, setVerificationLawyers] = useState([]);
  const [verificationFilter, setVerificationFilter] = useState('ALL');
  const [verificationSearch, setVerificationSearch] = useState('');
  const [selectedLawyer, setSelectedLawyer] = useState(null);
  const [adminRemarks, setAdminRemarks] = useState('');

  const [revenueData, setRevenueData] = useState([]);
  const [userGrowthData, setUserGrowthData] = useState([]);
  
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    fetchStats();
    fetchChartData();
    if (activeTab === 'audit') fetchAuditLogs();
    if (activeTab === 'reviews') fetchReviews();
    if (activeTab === 'lawyer-verification') fetchVerificationLawyers();
  }, [activeTab]);

  const fetchChartData = async () => {
    try {
      const revRes = await api.get('v1/admin/dashboard/revenue-growth');
      setRevenueData(revRes.data);
      const userRes = await api.get('v1/admin/dashboard/user-growth');
      setUserGrowthData(userRes.data);
    } catch (error) {
      console.error("Failed to fetch chart data", error);
    }
  };

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await api.get('v1/admin/dashboard/stats');
      setStats(response.data);
    } catch (error) {
      console.error("Failed to fetch admin stats", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const response = await api.get('v1/admin/audit-logs');
      setAuditLogs(response.data);
    } catch (error) {
      console.error("Failed to fetch audit logs", error);
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await api.get('v1/admin/reviews');
      setReviews(response.data);
    } catch (error) {
      console.error("Failed to fetch reviews", error);
    }
  };

  const handleDeleteReview = async (id) => {
    if (!window.confirm("Are you sure you want to delete this review?")) return;
    try {
      await api.delete(`v1/admin/reviews/${id}`);
      fetchReviews();
      alert("Review deleted.");
    } catch (error) {
      console.error(error);
      alert("Failed to delete review");
    }
  };

  const fetchVerificationLawyers = async () => {
    try {
      const response = await api.get('v1/admin/lawyers/all');
      setVerificationLawyers(response.data);
    } catch (error) {
      console.error("Failed to fetch lawyers for verification", error);
    }
  };

  const handleUpdateVerification = async (id, status) => {
    try {
      let endpoint = 'approve';
      if (status === 'REJECTED') endpoint = 'reject';
      if (status === 'SUSPENDED') endpoint = 'suspend';
      
      await api.put(`v1/admin/lawyers/${id}/${endpoint}`, { remarks: adminRemarks });
      alert(`Lawyer status updated to ${status}`);
      setSelectedLawyer(null);
      setAdminRemarks('');
      fetchVerificationLawyers();
      fetchStats();
    } catch (error) {
      console.error("Failed to update lawyer status", error);
      alert("Failed to update lawyer status");
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const statCards = [
    { title: "Total Users", value: stats.totalUsers, icon: Users, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20", border: "border-blue-100 dark:border-blue-800/30" },
    { title: "Total Lawyers", value: stats.totalLawyers, icon: ShieldCheck, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-900/20", border: "border-purple-100 dark:border-purple-800/30" },
    { title: "Appointments", value: stats.totalAppointments, icon: Calendar, color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-900/20", border: "border-indigo-100 dark:border-indigo-800/30" },
    { title: "Revenue (INR)", value: `₹${(stats.totalRevenue || 0).toLocaleString()}`, icon: TrendingUp, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20", border: "border-emerald-100 dark:border-emerald-800/30" },
    { title: "Lawyer Approvals", value: stats.approvedLawyers, icon: FileText, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20", border: "border-amber-100 dark:border-amber-800/30" },
  ];

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-[#0B0F19] transition-colors duration-300">
      <div className="sticky top-0 z-40 bg-white/70 dark:bg-[#111827]/70 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
              ADMIN DASHBOARD - LIVE BUILD TEST
            </h1>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">
              System overview and analytics at a glance.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <motion.button id="admin-logout-btn" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleLogout} className="flex items-center gap-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:text-rose-600 dark:hover:text-rose-400 border border-gray-200 dark:border-gray-700 hover:border-rose-200 dark:hover:border-rose-900/50 px-4 py-2.5 rounded-xl font-semibold transition-all shadow-sm hover:bg-rose-50 dark:hover:bg-rose-900/10 text-sm relative z-50">
              <LogOut size={18} />
              Log Out {/* Verified Live Build */}
            </motion.button>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto space-y-8">

      <div className="flex space-x-4 border-b border-gray-200 dark:border-gray-700 mb-6 pb-2 overflow-x-auto">
        {['overview', 'lawyer-verification', 'audit', 'reviews'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 font-semibold text-sm capitalize transition-all rounded-full relative ${
              activeTab === tab 
                ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10' 
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800/50'
            }`}
          >
            {tab.replace('-', ' ')}
            {activeTab === tab && (
              <motion.div layoutId="activeTabIndicator" className="absolute inset-0 border-2 border-indigo-600 dark:border-indigo-400 rounded-full pointer-events-none" transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.3, ease: "easeOut" }}>
          
          {activeTab === 'overview' && (
            <div className="space-y-8">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 lg:gap-6 mb-8">
                {statCards.map((card, idx) => (
                  <motion.div whileHover={{ y: -4, scale: 1.02 }} transition={{ duration: 0.2 }} key={idx} className={`bg-white dark:bg-gray-800/80 backdrop-blur-sm p-5 rounded-3xl shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 border ${card.border} relative overflow-hidden group`}>
                    <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-300">
                      <card.icon size={80} />
                    </div>
                    <div className={`w-12 h-12 rounded-2xl mb-4 flex items-center justify-center ${card.bg} ${card.color} shadow-inner`}>
                      <card.icon size={24} />
                    </div>
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">{card.title}</p>
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                      {loading ? <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg"></div> : card.value}
                    </h3>
                  </motion.div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, delay: 0.1 }} className="bg-white dark:bg-gray-800/80 backdrop-blur-sm p-6 lg:p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800/60 h-[400px] flex flex-col">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">Revenue Overview</h3>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">Monthly earning performance</p>
                    </div>
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl text-emerald-600 dark:text-emerald-400"><TrendingUp size={20}/></div>
                  </div>
                  <div className="flex-1 w-full relative">
                    {revenueData.length === 0 || revenueData.every(d => d.revenue === 0) ? (
                      <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/40 dark:bg-gray-900/40 backdrop-blur-[2px]">
                        <div className="bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 text-gray-500 dark:text-gray-400 font-medium">
                          No revenue data available
                        </div>
                      </div>
                    ) : null}
                    <ResponsiveContainer width="100%" height="100%" className={(revenueData.length === 0 || revenueData.every(d => d.revenue === 0)) ? "opacity-40 grayscale" : ""}>
                      <LineChart data={revenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" strokeOpacity={0.4} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} tickFormatter={(val) => `₹${val/1000}k`} />
                        <Tooltip cursor={{ stroke: '#f3f4f6', strokeWidth: 2 }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(8px)' }} />
                        <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={4} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 8, strokeWidth: 2 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
                
                <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, delay: 0.2 }} className="bg-white dark:bg-gray-800/80 backdrop-blur-sm p-6 lg:p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800/60 h-[400px] flex flex-col">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">User Growth</h3>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">Platform adoption metrics</p>
                    </div>
                    <div className="flex -space-x-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 border-2 border-white dark:border-gray-800 flex items-center justify-center text-blue-600"><Users size={14}/></div>
                      <div className="w-8 h-8 rounded-full bg-purple-100 border-2 border-white dark:border-gray-800 flex items-center justify-center text-purple-600"><ShieldCheck size={14}/></div>
                    </div>
                  </div>
                  <div className="flex-1 w-full relative">
                    {userGrowthData.length === 0 || userGrowthData.every(d => d.users === 0 && d.lawyers === 0) ? (
                      <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/40 dark:bg-gray-900/40 backdrop-blur-[2px]">
                        <div className="bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 text-gray-500 dark:text-gray-400 font-medium">
                          No user growth data available
                        </div>
                      </div>
                    ) : null}
                    <ResponsiveContainer width="100%" height="100%" className={(userGrowthData.length === 0 || userGrowthData.every(d => d.users === 0 && d.lawyers === 0)) ? "opacity-40 grayscale" : ""}>
                      <BarChart data={userGrowthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barGap={6}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" strokeOpacity={0.4} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                        <Tooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(8px)' }} />
                        <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '14px' }} />
                        <Bar dataKey="users" name="Clients" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={16} />
                        <Bar dataKey="lawyers" name="Lawyers" fill="#8b5cf6" radius={[6, 6, 0, 0]} barSize={16} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
              </div>
            </div>
          )}

          {activeTab === 'lawyer-verification' && (
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl shadow-sm border border-gray-200/60 dark:border-gray-700/60 overflow-hidden flex flex-col">
              <div className="p-6 lg:p-8 border-b border-gray-100 dark:border-gray-700/50 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gray-50/50 dark:bg-gray-800/30">
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-3 text-gray-900 dark:text-white">
                    <div className="p-2 bg-purple-100 dark:bg-purple-500/20 rounded-xl text-purple-600 dark:text-purple-400"><ShieldCheck size={24} /></div> 
                    Lawyer Verification
                  </h3>
                  <p className="text-sm text-gray-500 mt-2">Manage and approve lawyer registrations</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    <input 
                      type="text" 
                      placeholder="Search lawyers..." 
                      className="pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                      value={verificationSearch}
                      onChange={(e) => setVerificationSearch(e.target.value)}
                    />
                  </div>
                  <div className="relative">
                    <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    <select 
                      className="pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white appearance-none"
                      value={verificationFilter}
                      onChange={(e) => setVerificationFilter(e.target.value)}
                    >
                      <option value="ALL">All Status</option>
                      <option value="PENDING">Pending</option>
                      <option value="APPROVED">Approved</option>
                      <option value="REJECTED">Rejected</option>
                      <option value="SUSPENDED">Suspended</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                    <tr>
                      <th className="px-6 py-3">Lawyer</th>
                      <th className="px-6 py-3">Specialization</th>
                      <th className="px-6 py-3">Experience</th>
                      <th className="px-6 py-3">Reg. Date</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {verificationLawyers
                      .filter(l => verificationFilter === 'ALL' || l.verificationStatus === verificationFilter)
                      .filter(l => verificationSearch === '' || 
                                   l.name?.toLowerCase().includes(verificationSearch.toLowerCase()) || 
                                   l.email?.toLowerCase().includes(verificationSearch.toLowerCase()))
                      .map(lawyer => (
                      <tr key={lawyer.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {lawyer.profileImageUrl ? (
                              <img src={lawyer.profileImageUrl} alt={lawyer.name} className="w-10 h-10 rounded-full object-cover" />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                                {lawyer.name ? lawyer.name.charAt(0) : 'L'}
                              </div>
                            )}
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-white">{lawyer.name}</p>
                              <p className="text-xs">{lawyer.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-medium">{lawyer.specialization}</td>
                        <td className="px-6 py-4">{lawyer.experienceYears} Yrs</td>
                        <td className="px-6 py-4">{lawyer.createdAt ? new Date(lawyer.createdAt).toLocaleDateString() : 'N/A'}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            lawyer.verificationStatus === 'APPROVED' ? 'bg-green-100 text-green-700' :
                            lawyer.verificationStatus === 'REJECTED' ? 'bg-red-100 text-red-700' :
                            lawyer.verificationStatus === 'SUSPENDED' ? 'bg-gray-100 text-gray-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {lawyer.verificationStatus || 'PENDING'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => setSelectedLawyer(lawyer)} 
                            className="text-indigo-600 hover:text-indigo-800 font-medium px-3 py-1 border border-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors inline-flex items-center gap-1"
                          >
                            <Eye size={16} /> View
                          </button>
                        </td>
                      </tr>
                    ))}
                    {verificationLawyers.length === 0 && (
                      <tr><td colSpan="6" className="px-6 py-8 text-center">No lawyers found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'audit' && (
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl shadow-sm border border-gray-200/60 dark:border-gray-700/60 overflow-hidden flex flex-col">
              <div className="p-6 lg:p-8 border-b border-gray-100 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/30">
                <h3 className="text-xl font-bold flex items-center gap-3 text-gray-900 dark:text-white">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-500/20 rounded-xl text-indigo-600 dark:text-indigo-400"><Activity size={24} /></div>
                  Audit Logs
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                    <tr>
                      <th className="px-6 py-3">Timestamp</th>
                      <th className="px-6 py-3">User</th>
                      <th className="px-6 py-3">Action</th>
                      <th className="px-6 py-3">IP Address</th>
                      <th className="px-6 py-3">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map(log => (
                      <tr key={log.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-6 py-4">{new Date(log.createdAt).toLocaleString()}</td>
                        <td className="px-6 py-4">{log.user ? log.user.email : 'System'}</td>
                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{log.action}</td>
                        <td className="px-6 py-4">{log.ipAddress}</td>
                        <td className="px-6 py-4 truncate max-w-xs" title={log.details}>{log.details}</td>
                      </tr>
                    ))}
                    {auditLogs.length === 0 && (
                      <tr><td colSpan="5" className="px-6 py-8 text-center">No audit logs found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'reviews' && (
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl shadow-sm border border-gray-200/60 dark:border-gray-700/60 overflow-hidden flex flex-col">
              <div className="p-6 lg:p-8 border-b border-gray-100 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/30">
                <h3 className="text-xl font-bold flex items-center gap-3 text-gray-900 dark:text-white">
                  <div className="p-2 bg-amber-100 dark:bg-amber-500/20 rounded-xl text-amber-600 dark:text-amber-400"><MessageSquare size={24} /></div>
                  Manage Reviews
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                    <tr>
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3">Lawyer ID</th>
                      <th className="px-6 py-3">Client ID</th>
                      <th className="px-6 py-3">Rating</th>
                      <th className="px-6 py-3">Review</th>
                      <th className="px-6 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reviews.map(review => (
                      <tr key={review.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-6 py-4">{new Date(review.createdAt).toLocaleDateString()}</td>
                        <td className="px-6 py-4">{review.lawyerId}</td>
                        <td className="px-6 py-4">{review.userId}</td>
                        <td className="px-6 py-4 font-bold text-yellow-500">{review.rating} / 5</td>
                        <td className="px-6 py-4 truncate max-w-xs">{review.reviewText}</td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => handleDeleteReview(review.id)} className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50 transition-colors">
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {reviews.length === 0 && (
                      <tr><td colSpan="6" className="px-6 py-8 text-center">No reviews found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {selectedLawyer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Lawyer Verification Details</h3>
                <button onClick={() => { setSelectedLawyer(null); setAdminRemarks(''); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <X size={24} />
                </button>
              </div>
              <div className="p-6 overflow-y-auto space-y-6">
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Photo & Basic Details */}
                  <div className="w-full md:w-1/3 flex flex-col items-center text-center space-y-4">
                    {selectedLawyer.profileImageUrl ? (
                      <img src={selectedLawyer.profileImageUrl} alt="Lawyer" className="w-32 h-32 rounded-2xl object-cover shadow-md border-4 border-white" />
                    ) : (
                      <div className="w-32 h-32 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-4xl shadow-md border-4 border-white">
                        {selectedLawyer.name ? selectedLawyer.name.charAt(0) : 'L'}
                      </div>
                    )}
                    <div>
                      <h4 className="font-bold text-lg text-gray-900 dark:text-white">{selectedLawyer.name}</h4>
                      <p className="text-sm text-gray-500">{selectedLawyer.email}</p>
                      <p className="text-sm text-gray-500">{selectedLawyer.phone}</p>
                    </div>
                    <div className="w-full bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-100 dark:border-gray-600">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs text-gray-500">Profile Completion</span>
                        <span className="text-xs font-bold">{selectedLawyer.profileCompletion || 0}%</span>
                      </div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs text-gray-500">Rating</span>
                        <span className="text-xs font-bold text-yellow-500">{selectedLawyer.averageRating || '0.0'} ({selectedLawyer.totalReviews || 0})</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">Status</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                            selectedLawyer.verificationStatus === 'APPROVED' ? 'bg-green-100 text-green-700' :
                            selectedLawyer.verificationStatus === 'REJECTED' ? 'bg-red-100 text-red-700' :
                            selectedLawyer.verificationStatus === 'SUSPENDED' ? 'bg-gray-100 text-gray-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {selectedLawyer.verificationStatus || 'PENDING'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Detailed Information */}
                  <div className="w-full md:w-2/3 space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                      <div><span className="text-gray-500 block mb-1 text-xs uppercase tracking-wider">Specialization</span><p className="font-semibold text-gray-900 dark:text-white">{selectedLawyer.specialization}</p></div>
                      <div><span className="text-gray-500 block mb-1 text-xs uppercase tracking-wider">Experience</span><p className="font-semibold text-gray-900 dark:text-white">{selectedLawyer.experienceYears} Years</p></div>
                      <div><span className="text-gray-500 block mb-1 text-xs uppercase tracking-wider">Consultation Fee</span><p className="font-semibold text-gray-900 dark:text-white">₹{selectedLawyer.consultationFee}</p></div>
                      <div><span className="text-gray-500 block mb-1 text-xs uppercase tracking-wider">Bar Council Number</span><p className="font-semibold text-gray-900 dark:text-white">{selectedLawyer.barCouncilNumber || 'N/A'}</p></div>
                      <div><span className="text-gray-500 block mb-1 text-xs uppercase tracking-wider">Languages</span><p className="font-semibold text-gray-900 dark:text-white">{selectedLawyer.languages || 'N/A'}</p></div>
                      <div><span className="text-gray-500 block mb-1 text-xs uppercase tracking-wider">Location</span><p className="font-semibold text-gray-900 dark:text-white">{selectedLawyer.city ? `${selectedLawyer.city}, ${selectedLawyer.state}` : 'N/A'}</p></div>
                    </div>
                    
                    {selectedLawyer.bio && (
                      <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                        <span className="text-gray-500 block mb-2 text-xs uppercase tracking-wider">Biography</span>
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">{selectedLawyer.bio}</p>
                      </div>
                    )}
                    
                    <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                      <span className="text-gray-500 block mb-2 text-xs uppercase tracking-wider">Advocate Certificate</span>
                      {selectedLawyer.advocateCertificateUrl ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <ShieldCheck className="text-green-500" size={24} />
                            <span className="text-sm font-medium">Certificate Uploaded</span>
                          </div>
                          <div className="flex gap-2">
                            <a href={selectedLawyer.advocateCertificateUrl} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-sm font-medium transition-colors flex items-center gap-1">
                              <Eye size={14} /> Preview
                            </a>
                            <a href={selectedLawyer.advocateCertificateUrl} download className="px-3 py-1.5 bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-lg text-sm font-medium transition-colors flex items-center gap-1">
                              <Download size={14} /> Download
                            </a>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-red-500 font-medium">No certificate uploaded yet.</p>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Admin Remarks (Optional)</label>
                  <textarea 
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500" 
                    rows="3" 
                    placeholder="E.g., Bar Council details verified."
                    value={adminRemarks}
                    onChange={(e) => setAdminRemarks(e.target.value)}
                  ></textarea>
                </div>
              </div>
              <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex flex-wrap gap-3 justify-end">
                <button onClick={() => handleUpdateVerification(selectedLawyer.id, 'APPROVED')} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium">
                  <CheckCircle size={18}/> Approve
                </button>
                <button onClick={() => handleUpdateVerification(selectedLawyer.id, 'REJECTED')} className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium">
                  <XCircle size={18}/> Reject
                </button>
                <button onClick={() => handleUpdateVerification(selectedLawyer.id, 'SUSPENDED')} className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors font-medium">
                  <MinusCircle size={18}/> Suspend
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
    </div>
  );
};

export default AdminDashboard;
