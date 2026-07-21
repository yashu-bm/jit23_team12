import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Trash, CheckCheck, Circle } from 'lucide-react';
import { useSelector } from 'react-redux';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

const NotificationBell = ({ lightText = false }) => {
  const { user } = useSelector((state) => state.auth);
  const token = user?.token;
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [stompClient, setStompClient] = useState(null);
  const navigate = useNavigate();

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch initial notifications
  useEffect(() => {
    if (!user || !token) return;

    fetchNotifications();
    fetchUnreadCount();

    // Initialize STOMP client for real-time notifications
    const socket = new SockJS('http://localhost:8080/ws');
    const client = new Client({
      webSocketFactory: () => socket,
      connectHeaders: {
        Authorization: `Bearer ${token}`
      },
      debug: (str) => {},
      onConnect: () => {
        client.subscribe(`/user/${user.id}/queue/notifications`, (msg) => {
          const newNotif = JSON.parse(msg.body);
          
          // Chat notification filtering logic
          if (newNotif.type === 'CHAT') {
            const isChatOpen = document.getElementById('real-time-chat-window');
            if (isChatOpen) {
              // Chat window is open, so simply mark the notification as read in the DB 
              // and do not show it in the bell.
              api.put(`notifications/${newNotif.id}/read`).catch(console.error);
              return;
            }
          }
          
          setNotifications(prev => {
            // Prevent duplicate notifications if polling already caught it
            if (prev.some(n => n.id === newNotif.id)) return prev;
            return [newNotif, ...prev];
          });
          setUnreadCount(prev => prev + 1);
        });
      },
      onStompError: (frame) => {
        console.error('Broker reported error: ' + frame.headers['message']);
      },
    });

    client.activate();
    setStompClient(client);

    // REST Polling Fallback
    const pollInterval = setInterval(() => {
      // Only poll if WebSocket is not connected
      if (!client.connected) {
        fetchNotifications();
        fetchUnreadCount();
      }
    }, 10000);

    return () => {
      if (client) client.deactivate();
      clearInterval(pollInterval);
    };
  }, [user, token]);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('notifications');
      setNotifications(res.data);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const res = await api.get('notifications/unread-count');
      setUnreadCount(res.data.unreadCount);
    } catch (err) {
      console.error('Failed to fetch unread count', err);
    }
  };

  const handleMarkAsRead = async (id, e) => {
    e.stopPropagation();
    try {
      await api.put(`notifications/${id}/read`);
      setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (err) {
      console.error('Failed to mark as read', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.put('notifications/read-all');
      setNotifications(notifications.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  const handleClearAll = async () => {
    try {
      await api.delete('notifications/clear');
      setNotifications([]);
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to clear notifications', err);
    }
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.read) {
      await handleMarkAsRead(notif.id, { stopPropagation: () => {} });
    }
    setIsOpen(false);
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-full transition-all focus:outline-none ${
          lightText 
            ? 'text-white hover:bg-white/20' 
            : 'text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-slate-800'
        }`}
      >
        <Bell size={22} className={unreadCount > 0 && !lightText ? "animate-pulse-soft text-primary-500" : (unreadCount > 0 ? "animate-pulse-soft text-white" : "")} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white border-2 border-white dark:border-slate-900 shadow-sm">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 md:w-96 bg-white/90 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-100/50 dark:border-slate-700/50 z-50 overflow-hidden flex flex-col transform transition-all opacity-100 scale-100 origin-top-right">
          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-gray-50 to-white dark:from-slate-800 dark:to-slate-900">
            <h3 className="font-bold text-gray-800 dark:text-gray-100 text-base">Notifications</h3>
            <div className="flex gap-2">
              <button 
                onClick={handleMarkAllAsRead}
                title="Mark all as read"
                className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <CheckCheck size={16} />
              </button>
              <button 
                onClick={handleClearAll}
                title="Clear all"
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <Trash size={16} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <Bell size={40} className="text-gray-300 dark:text-slate-600 mb-3" />
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">You're all caught up!</p>
                <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">No new notifications right now.</p>
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-gray-50 dark:divide-slate-800/50">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-4 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group relative ${!notif.read ? 'bg-primary-50/30 dark:bg-primary-900/10' : ''}`}
                  >
                    {!notif.read && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-500"></div>
                    )}
                    <div className="flex justify-between items-start mb-1">
                      <h4 className={`text-sm font-semibold truncate pr-4 ${!notif.read ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                        {notif.title}
                      </h4>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 whitespace-nowrap font-medium">
                        {formatTime(notif.createdAt)}
                      </span>
                    </div>
                    <p className={`text-xs line-clamp-2 ${!notif.read ? 'text-gray-600 dark:text-gray-300' : 'text-gray-500 dark:text-gray-400'}`}>
                      {notif.message}
                    </p>
                    
                    {!notif.read && (
                      <button 
                        onClick={(e) => handleMarkAsRead(notif.id, e)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1.5 text-primary-500 bg-white dark:bg-slate-800 shadow-sm border border-gray-100 dark:border-slate-700 rounded-full hover:bg-primary-50 transition-all"
                        title="Mark as read"
                      >
                        <Check size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className="px-4 py-2 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50 text-center">
            <span className="text-xs text-gray-400 font-medium">Notifications are end-to-end encrypted</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
