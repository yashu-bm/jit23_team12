import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useEffect } from 'react';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Lawyers from './pages/Lawyers';
import DocumentAnalysisDashboard from './pages/DocumentAnalysisDashboard';
import NoticeGenerator from './pages/NoticeGenerator';
import AppointmentBooking from './pages/AppointmentBooking';
import AdminDashboard from './pages/AdminDashboard';
import ForgotPassword from './pages/ForgotPassword';
import Profile from './pages/Profile';
import LawyerDashboard from './pages/LawyerDashboard';
import EmergencyLegalHelp from './pages/EmergencyLegalHelp';
import LegalKnowledgeCenter from './pages/LegalKnowledgeCenter';
import ChatbotWidget from './components/ChatbotWidget';

import { logout } from './redux/authSlice';

// Inner component so that useNavigate works inside <Router>
function AppRoutes() {
  const { isLoggedIn, user } = useSelector((state) => state.auth);
  const isLawyer = user?.roles?.includes('ROLE_LAWYER');
  const isAdmin = user?.roles?.includes('ROLE_ADMIN');
  const isUser = user?.roles?.includes('ROLE_USER');
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Handle 401 responses from Axios interceptor without a full-page reload
  useEffect(() => {
    const handleUnauthorized = () => {
      dispatch(logout());
      navigate('/login', { replace: true });
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [dispatch, navigate]);

  return (
      <>
        <Routes>
          <Route path="/" element={
            isLoggedIn 
              ? (isAdmin ? <Navigate to="/admin" /> 
                : isLawyer ? <Navigate to="/lawyer-dashboard" /> 
                : <Navigate to="/dashboard" />) 
              : <Navigate to="/login" />
          } />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/dashboard" element={
            !isLoggedIn ? <Navigate to="/login" />
            : isAdmin ? <Navigate to="/admin" />
            : isLawyer ? <Navigate to="/lawyer-dashboard" />
            : <Dashboard />
          } />
          <Route path="/profile" element={
            isLoggedIn ? <Profile /> : <Navigate to="/login" />
          } />
          <Route path="/lawyer-dashboard" element={
            !isLoggedIn ? <Navigate to="/login" />
            : isAdmin ? <Navigate to="/admin" />
            : !isLawyer ? <Navigate to="/dashboard" />
            : <LawyerDashboard />
          } />
          <Route path="/lawyers" element={
            isLoggedIn ? <Lawyers /> : <Navigate to="/login" />
          } />
          <Route path="/analyze-document" element={
            isLoggedIn ? <DocumentAnalysisDashboard /> : <Navigate to="/login" />
          } />
          <Route path="/generate-notice" element={
            isLoggedIn ? <NoticeGenerator /> : <Navigate to="/login" />
          } />
          <Route path="/book-appointment" element={
            isLoggedIn ? <AppointmentBooking /> : <Navigate to="/login" />
          } />
          <Route path="/admin" element={
            !isLoggedIn ? <Navigate to="/login" />
            : isLawyer ? <Navigate to="/lawyer-dashboard" />
            : !isAdmin ? <Navigate to="/dashboard" />
            : <AdminDashboard />
          } />
          <Route path="/emergency" element={
            isLoggedIn ? <EmergencyLegalHelp /> : <Navigate to="/login" />
          } />
          <Route path="/knowledge-center" element={
            isLoggedIn ? <LegalKnowledgeCenter /> : <Navigate to="/login" />
          } />
        </Routes>
        {isLoggedIn && <ChatbotWidget />}
      </>
  );
}

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg text-gray-900 dark:text-gray-100 font-sans transition-colors duration-300">
        <AppRoutes />
      </div>
    </Router>
  );
}

export default App;
