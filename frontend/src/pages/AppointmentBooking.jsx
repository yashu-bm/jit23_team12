import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, CreditCard, CheckCircle, ChevronRight, User as UserIcon } from 'lucide-react';
import useRazorpay from 'react-razorpay';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import api from '../services/api';

const AppointmentBooking = () => {
  const { user } = useSelector(state => state.auth);
  const navigate = useNavigate();
  const [Razorpay] = useRazorpay();
  const [step, setStep] = useState(1);
  const [selectedLawyer, setSelectedLawyer] = useState(null);
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [lawyersList, setLawyersList] = useState([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    const fetchLawyers = async () => {
      try {
        const res = await api.get('lawyers/search');
        setLawyersList(res.data);
        
        const params = new URLSearchParams(window.location.search);
        const lId = params.get('lawyerId');
        if (lId) {
          const lawyer = res.data.find(l => l.id.toString() === lId);
          if (lawyer) {
            setSelectedLawyer(lawyer);
            setStep(2);
          }
        }
      } catch (err) {
        console.error("Failed to load lawyers", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLawyers();
  }, []);

  const handleLawyerSelect = (lawyer) => {
    setSelectedLawyer(lawyer);
    setStep(2);
  };

  const handleTimeSelect = (e) => {
    e.preventDefault();
    if (appointmentDate && appointmentTime) {
      setStep(3);
    }
  };

  const handlePayment = async () => {
    setIsProcessing(true);
    try {
      // 1. Create order on backend
      const orderResponse = await api.post('payments/create-order', {
        userId: user.id,
        amount: selectedLawyer.consultationFee
      });

      const orderData = orderResponse.data;

      // 2. Initialize Razorpay Checkout
      const options = {
        key: "rzp_test_T72Rltk1b0NClI", // Replace with real key
        amount: orderData.amount * 100,
        currency: "INR",
        name: "Smart Legal Assistance",
        description: `Consultation fee for ${selectedLawyer.name}`,
        order_id: orderData.razorpayOrderId,
        handler: async (response) => {
          // 3. Verify payment on backend
          await api.post('payments/verify', {
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature
          });
          
          // 4. Book appointment on backend
          const dt = new Date(`${appointmentDate}T${appointmentTime}`).toISOString();
          await api.post('appointments/book', {
            userId: user.id,
            lawyerId: selectedLawyer.id,
            appointmentDate: dt
          });
          
          setPaymentSuccess(true);
          setStep(4);
          setIsProcessing(false);
        },
        prefill: {
          name: user.name || "User",
          email: user.email || "user@example.com",
          contact: "",
        },
        theme: {
          color: "#4f46e5",
        },
      };

      const rzp = new Razorpay(options);
      rzp.on("payment.failed", function (response) {
        alert("Payment Failed: " + response.error.description);
        setIsProcessing(false);
      });
      rzp.open();

    } catch (error) {
      console.error("Payment flow error", error);
      alert("Error initiating payment. Check if backend is running.");
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto min-h-[calc(100vh-64px)]">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Book a Consultation</h1>
      
      {/* Stepper */}
      <div className="flex items-center mb-10 w-full md:w-3/4 mx-auto">
        <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${step >= 1 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'}`}>1</div>
        <div className={`flex-1 h-1 ${step >= 2 ? 'bg-indigo-600' : 'bg-gray-200'}`}></div>
        <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${step >= 2 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'}`}>2</div>
        <div className={`flex-1 h-1 ${step >= 3 ? 'bg-indigo-600' : 'bg-gray-200'}`}></div>
        <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${step >= 3 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'}`}>3</div>
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div 
            key="step1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {loading ? <p className="text-gray-500">Loading lawyers...</p> : lawyersList.map(lawyer => (
              <div key={lawyer.id} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleLawyerSelect(lawyer)}>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <UserIcon size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg dark:text-white">{lawyer.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{lawyer.specializationCategory || 'General'}</p>
                  </div>
                </div>
                <div className="flex justify-between items-center mt-6">
                  <span className="font-semibold text-gray-900 dark:text-white">₹{lawyer.consultationFee} / session</span>
                  <button className="text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1 hover:gap-2 transition-all">
                    Select <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {step === 2 && (
          <motion.div 
            key="step2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="max-w-md mx-auto bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700"
          >
            <h2 className="text-xl font-bold dark:text-white mb-6">Select Date & Time for {selectedLawyer.name}</h2>
            <form onSubmit={handleTimeSelect} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <Calendar size={18} /> Date
                </label>
                <input 
                  type="date" 
                  required
                  min={new Date().toISOString().split('T')[0]}
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-3 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <Clock size={18} /> Time
                </label>
                <input 
                  type="time" 
                  required
                  value={appointmentTime}
                  onChange={(e) => setAppointmentTime(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-3 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setStep(1)} className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg font-medium">Back</button>
                <button type="submit" className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium">Continue</button>
              </div>
            </form>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div 
            key="step3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="max-w-md mx-auto bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 text-center"
          >
            <h2 className="text-xl font-bold dark:text-white mb-6">Payment Summary</h2>
            <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-xl mb-6 text-left space-y-3">
              <div className="flex justify-between border-b border-gray-200 dark:border-gray-700 pb-3">
                <span className="text-gray-600 dark:text-gray-400">Consultation with</span>
                <span className="font-semibold dark:text-white">{selectedLawyer.name}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 dark:border-gray-700 pb-3">
                <span className="text-gray-600 dark:text-gray-400">Date & Time</span>
                <span className="font-semibold dark:text-white">{appointmentDate} at {appointmentTime}</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-gray-900 dark:text-white font-bold text-lg">Total Fee</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-bold text-xl">₹{selectedLawyer.consultationFee}</span>
              </div>
            </div>
            
            <div className="flex gap-4">
              <button type="button" onClick={() => setStep(2)} className="w-1/3 py-3 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg font-medium">Back</button>
              <button 
                onClick={handlePayment} 
                disabled={isProcessing}
                className="w-2/3 py-3 bg-[#0a2540] hover:bg-[#113255] text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                <CreditCard size={18} />
                {isProcessing ? 'Processing...' : 'Pay with Razorpay'}
              </button>
            </div>
          </motion.div>
        )}

        {step === 4 && paymentSuccess && (
          <motion.div 
            key="step4"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md mx-auto bg-white dark:bg-gray-800 p-10 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 text-center"
          >
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-400 mx-auto mb-6">
              <CheckCircle size={40} />
            </div>
            <h2 className="text-2xl font-bold dark:text-white mb-2">Booking Confirmed!</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Your appointment with {selectedLawyer.name} is confirmed for {appointmentDate}. You will receive an email shortly.
            </p>
            <button 
              onClick={() => navigate('/dashboard')}
              className="py-3 px-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
            >
              Go to Dashboard
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AppointmentBooking;
