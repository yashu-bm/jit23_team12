import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Upload, FileText, AlertTriangle, CheckCircle, ChevronRight,
  File as FileIcon, Calendar, CreditCard, User, Trash2, Download,
  Star, Clock, DollarSign, X, Settings, RefreshCw, Eye, LogOut, MessageSquare, Search
} from 'lucide-react';
import { logout } from '../redux/authSlice';
import { motion, AnimatePresence } from 'framer-motion';
import documentService from '../services/document.service';
import api from '../services/api';
import useRazorpay from 'react-razorpay';
import ReviewModal from '../components/ReviewModal';
import RealTimeChat from '../components/RealTimeChat';
import NotificationBell from '../components/NotificationBell';
import SmartCalendar from '../components/SmartCalendar';
import DocumentReport from '../components/DocumentReport';

const TABS = ['Documents', 'Appointments', 'Payments', 'Messages', 'Profile'];

export default function Dashboard() {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login', { replace: true });
  };

  const [activeTab, setActiveTab] = useState('Documents');
  const [Razorpay] = useRazorpay();
  const [documents, setDocuments] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [activeReport, setActiveReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  const [appointments, setAppointments] = useState([]);
  const [appointmentView, setAppointmentView] = useState('list');
  const [selectedLawyerForCalendar, setSelectedLawyerForCalendar] = useState('');
  const [calendarAvailabilities, setCalendarAvailabilities] = useState([]);
  const [calendarAppointments, setCalendarAppointments] = useState([]);
  const [isCalendarLoading, setIsCalendarLoading] = useState(false);
  const [payments, setPayments] = useState([]);
  const [profile, setProfile] = useState(null);

  const [reviewTarget, setReviewTarget] = useState(null);
  const [chatTarget, setChatTarget] = useState(null);
  const [chatSession, setChatSession] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [globalUnreadCount, setGlobalUnreadCount] = useState(0);

  const startChat = async (targetUserId, targetName) => {
    try {
      const res = await api.post('chat/session', { targetUserId });
      setChatSession(res.data);
      setChatTarget({ targetUserId, targetName });
      loadConversations();
    } catch (error) {
      alert('Failed to start chat session');
    }
  };

  const handlePayment = async (appointment) => {
    try {
      const configRes = await api.get('payments/config');
      const rzpKey = configRes.data.keyId;

      const orderResponse = await api.post('payments/create-order', {
        userId: user.id,
        amount: appointment.consultationFee,
        lawyerId: appointment.lawyerId,
        appointmentId: appointment.id
      });

      const orderData = orderResponse.data;

      const options = {
        key: rzpKey,
        amount: orderData.amount * 100,
        currency: "INR",
        name: "Smart Legal Assistance",
        description: `Consultation fee for ${appointment.lawyerName}`,
        order_id: orderData.razorpayOrderId,
        handler: async (response) => {
          try {
            await api.post('payments/verify', {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              appointmentId: appointment.id
            });
            alert("Payment successful!");
            loadAppointments();
            loadPayments();
          } catch (err) {
            console.error("Verification error:", err);
            alert("Payment verification failed.");
          }
        },
        prefill: {
          name: user.firstName || "User",
          email: user.email || "user@example.com",
          contact: user.phone || "",
        },
        theme: {
          color: "#4f46e5",
        }
      };

      const rzp = new Razorpay(options);
      rzp.on("payment.failed", function (response) {
        alert("Payment Failed: " + response.error.description);
      });
      rzp.open();

    } catch (error) {
      console.error("Payment flow error", error);
      alert("Error initiating payment.");
    }
  };

  useEffect(() => {
    loadDocuments();
    loadAppointments();
    loadPayments();
    loadProfile();
    loadConversations();

    const interval = setInterval(loadConversations, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadConversations = () => {
    api.get('chat/conversations')
      .then(res => {
        setConversations(res.data);
        const total = res.data.reduce((sum, c) => sum + c.unreadCount, 0);
        setGlobalUnreadCount(total);
      })
      .catch(err => console.error(err));
  };

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

  const handleLawyerSelectForCalendar = async (lawyerId) => {
    setSelectedLawyerForCalendar(lawyerId);
    if (!lawyerId) {
      setCalendarAvailabilities([]);
      setCalendarAppointments([]);
      return;
    }
    setIsCalendarLoading(true);
    try {
      const [availRes, apptRes] = await Promise.all([
        api.get(`availability/lawyer/${lawyerId}`),
        api.get(`appointments/lawyer/${lawyerId}`)
      ]);
      setCalendarAvailabilities(availRes.data);
      setCalendarAppointments(apptRes.data);
    } catch (err) {
      console.error("Failed to load lawyer schedule", err);
    } finally {
      setIsCalendarLoading(false);
    }
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
        const rawError = err.response?.data ? JSON.stringify(err.response.data) : err.message;
        setUploadError(err.response?.data?.message || `Upload failed. Raw: ${rawError}`);
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
      .catch((err) => {
        console.error('Failed to delete document:', err);
        const errorMsg = err.response?.data?.message || err.message || 'Unknown error';
        alert(`Failed to delete document: ${errorMsg}`);
      });
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
    Messages:     <MessageSquare size={18} />,
    Profile:      <User       size={18} />,
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* ── Hero Banner ── */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-primary-950 via-primary-900 to-brand-indigo text-white p-10 md:p-14 shadow-2xl animate-fade-in border border-white/10">
        <div className="absolute top-0 right-0 w-full h-full opacity-30 pointer-events-none">
          <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[150%] bg-gradient-to-l from-brand-purple to-transparent blur-[120px] rounded-full mix-blend-overlay"></div>
          <div className="absolute bottom-[-20%] left-[10%] w-[40%] h-[80%] bg-gradient-to-tr from-brand-pink to-transparent blur-[100px] rounded-full mix-blend-overlay"></div>
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-white drop-shadow-sm">
              Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-300 to-brand-pink">{user?.firstName}</span> 👋
            </h1>
            <p className="text-primary-100 text-lg font-medium opacity-90 max-w-xl leading-relaxed">
              Your complete legal management hub. Upload documents for AI analysis or connect with top-tier verified lawyers seamlessly.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <NotificationBell lightText={true} />
            <button
              onClick={() => navigate('/profile')}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all font-semibold border border-white/20"
            >
              <Settings size={18} /> Profile
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-red-500/80 hover:bg-red-600/90 text-white backdrop-blur-md transition-all font-semibold border border-red-400/30 shadow-[0_0_15px_rgba(239,68,68,0.3)]"
            >
              <LogOut size={18} /> Logout
            </button>
          </div>
        </div>
      </div>

      {/* ── Quick Actions & Stats ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-slide-up">
        {/* Quick Actions */}
        <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button 
            onClick={() => navigate('/lawyers')}
            className="flex flex-col justify-center items-start p-6 rounded-3xl bg-white dark:bg-slate-800 shadow-soft hover:shadow-lg transition-all group border border-gray-100 dark:border-slate-700 hover:-translate-y-1"
          >
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4 group-hover:scale-110 transition-transform">
              <Search size={24} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Find a Lawyer</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-left">Browse verified experts</p>
          </button>
          <button 
            onClick={() => setActiveTab('Documents')}
            className="flex flex-col justify-center items-start p-6 rounded-3xl bg-white dark:bg-slate-800 shadow-soft hover:shadow-lg transition-all group border border-gray-100 dark:border-slate-700 hover:-translate-y-1"
          >
            <div className="w-12 h-12 rounded-2xl bg-brand-purple/10 dark:bg-brand-purple/20 flex items-center justify-center text-brand-purple mb-4 group-hover:scale-110 transition-transform">
              <Upload size={24} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Upload & Analyze</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-left">AI document risk review</p>
          </button>
        </div>

        {/* Stats */}
        <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Documents',     value: documents.length,                                          icon: <FileText size={20}/>,    color: 'from-blue-500   to-indigo-600',   bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600' },
            { label: 'Appointments',  value: appointments.length,                                       icon: <Calendar size={20}/>,    color: 'from-brand-purple to-brand-pink', bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-600' },
            { label: 'Payments',      value: payments.length,                                           icon: <CreditCard size={20}/>,  color: 'from-emerald-400  to-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600' },
            { label: 'Analyzed',      value: documents.filter(d => d.status === 'ANALYZED').length,     icon: <CheckCircle size={20}/>, color: 'from-orange-400 to-red-500',      bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-600' },
          ].map(stat => (
            <div key={stat.label} className="flex flex-col justify-between p-5 rounded-3xl bg-white dark:bg-slate-800 shadow-soft border border-gray-100 dark:border-slate-700">
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center ${stat.text} mb-4`}>
                {stat.icon}
              </div>
              <div>
                <div className="text-2xl font-extrabold text-gray-900 dark:text-white">{stat.value}</div>
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-1">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-2 bg-white/60 dark:bg-dark-card/60 backdrop-blur rounded-2xl p-1.5 w-fit border border-gray-100 dark:border-gray-800">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all relative ${
              activeTab === tab
                ? 'bg-primary-600 text-white shadow-md shadow-primary-500/30'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            {tabIcons[tab]} {tab}
            {tab === 'Messages' && globalUnreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full shadow-md animate-fade-in border-2 border-white dark:border-slate-900">
                {globalUnreadCount}
              </span>
            )}
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
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Calendar className="text-primary-500" /> My Appointments
                </h2>
                <div className="flex items-center gap-3">
                  <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                    <button
                      onClick={() => setAppointmentView('list')}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${appointmentView === 'list' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                    >
                      List
                    </button>
                    <button
                      onClick={() => setAppointmentView('calendar')}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${appointmentView === 'calendar' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                    >
                      Calendar
                    </button>
                  </div>
                  {appointments.length > 0 && (
                    <button
                      onClick={() => navigate('/lawyers')}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                      Find a Lawyer
                    </button>
                  )}
                </div>
              </div>
              
              {appointmentView === 'calendar' ? (
                <div className="space-y-4">
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select a Lawyer to View Calendar</label>
                    <select 
                      value={selectedLawyerForCalendar} 
                      onChange={(e) => handleLawyerSelectForCalendar(e.target.value)}
                      className="w-full md:w-1/2 p-3 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-xl text-gray-900 dark:text-white"
                    >
                      <option value="">-- Select Lawyer --</option>
                      {[...new Map(appointments.filter(a => a.lawyerId).map(a => [a.lawyerId, {id: a.lawyerId, name: a.lawyerName}])).values()].map(l => (
                         <option key={l.id} value={l.id}>{l.name}</option>
                      ))}
                    </select>
                  </div>
                  {!selectedLawyerForCalendar ? (
                    <div className="text-center py-16 text-gray-500 bg-gray-50 dark:bg-slate-800/50 rounded-3xl border border-gray-100 dark:border-slate-700">
                      <Calendar size={48} className="mx-auto mb-4 text-gray-300 dark:text-slate-600" />
                      <p className="text-lg font-medium text-gray-700 dark:text-gray-300">Select a lawyer to view available appointment dates.</p>
                      <p className="text-sm mt-2">Only lawyers you have interacted with will appear here.</p>
                    </div>
                  ) : isCalendarLoading ? (
                    <div className="text-center py-16 text-gray-500 bg-gray-50 dark:bg-slate-800/50 rounded-3xl border border-gray-100 dark:border-slate-700 flex flex-col items-center justify-center">
                      <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4" />
                      <p className="text-lg font-medium text-gray-700 dark:text-gray-300">Loading lawyer availability...</p>
                    </div>
                  ) : calendarAvailabilities.length === 0 ? (
                    <div className="text-center py-16 text-gray-500 bg-gray-50 dark:bg-slate-800/50 rounded-3xl border border-gray-100 dark:border-slate-700">
                      <Calendar size={48} className="mx-auto mb-4 text-gray-300 dark:text-slate-600 opacity-50" />
                      <p className="text-lg font-medium text-gray-700 dark:text-gray-300">This lawyer has not added any availability yet.</p>
                      <p className="text-sm mt-2">Please check back later or contact them via messages.</p>
                    </div>
                  ) : (
                    <div className="h-[500px]">
                      <SmartCalendar 
                        appointments={calendarAppointments} 
                        availabilities={calendarAvailabilities}
                        isLawyer={false}
                      />
                    </div>
                  )}
                </div>
              ) : appointments.length === 0 ? (
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
                <div className="space-y-6">
                  {appointments.map(apt => (
                    <div key={apt.id} className="glass-card p-6 flex flex-col gap-6">
                      {/* Header Info */}
                      <div className="flex flex-wrap gap-4 justify-between items-start">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-400 to-brand-purple flex items-center justify-center text-white font-bold text-2xl shadow-md border-2 border-white overflow-hidden relative group/avatar">
                            <span>{apt.lawyerName ? apt.lawyerName.charAt(0) : 'L'}</span>
                            {apt.lawyerProfileImageUrl && (
                              <img 
                                src={apt.lawyerProfileImageUrl} 
                                alt={apt.lawyerName} 
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover/avatar:scale-110" 
                                onError={(e) => { e.target.style.display = 'none'; }}
                              />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="font-extrabold text-xl text-gray-900 dark:text-white">{apt.lawyerName || `Lawyer #${apt.lawyerId}`}</h3>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-gray-500 font-medium">
                              <span className="flex items-center gap-1.5 bg-gray-100 dark:bg-slate-700/50 px-2.5 py-1 rounded-lg">
                                <Clock size={14} className="text-primary-500"/>
                                {apt.appointmentDate ? new Date(apt.appointmentDate).toLocaleString() : 'Date TBD'}
                              </span>
                              <span className="flex items-center gap-1.5 bg-gray-100 dark:bg-slate-700/50 px-2.5 py-1 rounded-lg font-semibold text-gray-700 dark:text-gray-300">
                                ₹{apt.consultationFee || '---'}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Buttons Actions */}
                        <div className="flex items-center gap-2">
                          {apt.status === 'CONFIRMED' && (
                            <button
                              onClick={() => handlePayment(apt)}
                              className="btn-premium px-5 py-2.5 text-sm flex items-center gap-2"
                            >
                              <CreditCard size={16} /> Pay Now
                            </button>
                          )}
                          {(apt.status === 'PAID' || apt.status === 'COMPLETED') && (
                            <button
                              onClick={() => startChat(apt.lawyerId, apt.lawyerName)}
                              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-xl text-sm font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors shadow-sm"
                            >
                              <MessageSquare size={16} /> Open Chat
                            </button>
                          )}
                          {apt.status === 'COMPLETED' && (
                            <button
                              onClick={() => setReviewTarget({ lawyerId: apt.lawyerId, lawyerName: apt.lawyerName, appointmentId: apt.id })}
                              className="flex items-center gap-2 px-5 py-2.5 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-xl text-sm font-semibold hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors shadow-sm"
                            >
                              <Star size={16} className="fill-current" /> Rate Lawyer
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Progress Timeline */}
                      <div className="pt-5 border-t border-gray-100 dark:border-slate-700/50">
                        <div className="flex items-center justify-between relative px-2">
                          {/* Background Line */}
                          <div className="absolute left-0 top-3 w-full h-1 bg-gray-100 dark:bg-slate-700 rounded-full"></div>
                          
                          {/* Timeline Steps */}
                          {[
                            { step: 'Requested', isActive: true, isDone: true },
                            { step: 'Accepted', isActive: ['CONFIRMED', 'PAID', 'COMPLETED'].includes(apt.status), isDone: ['CONFIRMED', 'PAID', 'COMPLETED'].includes(apt.status) },
                            { step: 'Paid', isActive: ['PAID', 'COMPLETED'].includes(apt.status), isDone: ['PAID', 'COMPLETED'].includes(apt.status) },
                            { step: 'Completed', isActive: apt.status === 'COMPLETED', isDone: apt.status === 'COMPLETED' }
                          ].map((item, idx) => (
                            <div key={idx} className="relative z-10 flex flex-col items-center gap-2 w-1/4">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center border-4 transition-colors ${item.isActive ? 'bg-primary-500 border-white dark:border-slate-800 text-white shadow-glow' : 'bg-gray-200 dark:bg-slate-600 border-white dark:border-slate-800 text-transparent'}`}>
                                {item.isDone && <CheckCircle size={14} strokeWidth={3} />}
                              </div>
                              <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${item.isActive ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400'}`}>{item.step}</span>
                            </div>
                          ))}
                        </div>
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
              MESSAGES TAB
          ═══════════════════════════════════════════ */}
          {activeTab === 'Messages' && (
            <div className="glass-panel p-8 min-h-[500px] animate-fade-in">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold flex items-center gap-3 text-gray-900 dark:text-white">
                  <div className="p-2 bg-primary-100 dark:bg-primary-900/30 text-primary-600 rounded-xl">
                    <MessageSquare size={24} />
                  </div>
                  Conversations
                </h2>
              </div>
              
              <div className="space-y-4">
                {conversations.length === 0 ? (
                  <div className="text-center py-24 flex flex-col items-center justify-center bg-gray-50/50 dark:bg-slate-800/30 rounded-3xl border border-dashed border-gray-200 dark:border-slate-700">
                    <div className="w-24 h-24 bg-primary-50 dark:bg-primary-900/20 rounded-full flex items-center justify-center mb-6">
                      <MessageSquare size={40} className="text-primary-300 dark:text-primary-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">No Active Conversations</h3>
                    <p className="text-gray-500 dark:text-gray-400 max-w-md mb-8">
                      Once your booked appointment is marked as PAID, a secure chat channel will automatically open here.
                    </p>
                    <button disabled className="btn-premium px-8 py-3 opacity-50 cursor-not-allowed">
                      Start Chat
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {conversations.map(conv => (
                      <div 
                        key={conv.id} 
                        onClick={() => startChat(conv.targetUserId, conv.targetUserName)}
                        className="glass-card p-5 flex flex-col cursor-pointer group"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="relative">
                            <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-primary-400 to-brand-purple text-white font-bold text-xl flex items-center justify-center shadow-md group-hover:scale-105 transition-transform overflow-hidden border-2 border-white">
                              {conv.targetUserProfileImage ? (
                                <img src={conv.targetUserProfileImage} alt={conv.targetUserName} className="w-full h-full object-cover" />
                              ) : (
                                conv.targetUserName ? conv.targetUserName.charAt(0) : '?'
                              )}
                            </div>
                            {conv.unreadCount > 0 && (
                              <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 border-2 border-white dark:border-slate-800 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg animate-pulse-soft">
                                {conv.unreadCount}
                              </span>
                            )}
                            {/* Online indicator mock */}
                            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full shadow-sm"></span>
                          </div>
                          {conv.lastMessageTime && (
                            <span className="text-xs font-medium text-gray-500 bg-gray-100 dark:bg-slate-700/50 px-2 py-1 rounded-lg">
                              {new Date(conv.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex-1">
                          <h3 className={`text-lg font-bold mb-1 ${conv.unreadCount > 0 ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-200'}`}>
                            {conv.targetUserName}
                          </h3>
                          <p className={`text-sm line-clamp-2 ${conv.unreadCount > 0 ? 'font-medium text-primary-700 dark:text-primary-300' : 'text-gray-500 dark:text-gray-400'}`}>
                            {conv.lastMessage || 'Tap to view conversation'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
                    <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-400 to-purple-500 flex items-center justify-center text-white text-3xl font-bold shadow-lg overflow-hidden border-2 border-white dark:border-slate-800">
                      <span>{profile.firstName?.charAt(0)}</span>
                      {profile.profileImageUrl && (
                        <img 
                          src={`${profile.profileImageUrl}?t=${new Date().getTime()}`} 
                          alt="Profile" 
                          className="absolute inset-0 w-full h-full object-cover" 
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      )}
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
      ═══════════════════════════════════════════ */}
      <AnimatePresence>
        {activeReport && (
          <DocumentReport 
            report={activeReport} 
            onClose={() => setActiveReport(null)} 
          />
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

      {/* Chat Modal */}
      <AnimatePresence>
        {chatTarget && chatSession && (
          <div 
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => { setChatTarget(null); setChatSession(null); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-3xl bg-white dark:bg-gray-900 rounded-[2rem] shadow-2xl relative overflow-hidden"
            >
              <RealTimeChat 
                selectedLawyerId={chatTarget.targetUserId} 
                sessionId={chatSession.id} 
                onClose={() => { setChatTarget(null); setChatSession(null); }} 
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
