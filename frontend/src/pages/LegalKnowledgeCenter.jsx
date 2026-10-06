import React, { useState } from 'react';
import { BookOpen, Search, FileText, HelpCircle, Download, FileJson } from 'lucide-react';
import { motion } from 'framer-motion';

const defaultContent = {
  faqs: [
    { question: "What is the difference between civil and criminal law?", answer: "Civil law deals with disputes between individuals or organizations, while criminal law deals with behavior that is considered an offense against the public, society, or state." },
    { question: "How much does a lawyer typically charge?", answer: "Lawyer fees vary widely based on experience, location, and the complexity of the case. Many charge hourly rates, while others offer flat fees for specific services." },
    { question: "What should I do if I am arrested?", answer: "Remain silent and ask for an attorney immediately. Do not answer any questions from law enforcement without your lawyer present." }
  ],
  templates: [
    { name: "Non-Disclosure Agreement (NDA)", description: "Standard template for protecting confidential information.", format: "PDF", size: "120 KB" },
    { name: "Rental Lease Agreement", description: "Basic residential lease agreement for landlords and tenants.", format: "DOCX", size: "45 KB" },
    { name: "Last Will and Testament", description: "Simple will template for individuals.", format: "PDF", size: "150 KB" }
  ],
  guides: [
    { title: "Starting a Business: Legal Checklist", category: "Corporate Law", readTime: "5 min read" },
    { title: "Understanding Your Rights as a Tenant", category: "Real Estate", readTime: "8 min read" },
    { title: "Navigating Divorce Proceedings", category: "Family Law", readTime: "12 min read" }
  ]
};

export default function LegalKnowledgeCenter() {
  const [activeTab, setActiveTab] = useState('faqs');
  const [searchQuery, setSearchQuery] = useState('');
  const [content, setContent] = useState(defaultContent);

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  const filteredFaqs = content.faqs.filter(faq => 
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto min-h-[calc(100vh-64px)] space-y-8">
      <div className="text-center space-y-4 mb-10">
        <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <BookOpen size={32} />
        </div>
        <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white">Legal Knowledge Center</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Explore our comprehensive library of legal resources, FAQs, and document templates.
        </p>
        
        <div className="max-w-xl mx-auto relative mt-6">
          <input 
            type="text" 
            placeholder="Search FAQs, guides, and templates..." 
            value={searchQuery}
            onChange={handleSearch}
            className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl py-4 pl-12 pr-4 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-white"
          />
          <Search className="absolute left-4 top-4 text-gray-400" size={20} />
        </div>
      </div>

      <div className="flex space-x-4 border-b border-gray-200 dark:border-gray-700 mb-6 pb-2 justify-center">
        {['faqs', 'guides', 'templates'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 font-semibold capitalize transition-all rounded-t-lg ${activeTab === tab ? 'border-b-2 border-indigo-600 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            {tab.replace('-', ' ')}
          </button>
        ))}
      </div>

      <div className="max-w-4xl mx-auto">
        {activeTab === 'faqs' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {filteredFaqs.length > 0 ? filteredFaqs.map((faq, idx) => (
              <div key={idx} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <h3 className="text-lg font-bold flex items-start gap-3 mb-2">
                  <HelpCircle className="text-indigo-500 shrink-0 mt-0.5" size={20} />
                  {faq.question}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 pl-8">{faq.answer}</p>
              </div>
            )) : (
              <p className="text-center text-gray-500 py-8">No FAQs found matching your search.</p>
            )}
          </motion.div>
        )}

        {activeTab === 'guides' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid md:grid-cols-2 gap-6">
            {content.guides.filter(g => g.title.toLowerCase().includes(searchQuery.toLowerCase())).map((guide, idx) => (
              <div key={idx} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer">
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-1 rounded-lg mb-3 inline-block">{guide.category}</span>
                <h3 className="text-lg font-bold mb-2">{guide.title}</h3>
                <div className="flex justify-between items-center mt-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1"><BookOpen size={14}/> Read Guide</span>
                  <span>{guide.readTime}</span>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {activeTab === 'templates' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {content.templates.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase())).map((template, idx) => (
              <div key={idx} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-center group">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center text-gray-500 shrink-0">
                    <FileJson size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold mb-1">{template.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{template.description}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="text-xs font-medium text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{template.format} • {template.size}</span>
                  <button className="flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-medium text-sm bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                    <Download size={16} /> Download
                  </button>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
