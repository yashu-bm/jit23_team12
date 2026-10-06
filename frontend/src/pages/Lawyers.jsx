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
      .then(res => { 
        setLawyers(res.data); 
        setLoading(false); 
      })
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
      .then(res => { 
        setLawyers(res.data); 
        setLoading(false); 
      })
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
    <div className="p-6 max-w-7xl mx-auto space-y-8 min-h-screen">
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-primary-950 via-slate-900 to-brand-indigo text-white p-12 shadow-2xl text-center border border-slate-800">
        <div className="absolute top-0 right-0 w-full h-full opacity-30 pointer-events-none">
          <div className="absolute top-[-50%] left-[-20%] w-[60%] h-[200%] bg-gradient-to-r from-brand-purple to-transparent blur-[150px] rounded-full mix-blend-overlay"></div>
        </div>
        <div className="relative z-10 max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
            Find the Right <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-primary-400">Legal Expert</span>
          </h1>
          <p className="text-slate-300 text-lg font-medium opacity-90 leading-relaxed">
            Our AI-powered recommendation system matches you with top-rated verified lawyers based on your specific case type, location, and budget.
          </p>
        </div>
      </div>

      {/* Modern Search Bar */}
      <form onSubmit={handleSearch} className="space-y-6 relative z-20 -mt-12 px-4 max-w-4xl mx-auto">
        <div className="glass-panel p-2 rounded-full shadow-2xl flex flex-col md:flex-row items-center bg-white/90 dark:bg-slate-900/90 border border-white/50 dark:border-slate-700 backdrop-blur-xl">
          <div className="w-full md:w-1/2 flex items-center px-6 py-2 border-b md:border-b-0 md:border-r border-gray-200 dark:border-slate-700">
            <Briefcase className="text-primary-500 mr-3 flex-shrink-0" size={22} />
            <select
              className="w-full bg-transparent outline-none py-2 text-gray-800 dark:text-gray-100 cursor-pointer font-medium appearance-none"
              value={category}
              onChange={e => setCategory(e.target.value)}
            >
              <option value="">All Case Types</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="w-full md:w-1/2 flex items-center px-6 py-2">
            <MapPin className="text-primary-500 mr-3 flex-shrink-0" size={22} />
            <input
              type="text"
              placeholder="Location (City / State)"
              className="w-full bg-transparent outline-none py-2 text-gray-800 dark:text-gray-100 font-medium placeholder-gray-400"
              value={location}
              onChange={e => setLocation(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="w-full md:w-auto mt-2 md:mt-0 bg-primary-600 hover:bg-primary-700 text-white rounded-full p-4 md:px-8 flex items-center justify-center transition-transform hover:scale-105 shadow-glow"
          >
            {loading ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <span className="flex items-center gap-2 font-bold"><Search size={20} /> <span className="md:hidden">Search</span></span>}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {lawyers.map((lawyer, i) => (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.05, 0.4) }}
                key={lawyer.lawyer_id || lawyer.id}
                className="glass-card rounded-[2rem] p-6 hover:-translate-y-2 transition-all duration-300 cursor-pointer group flex flex-col h-full bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700"
              >
                <div className="flex justify-between items-start mb-5">
                  <div className="relative group/avatar">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-2xl font-bold shadow-md border-4 border-white transition-transform duration-300 group-hover:scale-110 overflow-hidden relative z-10">
                      <span className="text-white">{lawyer.name ? lawyer.name.charAt(0).toUpperCase() : 'L'}</span>
                      {lawyer.profileImageUrl && (
                        <img 
                          src={lawyer.profileImageUrl} 
                          alt={lawyer.name} 
                          className="absolute inset-0 w-full h-full object-cover" 
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      )}
                    </div>
                    <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-primary-400 to-brand-purple opacity-0 group-hover:opacity-100 blur transition duration-300 z-0"></div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
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

                <h3 className="text-xl font-extrabold mb-1 text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                  {lawyer.name || 'Advocate Profile'}
                </h3>
                <p className="text-primary-600 dark:text-primary-400 font-bold text-sm mb-3">
                  {lawyer.specializationCategory || 'General Law'}
                </p>

                <div className="flex flex-wrap gap-2 mb-4 text-xs font-medium text-gray-500">
                  {lawyer.city && (
                    <span className="flex items-center gap-1.5 bg-gray-100 dark:bg-slate-700/50 px-2.5 py-1 rounded-lg">
                      <MapPin size={14} className="text-primary-500" /> {lawyer.city}{lawyer.state ? `, ${lawyer.state}` : ''}
                    </span>
                  )}
                  {lawyer.experienceYears && (
                    <span className="flex items-center gap-1.5 bg-gray-100 dark:bg-slate-700/50 px-2.5 py-1 rounded-lg">
                      <Award size={14} className="text-primary-500" /> {lawyer.experienceYears} yrs exp
                    </span>
                  )}
                </div>

                {lawyer.reason && (
                  <div className="bg-indigo-50/80 dark:bg-indigo-900/20 p-3.5 rounded-xl text-sm text-gray-700 dark:text-gray-300 mb-4 border border-indigo-100 dark:border-indigo-800/50 shadow-sm flex-1">
                    <span className="font-bold text-indigo-700 dark:text-indigo-400 block mb-1">AI Match Reason: </span>
                    <span className="line-clamp-3">{lawyer.reason}</span>
                  </div>
                )}

                {lawyer.bio && !lawyer.reason && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-3 flex-1 leading-relaxed">{lawyer.bio}</p>
                )}
                {!lawyer.bio && !lawyer.reason && <div className="flex-1"></div>}

                <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-slate-700 mt-auto">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Consultation Fee</span>
                    {lawyer.consultationFee ? (
                      <span className="text-lg font-extrabold text-gray-900 dark:text-white">₹{lawyer.consultationFee}</span>
                    ) : (
                      <span className="text-sm font-semibold text-gray-500">Upon Request</span>
                    )}
                  </div>
                  <button
                    onClick={() => navigate(`/book-appointment?lawyerId=${lawyer.id}&lawyerName=${encodeURIComponent(lawyer.name || '')}`)}
                    className="btn-premium px-5 py-2.5 text-sm flex items-center gap-1"
                  >
                    Book Now <ChevronRight size={16} />
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
