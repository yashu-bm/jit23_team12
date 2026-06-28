import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, FileText, Calendar, CreditCard, Download, TrendingUp } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../services/api';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalAppointments: 0,
    totalPayments: 0,
    totalDocuments: 0,
    totalRevenue: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('admin/dashboard/stats');
        setStats(response.data);
      } catch (error) {
        console.error("Failed to fetch admin stats", error);
        // Set mock data for visual purposes if backend is down
        setStats({
          totalUsers: 1450,
          totalAppointments: 320,
          totalPayments: 285,
          totalDocuments: 890,
          totalRevenue: 450000
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
  }, []);

  const statCards = [
    { title: "Total Users", value: stats.totalUsers, icon: Users, color: "text-blue-500", bg: "bg-blue-100 dark:bg-blue-900/30" },
    { title: "Total Appointments", value: stats.totalAppointments, icon: Calendar, color: "text-purple-500", bg: "bg-purple-100 dark:bg-purple-900/30" },
    { title: "Documents Analyzed", value: stats.totalDocuments, icon: FileText, color: "text-indigo-500", bg: "bg-indigo-100 dark:bg-indigo-900/30" },
    { title: "Total Revenue (INR)", value: `₹${(stats.totalRevenue || 0).toLocaleString()}`, icon: TrendingUp, color: "text-green-500", bg: "bg-green-100 dark:bg-green-900/30" },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto min-h-[calc(100vh-64px)]">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Admin Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">System overview and analytics.</p>
        </div>
        <button className="flex items-center gap-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-700 px-4 py-2 rounded-lg font-medium transition-colors shadow-sm">
          <Download size={18} /> Export PDF Report
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card, idx) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            key={idx} 
            className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{card.title}</p>
                <h3 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {loading ? '...' : card.value}
                </h3>
              </div>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${card.bg} ${card.color}`}>
                <card.icon size={24} />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-green-500 font-medium flex items-center"><TrendingUp size={14} className="mr-1"/> +12.5%</span>
              <span className="text-gray-400 ml-2">from last month</span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 h-96 flex flex-col">
          <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Revenue Overview</h3>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={[
                { name: 'Jan', revenue: 40000 },
                { name: 'Feb', revenue: 30000 },
                { name: 'Mar', revenue: 20000 },
                { name: 'Apr', revenue: 27800 },
                { name: 'May', revenue: 18900 },
                { name: 'Jun', revenue: 23900 },
                { name: 'Jul', revenue: 34900 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip cursor={{ stroke: '#f3f4f6', strokeWidth: 2 }} />
                <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* User Growth Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 h-96 flex flex-col">
          <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">User Growth</h3>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: 'Jan', users: 400, lawyers: 24 },
                { name: 'Feb', users: 300, lawyers: 13 },
                { name: 'Mar', users: 200, lawyers: 98 },
                { name: 'Apr', users: 278, lawyers: 39 },
                { name: 'May', users: 189, lawyers: 48 },
                { name: 'Jun', users: 239, lawyers: 38 },
                { name: 'Jul', users: 349, lawyers: 43 },
              ]}>
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
  );
};

export default AdminDashboard;
