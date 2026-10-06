import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Phone, Mail, Lock, Camera, Save, ArrowLeft } from 'lucide-react';
import axios from 'axios';
import api from '../services/api';
import { useDispatch } from 'react-redux';
import { loginSuccess } from '../redux/authSlice';

const Profile = () => {
  const dispatch = useDispatch();
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    profileImageUrl: ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = () => {
    api.get('users/profile')
      .then(res => {
        setProfile({
          firstName: res.data.firstName || '',
          lastName: res.data.lastName || '',
          phone: res.data.phone || '',
          email: res.data.email || '',
          profileImageUrl: res.data.profileImageUrl || ''
        });
      })
      .catch(err => console.error(err));
  };

  const handleProfileChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await api.put('users/profile', {
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone
      });
      setMessage('Profile updated successfully!');
      // Update local storage user name
      const storedUser = JSON.parse(localStorage.getItem('user'));
      if (storedUser) {
        storedUser.firstName = res.data.firstName;
        storedUser.lastName = res.data.lastName;
        localStorage.setItem('user', JSON.stringify(storedUser));
        dispatch(loginSuccess(storedUser));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordMessage('');
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    try {
      const res = await api.post('users/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      setPasswordMessage(res.data.message);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Failed to change password. Make sure current password is correct.');
    }
  };

  const handlePhotoUpload = async (e) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);

    try {
      const cacheBuster = `?t=${new Date().getTime()}`;
      const res = await api.post('users/profile/photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setProfile({ ...profile, profileImageUrl: res.data.profileImageUrl + cacheBuster });
      alert('Profile photo updated successfully!');
      
      // Update Redux state and local storage so the new photo is visible globally
      const storedUser = JSON.parse(localStorage.getItem('user'));
      if (storedUser) {
        storedUser.profileImageUrl = res.data.profileImageUrl;
        localStorage.setItem('user', JSON.stringify(storedUser));
        dispatch(loginSuccess(storedUser));
      }
    } catch (err) {
      alert('Failed to upload photo: ' + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8 min-h-screen">
      {/* Header */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-900 via-slate-800 to-primary-950 text-white p-10 md:p-12 shadow-2xl animate-fade-in border border-slate-700">
        <div className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none">
          <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[150%] bg-gradient-to-r from-brand-indigo to-transparent blur-[120px] rounded-full mix-blend-overlay"></div>
        </div>
        
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="flex items-center gap-5">
            <button 
              onClick={() => window.history.back()} 
              className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl backdrop-blur-md transition-colors text-white shadow-sm border border-white/10"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">
                Account <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-primary-400">Settings</span>
              </h1>
              <p className="text-slate-300 text-sm md:text-base font-medium opacity-90 max-w-xl">Manage your personal information, profile photo, and security settings.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Photo Upload & Summary */}
        <div className="lg:col-span-1">
          <div className="glass-card rounded-[2rem] p-8 flex flex-col items-center justify-center text-center shadow-lg border border-gray-100 dark:border-slate-700/50 sticky top-6">
            <div className="relative group mb-6">
              <div className="relative w-36 h-36 rounded-[2rem] overflow-hidden border-4 border-white dark:border-slate-800 shadow-xl flex items-center justify-center bg-gradient-to-br from-indigo-100 to-primary-100 dark:from-indigo-900/40 dark:to-primary-900/40 text-primary-600 dark:text-primary-400 text-5xl font-extrabold group-hover:scale-105 transition-transform duration-300">
                <span>{profile.firstName ? profile.firstName.charAt(0) : 'P'}</span>
                {profile.profileImageUrl && (
                  <img 
                    src={profile.profileImageUrl} 
                    alt="Profile" 
                    className="absolute inset-0 w-full h-full object-cover" 
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                )}
              </div>
              <label className="absolute -bottom-3 -right-3 bg-gradient-to-r from-primary-500 to-indigo-600 text-white p-3 rounded-2xl cursor-pointer hover:shadow-lg hover:shadow-primary-500/30 transition-all border-4 border-white dark:border-slate-800 z-10 hover:scale-110">
                <Camera size={20} />
                <input type="file" onChange={handlePhotoUpload} accept="image/*" className="hidden" />
              </label>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{profile.firstName} {profile.lastName}</h2>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1.5 bg-gray-100 dark:bg-slate-700/50 px-3 py-1.5 rounded-lg">
                <Mail size={14} className="text-primary-500"/> {profile.email}
              </p>
            </div>
          </div>
        </div>

        {/* Profile Settings */}
        <div className="lg:col-span-2 space-y-8">
          <div className="glass-panel rounded-[2.5rem] p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-primary-100 dark:bg-primary-900/30 text-primary-600 rounded-2xl">
                <User size={24} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Personal Information</h2>
            </div>
            
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">First Name</label>
                  <input
                    type="text"
                    name="firstName"
                    value={profile.firstName}
                    onChange={handleProfileChange}
                    required
                    className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl p-4 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 outline-none dark:text-white font-medium transition-all shadow-inner"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Last Name</label>
                  <input
                    type="text"
                    name="lastName"
                    value={profile.lastName}
                    onChange={handleProfileChange}
                    required
                    className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl p-4 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 outline-none dark:text-white font-medium transition-all shadow-inner"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    value={profile.email}
                    disabled
                    className="w-full bg-gray-100/80 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-2xl pl-12 pr-4 py-4 text-gray-500 cursor-not-allowed outline-none font-medium shadow-inner opacity-70"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Phone Number</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    name="phone"
                    value={profile.phone}
                    onChange={handleProfileChange}
                    placeholder="9999999999"
                    className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl pl-12 pr-4 py-4 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 outline-none dark:text-white font-medium transition-all shadow-inner"
                  />
                </div>
              </div>

              {error && <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm font-semibold border border-red-100 dark:border-red-800/50">{error}</div>}
              {message && <div className="p-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-xl text-sm font-semibold border border-green-100 dark:border-green-800/50">{message}</div>}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-premium w-full sm:w-auto px-8 py-3.5 flex items-center justify-center gap-2"
                >
                  <Save size={20} /> {loading ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>

          {/* Change Password */}
          <div className="glass-panel rounded-[2.5rem] p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-2xl">
                <Lock size={24} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Security Settings</h2>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Current Password</label>
                <input
                  type="password"
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  required
                  placeholder="••••••••"
                  className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl p-4 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none dark:text-white font-medium transition-all shadow-inner"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">New Password</label>
                  <input
                    type="password"
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    required
                    placeholder="••••••••"
                    className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl p-4 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none dark:text-white font-medium transition-all shadow-inner"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Confirm New Password</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    required
                    placeholder="••••••••"
                    className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl p-4 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none dark:text-white font-medium transition-all shadow-inner"
                  />
                </div>
              </div>

              {passwordError && <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm font-semibold border border-red-100 dark:border-red-800/50">{passwordError}</div>}
              {passwordMessage && <div className="p-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-xl text-sm font-semibold border border-green-100 dark:border-green-800/50">{passwordMessage}</div>}

              <div className="pt-2">
                <button
                  type="submit"
                  className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3.5 rounded-2xl font-bold transition-all shadow-lg hover:shadow-indigo-500/30 hover:-translate-y-0.5 w-full sm:w-auto"
                >
                  <Lock size={20} /> Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
