import React, { useState } from 'react';
import { Upload, FileText, AlertTriangle, CheckCircle, Loader2, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import documentService from '../services/document.service';

/**
 * DocumentAnalysisDashboard
 *
 * Standalone "Quick Analyze" page.
 * Routes through the Spring Boot backend (/api/documents/upload)
 * so results are persisted in MySQL — same as the main Dashboard.
 * After analysis, the full report is fetched and displayed inline.
 */
const DocumentAnalysisDashboard = () => {
  const [file, setFile]           = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [report, setReport]       = useState(null);
  const [error, setError]         = useState('');

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setReport(null);
      setError('');
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setIsAnalyzing(true);
    setError('');
    setReport(null);

    try {
      // 1. Upload via Spring Boot -> MySQL (saves the document and Gemini report)
      const uploadRes = await documentService.uploadDocument(file);
      const doc = uploadRes.data;

      if (doc.status !== 'ANALYZED') {
        setError('Analysis did not complete. Status: ' + doc.status);
        setIsAnalyzing(false);
        return;
      }

      // 2. Fetch the saved RiskReport from MySQL
      const reportRes = await documentService.getRiskReport(doc.id);
      setReport(reportRes.data);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message ||
        'Failed to analyze document. Ensure the AI microservice is running.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getRiskColor = (risk) => {
    if (!risk) return 'bg-gray-100 text-gray-700';
    const r = risk.toLowerCase();
    if (r === 'high')   return 'bg-red-100    text-red-700';
    if (r === 'medium') return 'bg-yellow-100 text-yellow-700';
    return                     'bg-green-100  text-green-700';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto min-h-[calc(100vh-64px)]">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Quick AI Document Analysis</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Upload a legal document (PDF, JPG, PNG) for instant risk assessment. Results are saved to your account.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Section */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="text-xl font-semibold mb-4 dark:text-white">Upload Document</h2>

            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <input
                type="file"
                id="doc-upload"
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileChange}
              />
              <label htmlFor="doc-upload" className="cursor-pointer flex flex-col items-center">
                <Upload className="w-12 h-12 text-indigo-500 mb-3" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {file ? file.name : 'Click to browse or drag and drop'}
                </span>
                <span className="text-xs text-gray-500 mt-1">PDF, JPG, PNG up to 10MB</span>
              </label>
            </div>

            {error && (
              <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-700">
                <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              onClick={handleAnalyze}
              disabled={!file || isAnalyzing}
              className="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
              {isAnalyzing ? 'Analyzing with AI...' : 'Analyze Document'}
            </button>
          </div>
        </div>

        {/* Results Section */}
        <div className="lg:col-span-2">
          <AnimatePresence>
            {report && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6"
              >
                {/* File Name */}
                {report.document?.fileName && (
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-3">
                    <FileText className="text-indigo-500 flex-shrink-0" size={20} />
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-widest">File Name</p>
                      <p className="font-semibold text-gray-800 dark:text-gray-100">{report.document.fileName}</p>
                    </div>
                  </div>
                )}

                {/* Summary Card */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                  <div className="flex justify-between items-start mb-4">
                    <h2 className="text-xl font-semibold dark:text-white flex items-center gap-2">
                      <CheckCircle className="text-indigo-500" size={20} /> AI Summary &amp; Assessment
                    </h2>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(report.overallRiskScore)}`}>
                      {report.overallRiskScore} Risk
                    </span>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed text-sm">
                    {report.simpleSummary}
                  </p>
                </div>

                {/* Clauses Grid */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 dark:text-white flex items-center gap-2">
                    <AlertTriangle className="text-amber-500" size={18} />
                    Detected Risky Clauses
                    <span className="ml-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full text-xs font-bold text-gray-500">
                      {report.clauses?.length || 0}
                    </span>
                  </h3>
                  {report.clauses && report.clauses.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {report.clauses.map((clause, idx) => (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.07 }}
                          key={clause.id || idx}
                          className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm"
                        >
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className={`w-4 h-4 ${clause.riskLevel === 'High' ? 'text-red-500' : 'text-yellow-500'}`} />
                              <span className="font-semibold text-gray-900 dark:text-white text-sm">{clause.clauseType}</span>
                            </div>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${getRiskColor(clause.riskLevel)}`}>
                              {clause.riskLevel}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{clause.riskReason}</p>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-green-600 dark:text-green-400 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-800">
                      ✅ No significant risky clauses detected.
                    </p>
                  )}
                </div>

                {/* Extracted Text */}
                {report.document?.ocrText && (
                  <details className="group bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <summary className="cursor-pointer font-semibold text-gray-700 dark:text-gray-300 hover:text-indigo-600 flex items-center gap-2 select-none">
                      <Eye size={16} className="text-indigo-500" />
                      View Full Extracted Text
                    </summary>
                    <div className="mt-3 max-h-60 overflow-y-auto">
                      <pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed font-mono">
                        {report.document.ocrText}
                      </pre>
                    </div>
                  </details>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {!report && !isAnalyzing && (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400 bg-white/40 dark:bg-gray-800/40 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
              <FileText size={48} className="mb-4 text-gray-300" />
              <p className="text-sm">Upload a document to see the AI analysis here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentAnalysisDashboard;
