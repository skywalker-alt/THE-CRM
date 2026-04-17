import React, { useState, useCallback } from 'react';
import {
  X, Building, User, Mail, Phone, Globe,
  MapPin, Rocket, Search, Loader2, Sparkles,
  PenLine, CheckCircle2, AlertCircle, ChevronRight,
} from 'lucide-react';
import { useLeadStore } from '../store/useLeadStore';
import { supabase } from '../lib/supabase';

// ─── Toast helper (inline, no extra deps) ────────────────────────────────────
function Toast({ message, type, onDismiss }) {
  return (
    <div
      className={`fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-5 py-4 rounded-2xl border-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-sm font-bold animate-in slide-in-from-bottom-4 transition-all ${
        type === 'error'
          ? 'bg-red-950 border-red-500 text-red-200'
          : 'bg-emerald-950 border-emerald-500 text-emerald-200'
      }`}
    >
      {type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
      <span>{message}</span>
      <button onClick={onDismiss} className="ml-2 opacity-60 hover:opacity-100">
        <X size={14} />
      </button>
    </div>
  );
}

// ─── Spinner ─────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <Loader2
      size={18}
      className="animate-spin"
      style={{ animation: 'spin 0.8s linear infinite' }}
    />
  );
}

// ─── ScrapedResultCard ────────────────────────────────────────────────────────
function ScrapedResultCard({ lead, saved, onSelect }) {
  return (
    <div className={`flex items-center justify-between gap-4 p-4 rounded-xl bg-black/40 border transition-all group ${saved ? 'border-emerald-500/40 bg-emerald-950/20' : 'border-white/10 hover:border-[var(--neo-cyan)]/40'}`}>
      <div className="flex-1 min-w-0">
        <p className="font-black text-white text-sm truncate">{lead.name}</p>
        {lead.location && (
          <p className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1 truncate">
            <MapPin size={10} /> {lead.location}
          </p>
        )}
        {lead.phone && (
          <p className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1">
            <Phone size={10} /> {lead.phone}
          </p>
        )}
        {lead.website && (
          <p className="text-[11px] text-[var(--neo-cyan)] mt-0.5 truncate">
            {lead.website.replace(/^https?:\/\//, '')}
          </p>
        )}
      </div>
      {saved ? (
        <div className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-widest">
          <CheckCircle2 size={12} /> Added
        </div>
      ) : (
        <button
          onClick={onSelect}
          className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--neo-cyan)]/10 border border-[var(--neo-cyan)]/30 text-[var(--neo-cyan)] text-xs font-black uppercase tracking-widest hover:bg-[var(--neo-cyan)]/20 hover:scale-105 active:scale-95 transition-all"
        >
          Select <ChevronRight size={12} />
        </button>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export const NewLeadModal = React.memo(function NewLeadModal({ onClose }) {
  // ✅ CRITICAL FIX: Use a stable selector so this component ONLY re-renders
  // when `addLead` changes — which it never does in Zustand. Without this,
  // ANY store update (isLoading, globalPool, etc.) causes a re-render and
  // drops focus from the active input.
  const addLead = useLeadStore((state) => state.addLead);

  // Toggle: 'auto' | 'manual'
  const [mode, setMode] = useState('auto');

  // Manual form state
  const [formData, setFormData] = useState({
    full_name: '',
    company_name: '',
    email: '',
    phone: '',
    website: '',
    linkedin_url: '',
    industry: '',
    location: '',
    deal_value: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Auto-scrape state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [scrapedLeads, setScrapedLeads] = useState([]);
  const [savedIds, setSavedIds] = useState(new Set());
  const [isPullingAll, setIsPullingAll] = useState(false);

  // Toast state
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  }, []);

  // ── Manual form handlers ────────────────────────────────────────────────────
  // ✅ CRITICAL FIX: useCallback ensures handleChange has a stable identity.
  // Without this, every render creates a new function, which React treats as a
  // new prop — triggering DOM reconciliation that drops focus.
  const handleChange = useCallback((e) => {
    const { name, value, type } = e.target;
    if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: value === '' ? '' : parseFloat(value) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  }, []); // Empty deps — setFormData from useState is always stable

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);
    try {
      await addLead(formData);
      showToast('Lead added to pool!', 'success');
      onClose();
    } catch (err) {
      setFormError(err.message || 'Failed to create lead.');
      setIsSubmitting(false);
    }
  }, [addLead, formData, onClose, showToast]);

  // ── Auto-scrape handler ─────────────────────────────────────────────────────
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setScrapedLeads([]);

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (sessionError || !accessToken) {
        throw new Error('You must be logged in to use Auto-Scrape.');
      }

      const { data, error } = await supabase.functions.invoke('apify-scraper', {
        body: { searchQuery: searchQuery.trim() },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (error) throw new Error(error.message || 'Edge Function invocation failed.');
      if (data?.error) throw new Error(data.error);

      setScrapedLeads(data?.leads || []);

      if (!data?.leads?.length) {
        showToast('No results found. Try a different search.', 'error');
      }
    } catch (err) {
      console.error('[AutoScrape]', err);
      showToast(`Failed to fetch leads: ${err.message}`, 'error');
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, showToast]);

  const handleSelectLead = useCallback(async (lead, idx) => {
    try {
      await addLead({
        company_name: lead.name,
        website:      lead.website,
        location:     lead.location,
        phone:        lead.phone,
      });
      setSavedIds(prev => new Set([...prev, idx]));
    } catch (err) {
      showToast(`Failed to add lead: ${err.message}`, 'error');
    }
  }, [addLead, showToast]);

  const handlePullAll = useCallback(async () => {
    setIsPullingAll(true);
    let successCount = 0;
    const newSaved = new Set(savedIds);
    for (let idx = 0; idx < scrapedLeads.length; idx++) {
      if (newSaved.has(idx)) continue;
      try {
        await addLead({
          company_name: scrapedLeads[idx].name,
          website:      scrapedLeads[idx].website,
          location:     scrapedLeads[idx].location,
          phone:        scrapedLeads[idx].phone,
        });
        newSaved.add(idx);
        successCount++;
      } catch (err) {
        console.error(`Failed to add ${scrapedLeads[idx].name}:`, err.message);
      }
    }
    setSavedIds(newSaved);
    setIsPullingAll(false);
    if (successCount > 0) showToast(`${successCount} lead${successCount > 1 ? 's' : ''} added to pool!`, 'success');
  }, [addLead, savedIds, scrapedLeads, showToast]);


  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Toast — rendered inside the fixed wrapper, NOT as a sibling above it */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}

      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div
        className="relative w-full max-w-2xl neo-card bg-[#141414] shadow-[12px_12px_0px_0px_rgba(250,204,21,0.2)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Header Ribbon */}
        <div className="h-3 bg-neo-yellow" />

        <div className="p-8">
          {/* Title Row */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-100">New Lead Entry</h2>
              <p className="text-xs text-slate-300 mt-1 font-medium">
                {mode === 'auto' ? 'Auto-discover leads — hit Select or Pull All to add to pool' : 'Manually fill in lead details'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full border-2 border-black bg-white text-black flex items-center justify-center hover:rotate-90 transition-transform"
            >
              <X size={20} strokeWidth={3} />
            </button>
          </div>

          {/* ── Segmented Toggle ── */}
          <div className="flex gap-1 p-1 rounded-2xl bg-black/60 border border-white/10 mb-8">
            <button
              onClick={() => setMode('auto')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                mode === 'auto'
                  ? 'bg-neo-yellow text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Sparkles size={14} />
              Auto-Scrape
            </button>
            <button
              onClick={() => setMode('manual')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                mode === 'manual'
                  ? 'bg-white text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <PenLine size={14} />
              Manual Entry
            </button>
          </div>

          {/* ════════════════ AUTO-SCRAPE VIEW ════════════════ */}
          {mode === 'auto' && (
            <div className="space-y-6">
              {/* Search Box */}
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-300 ml-2">
                  Search Google Maps
                </label>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !isSearching && handleSearch()}
                      className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-white/10 bg-black text-white focus:border-neo-yellow focus:ring-4 focus:ring-neo-yellow/20 outline-none font-bold text-sm placeholder:text-slate-500 transition-all"
                      placeholder="e.g. dental clinics in Doha"
                      disabled={isSearching}
                    />
                  </div>
                  <button
                    onClick={handleSearch}
                    disabled={isSearching || !searchQuery.trim()}
                    className="flex items-center gap-2 px-6 py-4 rounded-2xl bg-neo-yellow text-black font-black uppercase tracking-widest text-xs shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:scale-105 active:scale-95 transition-all disabled:bg-white/10 disabled:text-slate-400 disabled:shadow-none disabled:scale-100 disabled:cursor-not-allowed"
                  >
                    {isSearching ? <Spinner /> : <Search size={16} />}
                    {isSearching ? 'Scanning...' : 'Search'}
                  </button>
                </div>
              </div>

              {/* Loading State */}
              {isSearching && (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-neo-yellow/20 border-t-neo-yellow animate-spin" />
                    <MapPin
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-neo-yellow"
                      size={20}
                    />
                  </div>
                  <p className="text-sm font-black uppercase tracking-widest text-gray-400 animate-pulse">
                    Scanning Google Maps...
                  </p>
                  <p className="text-xs text-gray-600">Fetching top 5 results via Apify</p>
                </div>
              )}

              {/* Results List */}
              {!isSearching && scrapedLeads.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 whitespace-nowrap">
                      {scrapedLeads.length} Results
                    </p>
                    <div className="h-px flex-1 bg-white/5" />
                    <button
                      onClick={handlePullAll}
                      disabled={isPullingAll || savedIds.size === scrapedLeads.length}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-neo-yellow text-black font-black uppercase tracking-widest text-[10px] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:scale-105 active:scale-95 transition-all disabled:bg-white/10 disabled:text-slate-400 disabled:shadow-none disabled:scale-100 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {isPullingAll ? <><Spinner /> Pulling...</> : savedIds.size === scrapedLeads.length ? '✓ All Pulled' : <><Rocket size={12} /> Pull All</>}
                    </button>
                  </div>
                  {scrapedLeads.map((lead, idx) => (
                    <ScrapedResultCard
                      key={idx}
                      lead={lead}
                      saved={savedIds.has(idx)}
                      onSelect={() => handleSelectLead(lead, idx)}
                    />
                  ))}
                </div>
              )}

              {/* Empty State (after search with no results) */}
              {!isSearching && scrapedLeads.length === 0 && searchQuery && (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-center border-2 border-dashed border-white/10 rounded-2xl">
                  <Search size={28} className="text-slate-400" />
                  <p className="text-sm font-bold text-slate-300">No results yet</p>
                  <p className="text-xs text-slate-400">
                    Try searching for "cafes in Doha" or "clinics in West Bay"
                  </p>
                </div>
              )}

              {/* Prompt State (before search) */}
              {!isSearching && scrapedLeads.length === 0 && !searchQuery && (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-center border-2 border-dashed border-white/10 rounded-2xl">
                  <Sparkles size={28} className="text-neo-yellow" />
                  <p className="text-sm font-bold text-slate-300">Search to auto-discover leads</p>
                  <p className="text-xs text-slate-400">
                    Powered by Apify Google Maps Extractor • Free tier: 5 results/search
                  </p>
                </div>
              )}

              {/* Switch to manual hint */}
              <p className="text-center text-xs text-slate-400 pt-2">
                Or{' '}
                <button
                  onClick={() => setMode('manual')}
                  className="text-[var(--neo-cyan)] font-bold hover:underline"
                >
                  enter details manually →
                </button>
              </p>
            </div>
          )}

          {/* ════════════════ MANUAL ENTRY VIEW ════════════════ */}
          {mode === 'manual' && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Auto-fill Banner */}
              {formData.company_name && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-[var(--neo-cyan)]/5 border border-[var(--neo-cyan)]/20 text-[var(--neo-cyan)] text-xs font-bold">
                  <CheckCircle2 size={16} />
                  Auto-filled from scrape results — add contact details &amp; deal value to finish.
                </div>
              )}

              {formError && (
                <div className="p-4 bg-red-500/20 border-2 border-red-500 text-red-200 text-sm font-bold rounded-xl flex items-center gap-2">
                  <AlertCircle size={16} />
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Lead Name */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-300 ml-2">
                    Lead Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleChange}
                      required
                      placeholder="e.g. John Doe"
                      className="w-full pl-12 pr-4 py-3 rounded-2xl border-2 border-dashed border-gray-600 bg-black text-white placeholder-slate-500 outline-none font-medium text-sm focus:border-white/30 transition-all"
                    />
                  </div>
                </div>

                {/* Company */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-300 ml-2">
                    Company
                  </label>
                  <div className="relative">
                    <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      name="company_name"
                      value={formData.company_name}
                      onChange={handleChange}
                      placeholder="Acme Corp"
                      className="w-full pl-12 pr-4 py-3 rounded-2xl border-2 border-dashed border-gray-600 bg-black text-white placeholder-slate-500 outline-none font-medium text-sm focus:border-white/30 transition-all"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-300 ml-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="john@example.com"
                      className="w-full pl-12 pr-4 py-3 rounded-2xl border-2 border-dashed border-gray-600 bg-black text-white placeholder-slate-500 outline-none font-medium text-sm focus:border-white/30 transition-all"
                    />
                  </div>
                </div>

                {/* Deal Value */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-300 ml-2">
                    Deal Value ($)
                  </label>
                  <div className="relative">
                    <Rocket className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="number"
                      name="deal_value"
                      value={formData.deal_value}
                      onChange={handleChange}
                      placeholder="5000"
                      className="w-full pl-12 pr-4 py-3 rounded-2xl border-2 border-dashed border-gray-600 bg-black text-white placeholder-slate-500 outline-none font-medium text-sm focus:border-white/30 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Website */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-300 ml-2">
                    Website
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="url"
                      name="website"
                      value={formData.website}
                      onChange={handleChange}
                      className="w-full pl-12 pr-4 py-3 rounded-2xl border-2 border-dashed border-gray-600 bg-black text-white placeholder-slate-500 outline-none font-medium text-sm focus:border-white/30 transition-all"
                      placeholder="Website URL"
                    />
                  </div>
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-300 ml-2">
                    Location
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      className="w-full pl-12 pr-4 py-3 rounded-2xl border-2 border-dashed border-gray-600 bg-black text-white placeholder-slate-500 outline-none font-medium text-sm focus:border-white/30 transition-all"
                      placeholder="Location"
                    />
                  </div>
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-300 ml-2">
                  Phone
                </label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-3 rounded-2xl border-2 border-dashed border-gray-600 bg-black text-white placeholder-slate-500 outline-none font-medium text-sm focus:border-white/30 transition-all"
                    placeholder="+974 xxxx xxxx"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-4 pt-6 mt-6 border-t border-white/5">
                <button
                  type="button"
                  onClick={onClose}
                  className="font-black uppercase tracking-widest text-xs text-gray-500 hover:text-white transition-colors"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="neo-button bg-[var(--neo-blue)] text-white px-10 py-4 uppercase tracking-widest text-xs font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <Spinner /> Saving...
                    </span>
                  ) : (
                    'Add to Pool'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
});
