import React, { useEffect } from 'react';
import { useLeadStore } from '../store/useLeadStore';
import { Building, Globe, Mail, Phone, Rocket, Search } from 'lucide-react';

/**
 * GlobalPoolView
 * Displaying unassigned leads in a high-density, gamified Neo-Memphis grid.
 */
export function GlobalPoolView({ onLeadClick }) {
  // ✅ Use stable selectors to prevent unnecessary re-renders
  const globalPool = useLeadStore((state) => state.globalPool);
  const isLoading = useLeadStore((state) => state.isLoading);
  const claimLead = useLeadStore((state) => state.claimLead);

  useEffect(() => {
    // Use getState() to avoid putting fetchGlobalPool in the dep array,
    // which would cause a re-run loop every time isLoading toggles.
    useLeadStore.getState().fetchGlobalPool();
  }, []); // Fetch once on mount

  if (isLoading && globalPool.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-bounce w-12 h-12 bg-[var(--neo-blue)] rounded-full border-2 border-black" />
      </div>
    );
  }

  if (globalPool.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] relative">
        <div className="blob-shape blob-cyan top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        <div className="p-12 text-center max-w-md bg-white border border-slate-200 shadow-sm rounded-2xl">
          <Rocket className="w-16 h-16 mx-auto mb-6 text-[var(--neo-magenta)]" />
          <h2 className="text-3xl font-bold mb-4 text-slate-900">Pool is empty!</h2>
          <p className="text-slate-500 font-medium italic">No leads to claim right now. Check back soon for fresh opportunities.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Search/Filter Bar - Neo Style */}
      <div className="mb-12 flex justify-between items-center w-full">

        <div className="bg-[#facc15] border-2 border-black rounded-full px-8 py-5 font-black uppercase text-sm tracking-widest text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center shrink-0">
          {globalPool.length} LEADS ACTIVE
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {globalPool.map((lead) => (
          <div 
            key={lead.id} 
            className="flex flex-col h-full group overflow-hidden bg-white border border-slate-200 shadow-sm rounded-2xl hover:shadow-md transition-shadow"
          >
            <div className="p-6 flex-1 cursor-pointer" onClick={() => onLeadClick(lead.id)}>
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-xl">
                  {lead.companyName?.charAt(0) || 'L'}
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                  {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : 'Fresh'}
                </div>
              </div>

              <h3 className="text-xl font-bold mb-1 line-clamp-1 text-slate-900">{lead.companyName}</h3>
              <p className="text-sm text-slate-600 font-medium mb-4">{lead.fullName}</p>
              
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Building size={14} className="text-neo-yellow" />
                  <span className="truncate">{lead.industry || 'Unknown Industry'}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Mail size={14} className="text-[var(--neo-cyan)]" />
                  <span className="truncate">{lead.email || 'No email provided'}</span>
                </div>
              </div>
            </div>

            {/* Claim Action */}
            <div className="p-4 bg-slate-50 mt-auto border-t border-slate-100">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  claimLead(lead.id);
                }}
                className="w-full bg-neutral-900 text-white hover:bg-neutral-800 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-colors"
              >
                <Rocket size={18} />
                <span>Claim Now</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
