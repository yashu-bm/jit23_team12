import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, FileText, Calendar, CreditCard, Download, TrendingUp, AlertTriangle, ShieldCheck, Activity, MessageSquare, Trash2 } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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
    pendingEmergencyRequests: 0,
    pendingLawyerApprovals: 0
  });
  const [auditLogs, setAuditLogs] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    if (activeTab === 'audit') fetchAuditLogs();
    if (activeTab === 'reviews') fetchReviews();
  }, [activeTab]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await api.get('admin/dashboard/stats');
      setStats(response.data);
    } catch (error) {
      console.error("Failed to fetch admin stats", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const response = await api.get('admin/audit-logs');
      setAuditLogs(response.data);
    } catch (error) {
      console.error("Failed to fetch audit logs", error);
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await api.get('admin/reviews');
      setReviews(response.data);
    } catch (error) {
      console.error("Failed to fetch reviews", error);
    }
  };

  const handleDeleteReview = async (id) => {
    if (!window.confirm("Are you sure you want to delete this review?")) return;
    try {
      await api.delete(`admin/reviews/${id}`);
      fetchReviews();
      alert("Review deleted.");
    } catch (error) {
      console.error(error);
      alert("Failed to delete review");
    }
  };

  const handleExportPDF = () => {
    window.open(`${api.defaults.baseURL}admin/report/pdf`, '_blank'); // We will create this endpoint in PDF step
  };

  const statCards = [
    { title: "Total Users", value: stats.totalUsers, icon: Users, color: "text-blue-500", bg: "bg-blue-100 dark:bg-blue-900/30" },
    { title: "Total Lawyers", value: stats.totalLawyers, icon: ShieldCheck, color: "text-purple-500", bg: "bg-purple-100 dark:bg-purple-900/30" },
    { title: "Appointments", value: stats.totalAppointments, icon: Calendar, color: "text-indigo-500", bg: "bg-indigo-100 dark:bg-indigo-900/30" },
    { title: "Revenue (INR)", value: `₹${(stats.totalRevenue || 0).toLocaleString()}`, icon: TrendingUp, color: "text-green-500", bg: "bg-green-100 dark:bg-green-900/30" },
    { title: "Emergencies", value: stats.pendingEmergencyRequests, icon: AlertTriangle, color: "text-red-500", bg: "bg-red-100 dark:bg-red-900/30" },
    { title: "Lawyer Approvals", value: stats.pendingLawyerApprovals, icon: FileText, color: "text-yellow-500", bg: "bg-yellow-100 dark:bg-yellow-900/30" },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto min-h-[calc(100vh-64px)] space-y-8">
      <div className="flex justify-between items-end mb-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Admin Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">System overview and analytics.</p>
        </div>
        <button onClick={handleExportPDF} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm">
          <Download size={18} /> Export PDF Report
        </button>
      </div>

      <div className="flex space-x-4 border-b border-gray-200 dark:border-gray-700 mb-6 pb-2">
        {['overview', 'audit', 'reviews'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium capitalize transition-colors rounded-t-lg ${activeTab === tab ? 'border-b-2 border-indigo-600 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            {tab.replace('-', ' ')}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
          
          {activeTab === 'overview' && (
            <div className="space-y-8">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                {statCards.map((card, idx) => (
                  <div key={idx} className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className={`w-10 h-10 rounded-xl mb-3 flex items-center justify-center ${card.bg} ${card.color}`}>
                      <card.icon size={20} />
                    </div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{card.title}</p>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {loading ? '...' : card.value}
                    </h3>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 h-96 flex flex-col">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Revenue Overview</h3>
                  <div className="flex-1 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={[ { name: 'Jan', revenue: 40000 }, { name: 'Feb', revenue: 30000 }, { name: 'Mar', revenue: 20000 }, { name: 'Apr', revenue: 27800 }, { name: 'May', revenue: 18900 }, { name: 'Jun', revenue: 23900 }, { name: 'Jul', revenue: stats.totalRevenue || 34900 } ]}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} />
                        <Tooltip cursor={{ stroke: '#f3f4f6', strokeWidth: 2 }} />
                        <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 h-96 flex flex-col">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">User Growth</h3>
                  <div className="flex-1 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[ { name: 'Jan', users: 400, lawyers: 24 }, { name: 'Feb', users: 300, lawyers: 13 }, { name: 'Mar', users: 200, lawyers: 98 }, { name: 'Apr', users: 278, lawyers: 39 }, { name: 'May', users: 189, lawyers: 48 }, { name: 'Jun', users: 239, lawyers: 38 }, { name: 'Jul', users: stats.totalUsers || 349, lawyers: stats.totalLawyers || 43 } ]}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} />
                        <Tooltip cursor={{ fill: '#f3f4f6' }} />
                        <Legend />
                        <Bar dataKey="users" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="lawyers" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                <h3 className="text-lg font-semibold flex items-center gap-2"><Activity size={20} className="text-indigo-500" /> Audit Logs</h3>
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
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                <h3 className="text-lg font-semibold flex items-center gap-2"><MessageSquare size={20} className="text-yellow-500" /> Manage Reviews</h3>
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
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default AdminDashboard;
