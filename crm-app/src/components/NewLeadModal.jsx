import React, { useState, useCallback } from 'react';
import {
  X, Building, User, Mail, Phone, Globe,
  MapPin, Rocket, Search, Loader2, Sparkles,
  PenLine, CheckCircle2, AlertCircle, ChevronRight, DollarSign,
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
        className="relative w-full max-w-2xl neo-card bg-[#141414] shadow-[12px_12px_0px_0px_rgba(250,204,21,0.2)] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: '95vh' }}
      >
        {/* Header Ribbon */}
        <div className="h-2 md:h-3 bg-neo-yellow shrink-0" />

        <div className="flex-1 overflow-y-auto p-5 md:p-8">
          {/* Title Row */}
          <div className="flex justify-between items-start mb-6 md:mb-8">
            <div className="pr-8">
              <h2 className="text-xl md:text-3xl font-black uppercase tracking-tighter text-slate-100">New Lead Entry</h2>
              <p className="text-[10px] md:text-xs text-slate-400 mt-1 font-medium">
                {mode === 'auto' ? 'Auto-discover leads via Google Maps' : 'Manually fill in lead details'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-black bg-white text-black flex items-center justify-center hover:rotate-90 transition-transform"
            >
              <X size={18} strokeWidth={3} />
            </button>
          </div>

          {/* ── Segmented Toggle ── */}
          <div className="flex gap-1 p-1 rounded-2xl bg-black/60 border border-white/10 mb-6 md:mb-8">
            <button
              onClick={() => setMode('auto')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-2 md:px-4 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${
                mode === 'auto'
                  ? 'bg-neo-yellow text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles size={14} />
              <span className="hidden xs:inline">Auto-Scrape</span>
              <span className="xs:hidden">Auto</span>
            </button>
            <button
              onClick={() => setMode('manual')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-2 md:px-4 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${
                mode === 'manual'
                  ? 'bg-white text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <PenLine size={14} />
              <span className="hidden xs:inline">Manual Entry</span>
              <span className="xs:hidden">Manual</span>
            </button>
          </div>

          {/* ════════════════ AUTO-SCRAPE VIEW ════════════════ */}
          {mode === 'auto' && (
            <div className="space-y-6">
              {/* Search Box */}
              <div className="space-y-3">
                <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">
                  Search Google Maps
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !isSearching && handleSearch()}
                      className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-white/10 bg-black text-white focus:border-neo-yellow focus:ring-4 focus:ring-neo-yellow/20 outline-none font-bold text-base md:text-sm placeholder:text-slate-600 transition-all"
                      placeholder="e.g. dental clinics in Doha"
                      disabled={isSearching}
                    />
                  </div>
                  <button
                    onClick={handleSearch}
                    disabled={isSearching || !searchQuery.trim()}
                    className="flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-neo-yellow text-black font-black uppercase tracking-widest text-xs shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:scale-102 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {isSearching ? <Spinner /> : <Search size={16} />}
                    {isSearching ? 'Scanning...' : 'Search'}
                  </button>
                </div>
              </div>

              {/* ... Rest of auto-scrape results (unchanged list structure, but cards should be tight) ... */}
              {!isSearching && scrapedLeads.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3 sticky top-0 bg-[#141414] py-2 z-10">
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 whitespace-nowrap">
                      {scrapedLeads.length} Results
                    </p>
                    <div className="h-px flex-1 bg-white/5" />
                    <button
                      onClick={handlePullAll}
                      disabled={isPullingAll || savedIds.size === scrapedLeads.length}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-neo-yellow text-black font-black uppercase tracking-widest text-[9px] md:text-[10px] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:scale-95 transition-all disabled:opacity-50"
                    >
                      {isPullingAll ? <><Spinner /> Pulling...</> : savedIds.size === scrapedLeads.length ? '✓ All Pulled' : <><Rocket size={12} /> Pull All</>}
                    </button>
                  </div>
                  <div className="space-y-3 pb-4">
                    {scrapedLeads.map((lead, idx) => (
                      <ScrapedResultCard
                        key={idx}
                        lead={lead}
                        saved={savedIds.has(idx)}
                        onSelect={() => handleSelectLead(lead, idx)}
                      />
                    ))}
                  </div>
                </div>
              )}
              {/* ... Empty states remain as they are, they are already simple ... */}
              {!isSearching && scrapedLeads.length === 0 && searchQuery && (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-center border-2 border-dashed border-white/10 rounded-2xl">
                  <Search size={28} className="text-slate-400" />
                  <p className="text-sm font-bold text-slate-300">No results yet</p>
                </div>
              )}
              {!isSearching && scrapedLeads.length === 0 && !searchQuery && (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-center border-2 border-dashed border-white/10 rounded-2xl">
                  <Sparkles size={28} className="text-neo-yellow" />
                  <p className="text-sm font-bold text-slate-300">Search to discover leads</p>
                </div>
              )}
            </div>
          )}

          {/* ════════════════ MANUAL ENTRY VIEW ════════════════ */}
          {mode === 'manual' && (
            <form onSubmit={handleSubmit} className="space-y-6 pb-20 md:pb-0">
              {formError && (
                <div className="p-4 bg-red-500/20 border-2 border-red-500 text-red-200 text-sm font-bold rounded-xl flex items-center gap-2">
                  <AlertCircle size={16} />
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                <div className="space-y-2">
                  <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                    Lead Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input
                      type="text"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleChange}
                      required
                      placeholder="e.g. John Doe"
                      className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-white/10 bg-black text-white outline-none font-medium text-base md:text-sm focus:border-neo-yellow transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                    Company
                  </label>
                  <div className="relative">
                    <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input
                      type="text"
                      name="company_name"
                      value={formData.company_name}
                      onChange={handleChange}
                      placeholder="Acme Corp"
                      className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-white/10 bg-black text-white outline-none font-medium text-base md:text-sm focus:border-neo-yellow transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="john@example.com"
                      className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-white/10 bg-black text-white outline-none font-medium text-base md:text-sm focus:border-neo-yellow transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                    Deal Value ($)
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input
                      type="number"
                      name="deal_value"
                      value={formData.deal_value}
                      onChange={handleChange}
                      className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-white/10 bg-black text-white outline-none font-medium text-base md:text-sm focus:border-neo-yellow transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                <div className="space-y-2">
                  <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                    Website
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input
                      type="url"
                      name="website"
                      value={formData.website}
                      onChange={handleChange}
                      className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-white/10 bg-black text-white outline-none font-medium text-base md:text-sm focus:border-neo-yellow transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                    Phone
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-white/10 bg-black text-white outline-none font-medium text-base md:text-sm focus:border-neo-yellow transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Desktop Footer Only */}
              <div className="hidden md:flex items-center justify-end gap-4 pt-6 mt-6 border-t border-white/5">
                <button
                  type="button"
                  onClick={onClose}
                  className="font-black uppercase tracking-widest text-xs text-gray-500 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="neo-button bg-neo-blue text-white px-10 py-4 uppercase tracking-widest text-xs font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:scale-105 active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Add to Pool'}
                </button>
              </div>

              {/* Mobile Sticky Footer */}
              <div className="md:hidden fixed bottom-4 left-4 right-4 z-50">
                 <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-neo-blue text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Add Lead to Pool'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
});
