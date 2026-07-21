import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, AlertTriangle, CheckCircle, X, MessageSquare, Download,
  Send, Bot, User, Clock, Info, AlertCircle, RefreshCw
} from 'lucide-react';
import api from '../services/api';

export default function DocumentReport({ report, onClose }) {
  const [activeTab, setActiveTab] = useState('analysis'); // 'analysis' or 'chat'
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  if (!report) return null;

  const getRiskColor = (risk) => {
    if (!risk) return 'bg-gray-100 text-gray-700';
    const r = risk.toLowerCase();
    if (r === 'high') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
    if (r === 'medium') return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
    return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
  };

  const getClauseColor = (risk) => {
    if (!risk) return { bg: 'bg-gray-50 dark:bg-gray-800', border: 'border-gray-200 dark:border-gray-700' };
    const r = risk.toLowerCase();
    if (r === 'high' || r === 'high risk') return { bg: 'bg-red-50 dark:bg-red-900/10', border: 'border-red-200 dark:border-red-800' };
    if (r === 'medium' || r === 'needs attention') return { bg: 'bg-yellow-50 dark:bg-yellow-900/10', border: 'border-yellow-200 dark:border-yellow-800' };
    return { bg: 'bg-green-50 dark:bg-green-900/10', border: 'border-green-200 dark:border-green-800' };
  };

  const handleDownloadPdf = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      const response = await api.get(`documents/${report.document.id}/download`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `RiskReport_${report.document.fileName}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Failed to download PDF report. " + err.message);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = { sender: 'user', text: chatInput };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput('');
    setIsTyping(true);

    try {
      const res = await api.post(`documents/${report.document.id}/chat`, { question: userMsg.text });
      setChatMessages((prev) => [...prev, { sender: 'ai', text: res.data.answer }]);
    } catch (err) {
      setChatMessages((prev) => [...prev, { sender: 'ai', text: "Error: Could not connect to AI service. " + (err.response?.data?.message || err.message) }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="bg-white dark:bg-slate-900 w-full max-w-6xl h-[90vh] sm:h-[85vh] rounded-[2rem] shadow-2xl flex flex-col md:flex-row overflow-hidden border border-gray-200 dark:border-gray-800"
        onClick={e => e.stopPropagation()}
      >
        {/* Left Side: Analysis Report */}
        <div className={`flex-1 flex flex-col h-full border-r border-gray-100 dark:border-gray-800 transition-all ${activeTab === 'chat' && window.innerWidth < 768 ? 'hidden' : 'block'}`}>
          <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/30">
            <div>
              <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                <FileText className="text-primary-500" /> Document Analysis
              </h2>
              <p className="text-sm text-gray-500 font-medium flex items-center gap-2 mt-1">
                {report.document?.fileName}
                <span className="text-gray-300 dark:text-gray-600">•</span>
                <Clock size={12} /> {report.createdAt ? new Date(report.createdAt).toLocaleString() : ''}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={handleDownloadPdf} disabled={isDownloading} className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 rounded-xl font-medium transition hover:bg-indigo-100 disabled:opacity-50">
                {isDownloading ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
                <span className="hidden sm:inline">Download PDF</span>
              </button>
              <button onClick={() => setActiveTab('chat')} className="md:hidden p-2 bg-primary-100 text-primary-700 rounded-xl">
                <MessageSquare size={20} />
              </button>
              <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-200 transition">
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            
            {/* Top Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-semibold mb-1">Overall Risk Level</p>
                  <span className={`px-3 py-1 rounded-full text-sm font-bold flex items-center w-fit gap-1 ${getRiskColor(report.overallRiskScore)}`}>
                    {report.overallRiskScore === 'High' ? <AlertTriangle size={14}/> : <CheckCircle size={14}/>} 
                    {report.overallRiskScore}
                  </span>
                </div>
              </div>
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-semibold mb-1">AI Confidence</p>
                  <span className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400">
                    {report.confidenceScore ? (parseFloat(report.confidenceScore) * 100).toFixed(0) + '%' : '90%'}
                  </span>
                </div>
              </div>
            </div>

            {/* Simple Summary */}
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Info size={18} className="text-blue-500"/> Document Summary
              </h3>
              <div className="p-5 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/30 text-gray-700 dark:text-gray-300 leading-relaxed">
                {report.simpleSummary || "No summary provided."}
              </div>
            </div>

            {/* Recommendations & Missing Clauses */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <CheckCircle size={18} className="text-green-500"/> Recommendations
                </h3>
                <div className="p-5 bg-green-50/50 dark:bg-green-900/10 rounded-2xl border border-green-100 dark:border-green-900/30 text-gray-700 dark:text-gray-300 text-sm leading-relaxed min-h-[120px]">
                  {report.recommendations || "No specific recommendations."}
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <AlertCircle size={18} className="text-amber-500"/> Missing Clauses
                </h3>
                <div className="p-5 bg-amber-50/50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/30 text-gray-700 dark:text-gray-300 text-sm leading-relaxed min-h-[120px]">
                  {report.missingClauses || "No critical clauses appear missing."}
                </div>
              </div>
            </div>

            {/* Clause Analysis */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <FileText size={18} className="text-primary-500"/> Clause Analysis
              </h3>
              {report.clauses && report.clauses.length > 0 ? (
                <div className="space-y-3">
                  {report.clauses.map((clause, idx) => {
                    const colors = getClauseColor(clause.riskLevel);
                    return (
                      <div key={idx} className={`p-4 rounded-2xl border ${colors.border} ${colors.bg}`}>
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-bold text-gray-900 dark:text-white">{clause.clauseType}</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${getRiskColor(clause.riskLevel)}`}>
                            {clause.riskLevel}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 font-medium">
                          {clause.riskReason}
                        </p>
                        {clause.clauseText && (
                          <div className="mt-3 p-3 bg-white/50 dark:bg-black/20 rounded-xl text-xs text-gray-500 font-mono italic">
                            "{clause.clauseText}"
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500 italic">No specific clauses highlighted.</p>
              )}
            </div>

          </div>
        </div>

        {/* Right Side: Chat Interface */}
        <div className={`w-full md:w-[400px] flex flex-col bg-gray-50 dark:bg-slate-900/50 h-full ${activeTab === 'analysis' && window.innerWidth < 768 ? 'hidden' : 'flex'}`}>
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-slate-900">
            <h3 className="font-bold flex items-center gap-2">
              <Bot className="text-primary-500" /> Chat with Document
            </h3>
            <button onClick={() => setActiveTab('analysis')} className="md:hidden p-2 bg-gray-100 text-gray-600 rounded-lg">
              <FileText size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center shrink-0">
                <Bot size={16} />
              </div>
              <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-gray-700 p-3 rounded-2xl rounded-tl-none shadow-sm text-sm">
                Hi! I've analyzed <strong>{report.document?.fileName}</strong>. Ask me any questions about its contents, risks, or clauses!
              </div>
            </div>

            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`flex gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.sender === 'user' ? 'bg-indigo-600 text-white' : 'bg-primary-100 text-primary-600'}`}>
                  {msg.sender === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div className={`p-3 rounded-2xl shadow-sm text-sm whitespace-pre-wrap max-w-[85%] ${
                  msg.sender === 'user' 
                  ? 'bg-indigo-600 text-white rounded-tr-none' 
                  : 'bg-white dark:bg-slate-800 border border-gray-100 dark:border-gray-700 rounded-tl-none text-gray-800 dark:text-gray-200'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center shrink-0">
                  <Bot size={16} />
                </div>
                <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-gray-700 p-3 rounded-2xl rounded-tl-none shadow-sm flex gap-1 items-center">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="p-4 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-gray-800 flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask about this document..."
              className="flex-1 px-4 py-2 bg-gray-100 dark:bg-slate-800 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              disabled={isTyping}
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || isTyping}
              className="w-10 h-10 bg-primary-600 text-white rounded-full flex items-center justify-center disabled:opacity-50 transition hover:bg-primary-700 shrink-0 shadow-lg hover:shadow-primary-500/30"
            >
              <Send size={16} className="ml-1" />
            </button>
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
}
