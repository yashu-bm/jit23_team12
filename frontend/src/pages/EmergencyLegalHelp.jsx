import React from 'react';
import { AlertTriangle, Phone, ShieldAlert, FileText, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function EmergencyLegalHelp() {
  const navigate = useNavigate();

  const handleEmergencyBooking = () => {
    navigate('/lawyers?emergency=true');
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 min-h-screen">
      
      {/* Disclaimer Alert */}
      <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-xl flex items-start gap-4">
        <AlertTriangle className="text-red-500 shrink-0 mt-0.5" />
        <div>
          <h3 className="text-red-800 dark:text-red-400 font-bold mb-1">Important Disclaimer</h3>
          <p className="text-sm text-red-700 dark:text-red-300">
            This information is for general guidance only and is not a substitute for professional legal advice. 
            If you are in immediate physical danger, please contact local emergency services immediately (e.g., 100 for Police, 112 for National Emergency).
          </p>
        </div>
      </div>

      <div className="text-center space-y-4">
        <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldAlert size={40} />
        </div>
        <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">Emergency Legal Assistance</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          When time is critical, we prioritize your legal needs. Our emergency request system ensures you get connected with an available advocate as soon as possible.
        </p>
        
        <button 
          onClick={handleEmergencyBooking}
          className="mt-8 inline-flex items-center gap-2 px-8 py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-red-500/30 transition-all transform hover:-translate-y-1"
        >
          <AlertTriangle size={20} /> Request Emergency Lawyer
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mt-12">
        <div className="glass-panel p-6 rounded-3xl border-t-4 border-t-red-500">
          <h3 className="text-xl font-bold flex items-center gap-2 mb-4"><Phone className="text-red-500"/> Direct Helplines</h3>
          <ul className="space-y-4">
            <li className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <span className="font-medium">National Emergency</span>
              <span className="font-bold text-red-600 dark:text-red-400">112</span>
            </li>
            <li className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <span className="font-medium">Police</span>
              <span className="font-bold text-red-600 dark:text-red-400">100</span>
            </li>
            <li className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <span className="font-medium">Women's Helpline</span>
              <span className="font-bold text-red-600 dark:text-red-400">1091</span>
            </li>
          </ul>
        </div>
        
        <div className="glass-panel p-6 rounded-3xl border-t-4 border-t-indigo-500">
          <h3 className="text-xl font-bold flex items-center gap-2 mb-4"><FileText className="text-indigo-500"/> Immediate Steps to Take</h3>
          <ul className="space-y-3">
            <li className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
              <ChevronRight className="text-indigo-500 shrink-0 mt-0.5" size={16}/>
              Do not sign any documents without legal representation.
            </li>
            <li className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
              <ChevronRight className="text-indigo-500 shrink-0 mt-0.5" size={16}/>
              Exercise your right to remain silent until your lawyer is present.
            </li>
            <li className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
              <ChevronRight className="text-indigo-500 shrink-0 mt-0.5" size={16}/>
              Preserve all evidence (messages, emails, physical items) related to the incident.
            </li>
            <li className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
              <ChevronRight className="text-indigo-500 shrink-0 mt-0.5" size={16}/>
              Note down details of all parties and witnesses involved.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
