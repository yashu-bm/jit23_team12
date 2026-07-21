import React, { useState, useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Send, File as FileIcon, Paperclip, X, Image as ImageIcon, Download } from 'lucide-react';
import { useSelector } from 'react-redux';
import api from '../services/api';

const RealTimeChat = ({ selectedLawyerId, sessionId, targetUserName, targetUserProfileImage, onClose }) => {
  const { user, token } = useSelector(state => state.auth);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [stompClient, setStompClient] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const chatContainerRef = useRef(null);

  useEffect(() => {
    // Fetch chat history
    api.get(`chat/session/${sessionId}/messages`)
      .then(res => {
        setMessages(res.data);
        markAsRead();
      })
      .catch(err => console.error("Failed to fetch chat history", err));

    // Initialize STOMP client
    const socket = new SockJS('http://localhost:8080/ws');
    const client = new Client({
      webSocketFactory: () => socket,
      connectHeaders: {
        Authorization: `Bearer ${token}`
      },
      debug: (str) => console.log(str),
      onConnect: () => {
        // Subscribe to user's private queue
        client.subscribe(`/user/${user.id}/queue/messages`, (msg) => {
          const newMsg = JSON.parse(msg.body);
          if (newMsg.session.id === sessionId) {
            setMessages(prev => [...prev, newMsg]);
            markAsRead();
          }
        });
      },
      onStompError: (frame) => {
        console.error('Broker reported error: ' + frame.headers['message']);
        console.error('Additional details: ' + frame.body);
      },
    });

    client.activate();
    setStompClient(client);

    return () => {
      if (client) client.deactivate();
    };
  }, [user.id, sessionId]);

  const markAsRead = () => {
    api.put(`chat/session/${sessionId}/read`)
      .catch(err => console.error("Failed to mark messages as read", err));
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle Esc key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if ((!inputValue.trim() && !selectedFile) || !stompClient) return;

    if (selectedFile) {
      const fileExt = selectedFile.name.split('.').pop().toLowerCase();
      const isImage = ['jpg', 'jpeg', 'png'].includes(fileExt) || (selectedFile.type && selectedFile.type.startsWith('image/'));
      const formData = new FormData();
      formData.append("file", selectedFile);

      try {
        const res = await api.post('chat/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percent = Math.round((progressEvent.loaded / progressEvent.total) * 100);
              setUploadProgress(percent);
            }
          }
        });
        
        const fileUrl = res.data.fileUrl;
        const fileName = res.data.fileName;
        
        const chatMessageDto = {
          senderId: user.id,
          receiverId: selectedLawyerId,
          sessionId: sessionId,
          message: inputValue.trim() ? inputValue.trim() : (isImage ? "Shared an image" : "Shared a file"),
          messageType: isImage ? "IMAGE" : "FILE",
          fileUrl: fileUrl,
          fileName: fileName
        };

        stompClient.publish({
          destination: '/app/chat.send',
          body: JSON.stringify(chatMessageDto),
        });

        setSelectedFile(null);
        setUploadProgress(null);
        setInputValue('');
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (err) {
        console.error(err);
        setUploadProgress(null);
        alert(err.response?.data?.message || 'Upload failed. Network or server error.');
      }
    } else {
      const chatMessageDto = {
        senderId: user.id,
        receiverId: selectedLawyerId,
        sessionId: sessionId,
        message: inputValue.trim(),
        messageType: "TEXT"
      };

      stompClient.publish({
        destination: '/app/chat.send',
        body: JSON.stringify(chatMessageDto),
      });

      setInputValue('');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      alert("File size exceeds 10 MB limit.");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Validate type using extension
    const allowedExtensions = ['pdf', 'doc', 'docx', 'txt', 'png', 'jpg', 'jpeg'];
    const fileExtension = file.name.split('.').pop().toLowerCase();
    
    if (!allowedExtensions.includes(fileExtension)) {
      alert("Invalid file type. Only PDF, DOC, DOCX, TXT, PNG, JPG are allowed.");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setSelectedFile(file);
  };

  return (
    <div 
      id="real-time-chat-window"
      ref={chatContainerRef} 
      className="flex flex-col h-[550px] md:h-[600px] w-full bg-slate-50 dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-gray-200/60 dark:border-slate-700/60 overflow-hidden relative"
    >
      {/* WhatsApp-style Background Pattern */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/cubes.png")' }}></div>

      {/* Chat Header */}
      <div className="px-6 py-4 border-b border-gray-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md flex items-center justify-between z-10 shadow-sm relative">
        <div className="flex items-center gap-4">
          <div className="relative group/chat-avatar">
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-500 to-primary-500 text-white flex items-center justify-center font-bold text-xl shadow-md overflow-hidden border-2 border-white">
              {targetUserProfileImage ? (
                <img src={targetUserProfileImage} alt={targetUserName} className="w-full h-full object-cover" />
              ) : (
                targetUserName ? targetUserName.charAt(0) : '💬'
              )}
            </div>
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full shadow-sm animate-pulse-soft"></span>
          </div>
          <div>
            <h3 className="font-extrabold text-gray-900 dark:text-white text-lg leading-tight">
              {targetUserName || 'Secure Chat Session'}
            </h3>
            <p className="text-xs text-green-600 dark:text-green-400 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span> Online & Encrypted
            </p>
          </div>
        </div>
        
        {onClose && (
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
            title="Close Chat (Esc)"
          >
            <X size={24} />
          </button>
        )}
      </div>
      
      {/* Chat Messages Area */}
      <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-4 z-10 custom-scrollbar">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm p-4 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 mb-4 inline-block">
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">This chat is secure and encrypted.</p>
              <p className="text-xs text-gray-400 mt-1">Start your consultation by sending a message.</p>
            </div>
          </div>
        )}
        
        {messages.map((msg, idx) => {
          const isMe = msg.sender.id === user.id;
          return (
            <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-fade-in`}>
              <div className={`max-w-[85%] md:max-w-[75%] px-4 py-3 rounded-2xl shadow-sm ${
                isMe 
                  ? 'bg-gradient-to-br from-primary-500 to-indigo-600 text-white rounded-br-sm' 
                  : 'bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-100 rounded-bl-sm border border-gray-100 dark:border-slate-700/50'
              }`}>
                {msg.messageType === 'TEXT' && (
                  <p className="text-[15px] leading-relaxed break-words">{msg.message}</p>
                )}
                {msg.messageType === 'IMAGE' && (
                  <div className="flex flex-col gap-2">
                    <a href={msg.fileUrl} download={msg.fileName} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-xl border border-white/20">
                      <img src={msg.fileUrl} alt={msg.fileName} className="max-w-full h-auto max-h-64 object-cover hover:opacity-90 transition-opacity" />
                    </a>
                    {msg.message !== "Shared an image" && <p className="text-[15px] leading-relaxed break-words mt-1">{msg.message}</p>}
                    <p className="text-xs opacity-80 truncate">{msg.fileName}</p>
                  </div>
                )}
                {msg.messageType === 'FILE' && (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3 bg-black/10 dark:bg-white/5 p-3 rounded-xl border border-black/5 dark:border-white/10">
                      <div className="p-2 bg-white/20 rounded-lg shrink-0">
                        <FileIcon size={24} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{msg.fileName}</p>
                        <p className="text-[10px] opacity-70">Document</p>
                      </div>
                      <a href={msg.fileUrl} download={msg.fileName} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-white/20 rounded-lg transition-colors shrink-0" title="Download">
                        <Download size={18} />
                      </a>
                    </div>
                    {msg.message !== "Shared a file" && <p className="text-[15px] leading-relaxed break-words mt-1">{msg.message}</p>}
                  </div>
                )}
                <div className={`text-[10px] font-medium mt-1.5 flex items-center justify-end gap-1 ${isMe ? 'text-primary-100' : 'text-gray-400'}`}>
                  {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  {isMe && <span className="text-blue-300">✓✓</span>}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} className="h-1" />
      </div>

      {/* Input Area */}
      <div className="px-4 py-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-t border-gray-200/80 dark:border-slate-700/80 z-10 flex flex-col">
        
        {/* File Preview before upload */}
        {selectedFile && (
          <div className="mb-3 p-3 bg-primary-50 dark:bg-slate-700/50 rounded-xl border border-primary-100 dark:border-slate-600 flex items-center justify-between mx-auto max-w-4xl w-full">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="p-2 bg-primary-100 dark:bg-slate-600 rounded-lg text-primary-600 dark:text-primary-400">
                {['jpg', 'jpeg', 'png'].includes(selectedFile.name.split('.').pop().toLowerCase()) || (selectedFile.type && selectedFile.type.startsWith('image/')) ? <ImageIcon size={20} /> : <FileIcon size={20} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{selectedFile.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{formatFileSize(selectedFile.size)}</p>
              </div>
            </div>
            <button 
              onClick={() => {
                setSelectedFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors"
              title="Remove attachment"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {uploadProgress !== null && (
          <div className="mb-3 flex items-center gap-3 px-2 mx-auto max-w-4xl w-full">
            <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-1.5">
              <div className="bg-primary-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
            </div>
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{uploadProgress}%</span>
          </div>
        )}

        <form onSubmit={sendMessage} className="flex items-end gap-3 max-w-4xl w-full mx-auto relative">
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg" 
          />
          
          <button 
            type="button" 
            onClick={() => fileInputRef.current?.click()}
            className="p-3 text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-xl transition-colors mb-0.5 shadow-sm bg-gray-50 dark:bg-slate-700 border border-gray-100 dark:border-slate-600"
            title="Attach File (Max 10MB)"
          >
            <Paperclip size={20} />
          </button>
          
          <div className="flex-1 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-inner focus-within:ring-2 focus-within:ring-primary-500/50 focus-within:border-primary-500 transition-all overflow-hidden flex items-center">
            <input 
              type="text" 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={selectedFile ? "Add an optional message..." : "Type your message securely..."} 
              className="w-full bg-transparent px-4 py-3.5 focus:outline-none dark:text-white text-[15px]"
            />
          </div>
          
          <button 
            type="submit" 
            disabled={(!inputValue.trim() && !selectedFile) || uploadProgress !== null} 
            className="p-3.5 bg-primary-600 text-white rounded-2xl hover:bg-primary-700 disabled:opacity-50 disabled:hover:bg-primary-600 transition-all shadow-md hover:shadow-lg hover:shadow-primary-500/30 mb-0.5 flex items-center justify-center"
          >
            <Send size={20} className={(inputValue.trim() || selectedFile) ? 'translate-x-0.5' : ''} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default RealTimeChat;
