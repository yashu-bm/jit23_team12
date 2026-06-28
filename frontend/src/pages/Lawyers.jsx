import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, MapPin, Briefcase, Star, ChevronRight, Filter,
  SlidersHorizontal, X, DollarSign, Clock, Award, TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';

const CATEGORIES = ['Civil', 'Criminal', 'Family', 'Corporate', 'Property', 'Labour', 'Tax', 'Intellectual Property', 'Consumer', 'Constitutional'];

export default function Lawyers() {
  const navigate = useNavigate();

  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [lawyers, setLawyers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Advanced filters
  const [minFee, setMinFee] = useState('');
  const [maxFee, setMaxFee] = useState('');
  const [minExperience, setMinExperience] = useState('');
  const [minRating, setMinRating] = useState('');

  // Load all on mount
  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = () => {
    setLoading(true);
    api.get('lawyers/search')
      .then(res => { setLawyers(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  const buildQuery = () => {
    const params = new URLSearchParams();
    if (category.trim()) params.append('category', category.trim());
    if (location.trim()) params.append('location', location.trim());
    if (minFee) params.append('minFee', minFee);
    if (maxFee) params.append('maxFee', maxFee);
    if (minExperience) params.append('minExperience', minExperience);
    if (minRating) params.append('minRating', minRating);
    return params.toString();
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setLoading(true);
    setSearched(true);
    api.get(`lawyers/search?${buildQuery()}`)
      .then(res => { setLawyers(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  const clearFilters = () => {
    setMinFee(''); setMaxFee(''); setMinExperience(''); setMinRating('');
    setCategory(''); setLocation('');
    setSearched(false);
    loadAll();
  };

  const hasActiveFilters = minFee || maxFee || minExperience || minRating;

  const renderStars = (rating) => {
    const r = parseFloat(rating) || 0;
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        size={14}
        className={i < Math.floor(r) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
      />
    ));
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-purple-600 mb-4">
          Find the Right Legal Expert
        </h1>
        <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
          Our AI-powered recommendation system matches you with the best lawyers based on your case type, location, budget, and ratings.
        </p>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="space-y-4">
        <div className="glass-panel rounded-full p-2 max-w-3xl mx-auto shadow-xl flex items-center bg-white/80 dark:bg-dark-card/80">
          <div className="flex-1 flex items-center px-6 border-r border-gray-200 dark:border-gray-700">
            <Briefcase className="text-gray-400 mr-3 flex-shrink-0" size={20} />
            <select
              className="w-full bg-transparent outline-none py-3 text-gray-800 dark:text-gray-100 cursor-pointer"
              value={category}
              onChange={e => setCategory(e.target.value)}
            >
              <option value="">All Case Types</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex-1 flex items-center px-6">
            <MapPin className="text-gray-400 mr-3 flex-shrink-0" size={20} />
            <input
              type="text"
              placeholder="Location (City / State)"
              className="w-full bg-transparent outline-none py-3 text-gray-800 dark:text-gray-100"
              value={location}
              onChange={e => setLocation(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="bg-primary-600 hover:bg-primary-700 text-white rounded-full p-4 transition-transform hover:scale-105 shadow-lg shadow-primary-500/30"
          >
            {loading ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Search size={24} />}
          </button>
        </div>

        {/* Filters Toggle */}
        <div className="flex justify-center gap-3">
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
              showFilters || hasActiveFilters
                ? 'bg-primary-600 text-white border-primary-600 shadow-md'
                : 'bg-white dark:bg-dark-card border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-primary-300'
            }`}
          >
            <SlidersHorizontal size={16} />
            Advanced Filters {hasActiveFilters && <span className="bg-white/30 text-xs px-1.5 rounded-full">Active</span>}
          </button>
          {(hasActiveFilters || searched) && (
            <button
              type="button"
              onClick={clearFilters}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-white dark:bg-dark-card border border-gray-200 dark:border-gray-700 text-red-500 hover:border-red-300 transition-colors"
            >
              <X size={16} /> Clear All
            </button>
          )}
        </div>

        {/* Advanced Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="max-w-3xl mx-auto overflow-hidden"
            >
              <div className="glass-panel rounded-2xl p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs text-gray-500 font-medium mb-1 block">Min Fee (₹)</label>
                  <div className="relative">
                    <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="number"
                      placeholder="0"
                      value={minFee}
                      onChange={e => setMinFee(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-transparent text-sm outline-none focus:border-primary-400"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium mb-1 block">Max Fee (₹)</label>
                  <div className="relative">
                    <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="number"
                      placeholder="50000"
                      value={maxFee}
                      onChange={e => setMaxFee(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-transparent text-sm outline-none focus:border-primary-400"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium mb-1 block">Min Experience (yrs)</label>
                  <div className="relative">
                    <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="number"
                      placeholder="0"
                      value={minExperience}
                      onChange={e => setMinExperience(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-transparent text-sm outline-none focus:border-primary-400"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium mb-1 block">Min Rating</label>
                  <div className="relative">
                    <Star size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <select
                      value={minRating}
                      onChange={e => setMinRating(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-transparent text-sm outline-none focus:border-primary-400 cursor-pointer"
                    >
                      <option value="">Any</option>
                      <option value="4">4+ ⭐</option>
                      <option value="3">3+ ⭐</option>
                      <option value="2">2+ ⭐</option>
                    </select>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>

      {/* Results */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">
            {searched ? 'Search Results' : 'All Available Lawyers'}
            <span className="ml-3 text-base font-normal text-gray-500">({lawyers.length} found)</span>
          </h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          </div>
        ) : lawyers.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <Search size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-lg">No lawyers found for this criteria.</p>
            <button onClick={clearFilters} className="mt-4 text-primary-600 hover:underline text-sm">Clear filters and try again</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {lawyers.map((lawyer, i) => (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.05, 0.4) }}
                key={lawyer.lawyer_id || lawyer.id}
                className="glass-panel rounded-3xl p-6 hover:-translate-y-2 transition-transform duration-300 cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-100 to-purple-100 dark:from-primary-900/60 dark:to-purple-900/60 flex items-center justify-center text-primary-700 dark:text-primary-300 text-2xl font-bold shadow-inner">
                    {lawyer.name ? lawyer.name.charAt(0).toUpperCase() : 'L'}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {lawyer.match_score && (
                      <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1">
                        <TrendingUp size={12} />
                        {Math.round(lawyer.match_score * 100)}% Match
                      </div>
                    )}
                    {lawyer.averageRating > 0 && (
                      <div className="flex items-center gap-1">
                        {renderStars(lawyer.averageRating)}
                        <span className="text-xs text-gray-400 ml-1">({lawyer.totalReviews || 0})</span>
                      </div>
                    )}
                  </div>
                </div>

                <h3 className="text-lg font-bold mb-0.5 group-hover:text-primary-600 transition-colors">
                  {lawyer.name || 'Advocate Profile'}
                </h3>
                <p className="text-primary-600 dark:text-primary-400 font-medium text-sm mb-1">
                  {lawyer.specializationCategory || 'General Law'}
                </p>

                <div className="flex flex-wrap gap-2 mb-3 text-xs text-gray-500">
                  {lawyer.city && (
                    <span className="flex items-center gap-1">
                      <MapPin size={12} /> {lawyer.city}{lawyer.state ? `, ${lawyer.state}` : ''}
                    </span>
                  )}
                  {lawyer.experienceYears && (
                    <span className="flex items-center gap-1">
                      <Award size={12} /> {lawyer.experienceYears} yrs exp
                    </span>
                  )}
                </div>

                {lawyer.reason && (
                  <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl text-xs text-gray-600 dark:text-gray-300 mb-4">
                    <span className="font-semibold text-gray-800 dark:text-gray-200">AI Insight: </span>{lawyer.reason}
                  </div>
                )}

                {lawyer.bio && !lawyer.reason && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">{lawyer.bio}</p>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
                  <div>
                    {lawyer.consultationFee ? (
                      <span className="text-sm font-bold text-gray-800 dark:text-gray-200">₹{lawyer.consultationFee}<span className="font-normal text-xs text-gray-400">/consult</span></span>
                    ) : (
                      <span className="text-sm text-gray-400">Fee on request</span>
                    )}
                  </div>
                  <button
                    onClick={() => navigate(`/book-appointment?lawyerId=${lawyer.id}&lawyerName=${encodeURIComponent(lawyer.name || '')}`)}
                    className="flex items-center gap-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-xl transition-colors shadow-md hover:shadow-primary-500/30"
                  >
                    Book <ChevronRight size={16} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
