import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Upload, FileText, AlertTriangle, CheckCircle, ChevronRight,
  File as FileIcon, Calendar, CreditCard, User, Trash2, Download,
  Star, Clock, DollarSign, X, Settings, RefreshCw, Eye, LogOut
} from 'lucide-react';
import { logout } from '../redux/authSlice';
import { motion, AnimatePresence } from 'framer-motion';
import documentService from '../services/document.service';
import api from '../services/api';
import ReviewModal from '../components/ReviewModal';

const TABS = ['Documents', 'Appointments', 'Payments', 'Profile'];

export default function Dashboard() {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login', { replace: true });
  };

  const [activeTab, setActiveTab] = useState('Documents');
  const [documents, setDocuments] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [activeReport, setActiveReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  const [appointments, setAppointments] = useState([]);
  const [payments, setPayments] = useState([]);
  const [profile, setProfile] = useState(null);

  const [reviewTarget, setReviewTarget] = useState(null);

  useEffect(() => {
    loadDocuments();
    loadAppointments();
    loadPayments();
    loadProfile();
  }, []);

  const loadDocuments = () => {
    documentService.getDocuments()
      .then(res => setDocuments(res.data))
      .catch(err => console.error('Failed to load documents:', err));
  };

  const loadAppointments = () => {
    api.get('appointments/my')
      .then(res => setAppointments(res.data))
      .catch(err => console.error('Failed to load appointments:', err));
  };

  const loadPayments = () => {
    api.get('payments/my')
      .then(res => setPayments(res.data))
      .catch(err => console.error('Failed to load payments:', err));
  };

  const loadProfile = () => {
    api.get('users/profile')
      .then(res => setProfile(res.data))
      .catch(err => console.error('Failed to load profile:', err));
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setUploadError('');
    }
  };

  const handleUpload = () => {
    if (!selectedFile) return;
    setUploading(true);
    setUploadError('');

    documentService.uploadDocument(selectedFile)
      .then((res) => {
        setSelectedFile(null);
        setUploading(false);
        loadDocuments();
        // Automatically open the report if analysis completed during upload
        if (res.data && res.data.status === 'ANALYZED') {
          viewReport(res.data.id);
        }
      })
      .catch(err => {
        console.error('Upload failed:', err);
        setUploadError(err.response?.data?.message || 'Upload failed. Please try again.');
        setUploading(false);
      });
  };

  /**
   * viewReport: fetches and displays the RiskReport for a given document.
   * The report JSON from Spring Boot contains:
   *   - id, overallRiskScore, simpleSummary, createdAt
   *   - document: { id, fileName, ocrText, fileType, uploadDate, status }
   *   - clauses: [{ id, clauseType, riskLevel, riskReason, clauseText }]
   */
  const viewReport = (docId) => {
    setReportLoading(true);
    documentService.getRiskReport(docId)
      .then(res => {
        setActiveReport(res.data);
        setReportLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch report:', err);
        setReportLoading(false);
        alert('Report not available or still processing. Please wait and try again.');
      });
  };

  const handleDeleteDocument = (docId) => {
    if (!window.confirm('Delete this document and its report?')) return;
    api.delete(`documents/${docId}`)
      .then(() => setDocuments(prev => prev.filter(d => d.id !== docId)))
      .catch(() => alert('Failed to delete document.'));
  };

  const getStatusBadge = (status) => {
    const map = {
      SCHEDULED:  'bg-blue-100   text-blue-700   dark:bg-blue-900/40   dark:text-blue-300',
      COMPLETED:  'bg-green-100  text-green-700  dark:bg-green-900/40  dark:text-green-300',
      CANCELLED:  'bg-red-100    text-red-700    dark:bg-red-900/40    dark:text-red-300',
      PENDING:    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
      SUCCESS:    'bg-green-100  text-green-700  dark:bg-green-900/40  dark:text-green-300',
      FAILED:     'bg-red-100    text-red-700    dark:bg-red-900/40    dark:text-red-300',
      ANALYZED:   'bg-green-100  text-green-700  dark:bg-green-900/40  dark:text-green-300',
      PROCESSING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
      UPLOADED:   'bg-blue-100   text-blue-700   dark:bg-blue-900/40   dark:text-blue-300',
    };
    return map[status] || 'bg-gray-100 text-gray-700';
  };

  const getRiskColor = (risk) => {
    if (!risk) return 'bg-gray-100 text-gray-700';
    const r = risk.toLowerCase();
    if (r === 'high')   return 'bg-red-100    text-red-700    dark:bg-red-900/30    dark:text-red-300';
    if (r === 'medium') return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
    return                     'bg-green-100  text-green-700  dark:bg-green-900/30  dark:text-green-300';
  };

  const tabIcons = {
    Documents:    <FileText   size={18} />,
    Appointments: <Calendar   size={18} />,
    Payments:     <CreditCard size={18} />,
    Profile:      <User       size={18} />,
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* ── Header ── */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-purple-600">
            Welcome back, {user?.firstName} 👋
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Your complete legal management hub.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/profile')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors font-medium"
          >
            <Settings size={16} /> Edit Profile
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors font-medium"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Documents',     value: documents.length,                                          icon: <FileText />,    color: 'from-blue-500   to-indigo-500' },
          { label: 'Appointments',  value: appointments.length,                                       icon: <Calendar />,    color: 'from-purple-500 to-pink-500'   },
          { label: 'Payments',      value: payments.length,                                           icon: <CreditCard />,  color: 'from-green-500  to-emerald-500' },
          { label: 'Analyzed Docs', value: documents.filter(d => d.status === 'ANALYZED').length,     icon: <CheckCircle />, color: 'from-orange-500 to-red-500'    },
        ].map(stat => (
          <div key={stat.label} className="glass-panel rounded-2xl p-5 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-white`}>
              {stat.icon}
            </div>
            <div>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-2 bg-white/60 dark:bg-dark-card/60 backdrop-blur rounded-2xl p-1.5 w-fit border border-gray-100 dark:border-gray-800">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === tab
                ? 'bg-primary-600 text-white shadow-md shadow-primary-500/30'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            {tabIcons[tab]} {tab}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.2 }}
        >

          {/* ═══════════════════════════════════════════
              DOCUMENTS TAB
          ═══════════════════════════════════════════ */}
          {activeTab === 'Documents' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

              {/* Upload Panel */}
              <div className="lg:col-span-1">
                <div className="glass-panel rounded-3xl p-6">
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Upload className="text-primary-500" /> Upload Document
                  </h2>

                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-8 text-center hover:bg-gray-50 dark:hover:bg-dark-card transition-colors cursor-pointer">
                    <input
                      type="file"
                      id="file-upload"
                      className="hidden"
                      onChange={handleFileChange}
                      accept=".pdf,.docx,.txt,.png,.jpg,.jpeg"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                      <FileText size={48} className="text-gray-400 mb-4" />
                      <span className="text-sm font-medium text-primary-600">Click to browse</span>
                      <span className="text-xs text-gray-500 mt-1">PDF, DOCX, PNG, JPG up to 10MB</span>
                    </label>
                  </div>

                  {selectedFile && (
                    <div className="mt-4 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-xl flex justify-between items-center border border-primary-100 dark:border-primary-800">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <FileIcon className="text-primary-500 flex-shrink-0" size={20} />
                        <span className="text-sm font-medium truncate">{selectedFile.name}</span>
                      </div>
                      <button onClick={() => setSelectedFile(null)} className="text-gray-400 hover:text-red-500">
                        <X size={16} />
                      </button>
                    </div>
                  )}

                  {uploadError && (
                    <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                      <p className="text-sm text-red-600 dark:text-red-400">{uploadError}</p>
                    </div>
                  )}

                  <button
                    onClick={handleUpload}
                    disabled={!selectedFile || uploading}
                    className="mt-4 w-full bg-primary-600 hover:bg-primary-700 text-white py-3 rounded-xl font-medium transition-all shadow-lg hover:shadow-primary-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                  >
                    {uploading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Analyzing with AI...
                      </>
                    ) : (
                      'Analyze Document'
                    )}
                  </button>

                  <button
                    onClick={loadDocuments}
                    className="mt-2 w-full flex justify-center items-center gap-2 py-2 text-sm text-gray-500 hover:text-primary-600 transition-colors"
                  >
                    <RefreshCw size={14} /> Refresh List
                  </button>
                </div>
              </div>

              {/* Documents List */}
              <div className="lg:col-span-2">
                <div className="glass-panel rounded-3xl p-6">
                  <h2 className="text-xl font-semibold mb-4">Document History</h2>
                  <div className="space-y-3">
                    {documents.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <FileText size={48} className="mx-auto mb-4 text-gray-300" />
                        <p>No documents uploaded yet.</p>
                        <p className="text-sm mt-1">Upload a PDF to get started.</p>
                      </div>
                    ) : (
                      documents.map(doc => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-4 rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-primary-300 dark:hover:border-primary-700 transition-colors bg-white/50 dark:bg-dark-bg/50"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/40 text-primary-600 rounded-xl flex items-center justify-center">
                              <FileText size={24} />
                            </div>
                            <div>
                              <h3 className="font-medium">{doc.fileName}</h3>
                              <p className="text-xs text-gray-500">
                                {doc.uploadDate ? new Date(doc.uploadDate).toLocaleDateString() : '—'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(doc.status)}`}>
                              {doc.status}
                            </span>

                            {doc.status === 'ANALYZED' && (
                              <button
                                onClick={() => viewReport(doc.id)}
                                disabled={reportLoading}
                                className="flex items-center gap-1 px-3 py-1.5 text-primary-600 bg-primary-50 hover:bg-primary-100 dark:bg-primary-900/20 dark:hover:bg-primary-900/40 rounded-lg transition-colors text-xs font-medium disabled:opacity-50"
                                title="View Report"
                              >
                                {reportLoading ? (
                                  <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Eye size={14} />
                                )}
                                View Report
                              </button>
                            )}

                            <button
                              onClick={() => handleDeleteDocument(doc.id)}
                              className="text-gray-400 hover:text-red-500 p-2 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════
              APPOINTMENTS TAB
          ═══════════════════════════════════════════ */}
          {activeTab === 'Appointments' && (
            <div className="glass-panel rounded-3xl p-6">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <Calendar className="text-primary-500" /> My Appointments
              </h2>
              {appointments.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                  <Calendar size={48} className="mx-auto mb-4 text-gray-300" />
                  <p>No appointments booked yet.</p>
                  <button
                    onClick={() => navigate('/lawyers')}
                    className="mt-4 px-6 py-2 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors"
                  >
                    Find a Lawyer
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {appointments.map(apt => (
                    <div key={apt.id} className="p-5 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white/50 dark:bg-dark-bg/50 flex flex-wrap gap-4 justify-between items-center">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-100 to-purple-100 dark:from-primary-900 dark:to-purple-900 flex items-center justify-center text-primary-600 dark:text-primary-300 font-bold text-xl">
                          {apt.lawyerName ? apt.lawyerName.charAt(0) : 'L'}
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{apt.lawyerName || `Lawyer #${apt.lawyerId}`}</h3>
                          <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                            <Clock size={14} />
                            {apt.appointmentDate ? new Date(apt.appointmentDate).toLocaleString() : 'Date TBD'}
                          </div>
                          {apt.notes && <p className="text-xs text-gray-400 mt-1 max-w-sm truncate">{apt.notes}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(apt.status)}`}>
                          {apt.status}
                        </span>
                        {apt.status === 'COMPLETED' && (
                          <button
                            onClick={() => setReviewTarget({ lawyerId: apt.lawyerId, lawyerName: apt.lawyerName, appointmentId: apt.id })}
                            className="flex items-center gap-1 px-3 py-1.5 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 rounded-xl text-xs font-medium hover:bg-yellow-100 transition-colors"
                          >
                            <Star size={14} className="fill-current" /> Rate
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════
              PAYMENTS TAB
          ═══════════════════════════════════════════ */}
          {activeTab === 'Payments' && (
            <div className="glass-panel rounded-3xl p-6">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <CreditCard className="text-primary-500" /> Payment History
              </h2>
              {payments.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                  <DollarSign size={48} className="mx-auto mb-4 text-gray-300" />
                  <p>No payments made yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-800">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-500">Transaction ID</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-500">Amount</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-500">Method</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-500">Status</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-500">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                      {payments.map(pmt => (
                        <tr key={pmt.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                          <td className="py-3 px-4 text-sm font-mono text-gray-600 dark:text-gray-400">{pmt.razorpayOrderId || `TXN-${pmt.id}`}</td>
                          <td className="py-3 px-4 text-sm font-bold">₹{pmt.amount}</td>
                          <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{pmt.paymentMethod || 'Online'}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadge(pmt.paymentStatus)}`}>
                              {pmt.paymentStatus}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-500">
                            {pmt.createdAt ? new Date(pmt.createdAt).toLocaleDateString() : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════
              PROFILE TAB
          ═══════════════════════════════════════════ */}
          {activeTab === 'Profile' && (
            <div className="glass-panel rounded-3xl p-6 max-w-2xl">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <User className="text-primary-500" /> My Profile
              </h2>
              {profile ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-400 to-purple-500 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                      {profile.firstName?.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold">{profile.firstName} {profile.lastName}</h3>
                      <p className="text-gray-500 dark:text-gray-400">{profile.email}</p>
                      <p className="text-gray-400 dark:text-gray-500 text-sm">{profile.phone || 'No phone added'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: 'Email',      value: profile.email              },
                      { label: 'Phone',      value: profile.phone || '—'       },
                      { label: 'First Name', value: profile.firstName          },
                      { label: 'Last Name',  value: profile.lastName           },
                    ].map(item => (
                      <div key={item.label} className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/40">
                        <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{item.label}</p>
                        <p className="font-medium">{item.value}</p>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => navigate('/profile')}
                    className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-colors shadow-lg hover:shadow-primary-500/30"
                  >
                    Edit Full Profile
                  </button>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">Loading profile...</div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* ═══════════════════════════════════════════
          AI RISK REPORT MODAL
          Fields from backend RiskReport entity:
            report.id
            report.overallRiskScore      ← overall risk (High/Medium/Low)
            report.simpleSummary         ← AI-generated summary text
            report.createdAt             ← analysis timestamp
            report.document.fileName     ← original file name
            report.document.ocrText      ← full extracted text (OCR)
            report.clauses[]
              clause.clauseType          ← e.g. "Termination"
              clause.riskLevel           ← "High" / "Medium" / "Low"
              clause.riskReason          ← explanation from AI
      ═══════════════════════════════════════════ */}
      <AnimatePresence>
        {activeReport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setActiveReport(null)}
          >
            <motion.div
              initial={{ scale: 0.92, y: 24 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 24 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="glass-panel rounded-3xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto border-l-4 border-l-primary-500"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold">AI Risk Assessment Report</h2>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                    Generated on {activeReport.createdAt
                      ? new Date(activeReport.createdAt).toLocaleString()
                      : '—'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-4 py-2 rounded-xl flex items-center gap-2 font-bold text-sm ${getRiskColor(activeReport.overallRiskScore)}`}>
                    {activeReport.overallRiskScore === 'High'
                      ? <AlertTriangle size={16} />
                      : <CheckCircle size={16} />}
                    {activeReport.overallRiskScore} Risk
                  </span>
                  <button
                    onClick={() => setActiveReport(null)}
                    className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* ── 1. File Name ── */}
              {activeReport.document?.fileName && (
                <div className="mb-5 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">File Name</p>
                  <p className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <FileText size={16} className="text-primary-500" />
                    {activeReport.document.fileName}
                  </p>
                </div>
              )}

              {/* ── 2. AI Summary ── */}
              {activeReport.simpleSummary && (
                <div className="mb-5 p-5 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800">
                  <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
                    <CheckCircle size={16} /> AI Summary
                  </h3>
                  <p className="text-sm text-blue-700 dark:text-blue-200 whitespace-pre-wrap leading-relaxed">
                    {activeReport.simpleSummary}
                  </p>
                </div>
              )}

              {/* ── 3. Risky Clauses ── */}
              <div className="mb-5">
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <AlertTriangle size={18} className="text-amber-500" />
                  Detected Risky Clauses
                  <span className="ml-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-full text-xs font-bold text-gray-600 dark:text-gray-300">
                    {activeReport.clauses?.length || 0}
                  </span>
                </h3>

                {activeReport.clauses && activeReport.clauses.length > 0 ? (
                  <div className="space-y-3">
                    {activeReport.clauses.map((clause, idx) => (
                      <motion.div
                        key={clause.id || idx}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-dark-bg/60"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-semibold text-primary-700 dark:text-primary-400">
                            {clause.clauseType} Clause
                          </span>
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${getRiskColor(clause.riskLevel)}`}>
                            {clause.riskLevel} Risk
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border-l-2 border-primary-400 leading-relaxed">
                          {clause.riskReason}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-green-100 dark:border-green-800 bg-green-50 dark:bg-green-900/20 text-sm text-green-700 dark:text-green-300">
                    ✅ No significant risky clauses detected.
                  </div>
                )}
              </div>

              {/* ── 4. Extracted Text ── */}
              {activeReport.document?.ocrText && (
                <details className="group">
                  <summary className="cursor-pointer font-semibold text-gray-700 dark:text-gray-300 hover:text-primary-600 transition-colors flex items-center gap-2 py-2 select-none">
                    <FileText size={16} className="text-primary-500" />
                    View Full Extracted Text
                    <span className="ml-auto text-xs text-gray-400 group-open:hidden">Click to expand</span>
                    <span className="ml-auto text-xs text-gray-400 hidden group-open:block">Click to collapse</span>
                  </summary>
                  <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 max-h-64 overflow-y-auto">
                    <pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed font-mono">
                      {activeReport.document.ocrText}
                    </pre>
                  </div>
                </details>
              )}

              {/* Modal Footer */}
              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                <button
                  onClick={() => setActiveReport(null)}
                  className="px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Review Modal */}
      <AnimatePresence>
        {reviewTarget && (
          <ReviewModal
            lawyerId={reviewTarget.lawyerId}
            lawyerName={reviewTarget.lawyerName}
            appointmentId={reviewTarget.appointmentId}
            onClose={() => setReviewTarget(null)}
            onSubmitted={() => { setReviewTarget(null); loadAppointments(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
