import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, Save, Printer } from 'lucide-react';

import api from '../services/api';

const noticeTemplates = {
  consumer: "Notice under Consumer Protection Act, 2019\n\nTo,\n[Company Name/Defaulter]\n[Address]\n\nSubject: Legal Notice for deficiency in services / defective goods.\n\nDear Sir/Madam,\n\nUnder the instructions from my client [Client Name], I am serving you with the following notice...",
  property: "Legal Notice for Property Dispute\n\nTo,\n[Name]\n[Address]\n\nSubject: Legal Notice regarding property at [Address of Property]\n\nSir,\n\nUnder instructions from and on behalf of my client...",
  rental: "Notice for Eviction of Tenant\n\nTo,\n[Tenant Name]\n[Address]\n\nSubject: Notice to vacate the premises.\n\nSir,\n\nUnder instructions from my client, the landlord..."
};

const NoticeGenerator = () => {
  const [selectedTemplate, setSelectedTemplate] = useState('consumer');
  const [noticeContent, setNoticeContent] = useState(noticeTemplates['consumer']);
  const [title, setTitle] = useState("Consumer Complaint Notice");
  const [recipientName, setRecipientName] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleTemplateChange = (e) => {
    const val = e.target.value;
    setSelectedTemplate(val);
    setNoticeContent(noticeTemplates[val] || "");
    setTitle(e.target.options[e.target.selectedIndex].text);
  };

  const handleDownload = () => {
    // In a real app, this might send to backend to generate a clean PDF using iText
    // Here we create a simple text blob download
    const element = document.createElement("a");
    const file = new Blob([noticeContent], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${title.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(element); // Required for this to work in FireFox
    element.click();
  };

  const handleSave = async () => {
    if (!recipientName || !recipientAddress) {
      alert("Please provide Recipient Name and Address.");
      return;
    }
    
    setIsSaving(true);
    try {
      await api.post('notices/generate', {
        noticeType: selectedTemplate,
        title: title,
        content: noticeContent,
        recipientName: recipientName,
        recipientAddress: recipientAddress
      });
      alert("Notice saved to your drafts successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to save notice.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto min-h-[calc(100vh-64px)] flex flex-col md:flex-row gap-6">
      
      {/* Sidebar Controls */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-full md:w-1/3 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 h-fit"
      >
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Notice Generator</h2>
        
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select Template</label>
            <select 
              value={selectedTemplate} 
              onChange={handleTemplateChange}
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-3 text-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="consumer">Consumer Complaint</option>
              <option value="property">Property Dispute</option>
              <option value="rental">Rental Dispute / Eviction</option>
              <option value="employment">Employment Issue</option>
              <option value="cybercrime">Cybercrime Complaint</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Document Title</label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-3 text-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Recipient Name</label>
            <input 
              type="text" 
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder="e.g. Acme Corp"
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-3 text-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Recipient Address</label>
            <textarea 
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              placeholder="Full Address"
              rows="2"
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-3 text-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
            />
          </div>

          <div className="pt-4 space-y-3 border-t border-gray-200 dark:border-gray-700">
            <button 
              onClick={handleDownload}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-lg transition-colors"
            >
              <Download size={18} /> Download Notice
            </button>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="w-full flex items-center justify-center gap-2 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-600 font-medium py-3 rounded-lg transition-colors disabled:opacity-50"
            >
              <Save size={18} /> {isSaving ? 'Saving...' : 'Save as Draft'}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Editor Area */}
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-full md:w-2/3 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col h-[700px]"
      >
        <div className="flex justify-between items-center mb-4 border-b border-gray-200 dark:border-gray-700 pb-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
            <FileText className="text-indigo-500" />
            Editor Preview
          </h3>
          <button className="text-gray-500 hover:text-indigo-600 transition-colors">
            <Printer size={20} />
          </button>
        </div>
        
        <textarea 
          className="flex-1 w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none font-serif leading-relaxed custom-scrollbar"
          value={noticeContent}
          onChange={(e) => setNoticeContent(e.target.value)}
        />
      </motion.div>
    </div>
  );
};

export default NoticeGenerator;
