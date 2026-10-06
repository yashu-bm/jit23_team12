import { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, X, CheckCircle } from 'lucide-react';
import api from '../services/api';

const ReviewModal = ({ lawyerId, lawyerName, appointmentId, onClose, onSubmitted }) => {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post('reviews', {
        lawyerId,
        appointmentId,
        rating,
        reviewText
      });
      setSuccess(true);
      setTimeout(() => {
        onSubmitted && onSubmitted();
        onClose && onClose();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit review. You might have already reviewed this appointment.');
    } finally {
      setLoading(false);
    }
  };

  const ratingLabels = { 1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Very Good', 5: 'Excellent' };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2rem] border border-gray-100 dark:border-slate-800 shadow-2xl p-8 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 z-10"
        >
          <X size={20} />
        </button>

        {success ? (
          <div className="text-center py-10 relative z-10">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={40} className="text-green-500" />
            </div>
            <h3 className="text-2xl font-extrabold text-green-600 dark:text-green-400 mb-2">Review Submitted!</h3>
            <p className="text-gray-500 font-medium text-sm">Thank you for your valuable feedback.</p>
          </div>
        ) : (
          <div className="relative z-10">
            <div className="mb-8">
              <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white">Rate Your Consultation</h3>
              {lawyerName && (
                <p className="text-sm font-medium text-gray-500 mt-2 bg-gray-50 dark:bg-slate-800/50 inline-block px-3 py-1.5 rounded-lg border border-gray-100 dark:border-slate-700">
                  with <span className="font-bold text-gray-800 dark:text-gray-200">{lawyerName}</span>
                </p>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Star selector */}
              <div className="text-center p-6 bg-gray-50/50 dark:bg-slate-800/30 rounded-2xl border border-gray-100 dark:border-slate-800">
                <div className="flex justify-center items-center gap-3 mb-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className="transition-transform hover:scale-110 active:scale-95 focus:outline-none"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                    >
                      <Star
                        size={44}
                        className={`transition-colors duration-100 ${
                          star <= (hoverRating || rating)
                            ? 'text-yellow-400 fill-yellow-400 drop-shadow-md'
                            : 'text-gray-200 dark:text-slate-700'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <p className="text-sm font-extrabold text-primary-600 dark:text-primary-400 uppercase tracking-wider">
                  {ratingLabels[hoverRating || rating]}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  Your Review <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={4}
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="How was your consultation? Did the lawyer understand your case details well?"
                  className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl p-4 text-sm font-medium text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 outline-none resize-none shadow-inner transition-all"
                />
              </div>

              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50 rounded-xl text-red-600 dark:text-red-400 text-sm font-semibold">
                  {error}
                </div>
              )}

              <div className="flex gap-4 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-2xl text-sm font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-premium flex-1 py-3.5 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Star size={18} className="fill-current" /> Submit Review
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default ReviewModal;
