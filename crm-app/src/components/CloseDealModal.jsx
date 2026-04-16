import React, { useState } from 'react';
import { 
  X, 
  DollarSign, 
  CheckCircle, 
  FileText, 
  AlertCircle,
  Building2,
  Rocket
} from 'lucide-react';
import { useLeadStore } from '../store/useLeadStore';

/**
 * CloseDealModal — Fixed & Polished
 * Bugs fixed:
 *  • Input/textarea text now explicitly dark (#111827) to override global body color
 *  • Cancel button has explicit text color
 *  • Layout: modal = flex col with max-h-[90vh], form scrolls inside, footer pinned
 */
export default function CloseDealModal({ lead, onClose }) {
  const { closeLead } = useLeadStore();
  const [formData, setFormData] = useState({
    finalDealValue: lead?.dealValue ?? 0,
    outcome: 'Closed Won',
    closingNotes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await closeLead(lead.id, formData);
      onClose();
    } catch (error) {
      console.error('Failed to close lead:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!lead) return null;

  // inputCls — hardcoded to force light appearance regardless of global dark theme
  const inputCls = "w-full h-14 px-5 rounded-2xl font-bold text-base border-2 border-gray-300 outline-none transition-all focus:border-[#3b82f6] focus:ring-4 focus:ring-[#3b82f6]/10";
  const inputStyle = { backgroundColor: '#f9fafb', color: '#111827' };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal — flex col, capped height, light color-scheme */}
      <div
        className="relative w-full max-w-2xl rounded-[2.5rem] border-4 border-neutral-900 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] flex flex-col overflow-hidden max-h-[90vh]"
        style={{ backgroundColor: '#ffffff', colorScheme: 'light' }}
      >
        {/* Header */}
        <div className="bg-[#3b82f6] p-7 border-b-4 border-neutral-900 relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
          >
            <X size={20} strokeWidth={3} />
          </button>
          <div className="flex items-center gap-3 mb-0.5">
            <div className="p-2 bg-white/20 rounded-xl">
              <Building2 className="text-white" size={22} />
            </div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight leading-none">
              CLOSE DEAL — {lead.companyName}
            </h2>
          </div>
          <p className="text-white/75 font-bold text-[10px] uppercase tracking-[0.2em] ml-12">
            Finalize Contract Details
          </p>
        </div>

        {/* Scrollable form body */}
        <form
          id="close-deal-form"
          onSubmit={handleSubmit}
          className="flex-1 min-h-0 overflow-y-auto p-8 flex flex-col gap-6"
          style={{ backgroundColor: '#ffffff' }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Final Deal Value */}
            <div className="flex flex-col gap-2">
              <label
                className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5"
                style={{ color: '#374151' }}
              >
                <DollarSign size={13} className="text-[#3b82f6]" />
                Final Deal Value ($)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={formData.finalDealValue}
                onChange={(e) =>
                  setFormData({ ...formData, finalDealValue: e.target.value === '' ? '' : parseFloat(e.target.value) })
                }
                className={inputCls}
                style={inputStyle}
                placeholder="0.00"
                required
              />
            </div>

            {/* Deal Outcome */}
            <div className="flex flex-col gap-2">
              <label
                className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5"
                style={{ color: '#374151' }}
              >
                <CheckCircle size={13} className="text-[#3b82f6]" />
                Deal Outcome
              </label>
              <select
                value={formData.outcome}
                onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
                className="w-full h-14 px-5 rounded-2xl font-bold text-base border-2 border-gray-300 outline-none transition-all focus:border-[#3b82f6] cursor-pointer appearance-none"
                style={{
                  backgroundColor: formData.outcome === 'Closed Won' ? '#f0fdf4' : '#fff1f2',
                  color: formData.outcome === 'Closed Won' ? '#16a34a' : '#dc2626',
                }}
              >
                <option value="Closed Won">✅ Closed Won</option>
                <option value="Closed Lost">❌ Closed Lost</option>
              </select>
            </div>
          </div>

          {/* Closing Notes */}
          <div className="flex flex-col gap-2">
            <label
              className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5"
              style={{ color: '#374151' }}
            >
              <FileText size={13} className="text-[#3b82f6]" />
              Closing Notes / Reason
            </label>
            <textarea
              value={formData.closingNotes}
              onChange={(e) => setFormData({ ...formData, closingNotes: e.target.value })}
              className="w-full h-40 p-5 rounded-[1.5rem] font-medium text-sm border-2 border-gray-300 outline-none transition-all focus:border-[#3b82f6] focus:ring-4 focus:ring-[#3b82f6]/10 resize-none"
              style={inputStyle}
              placeholder="Why did we win or lose this deal? Mention competitors, pricing pushes, or specific features..."
              required
            />
          </div>

          {/* Warning Banner */}
          <div
            className="rounded-2xl p-4 flex gap-3 items-start border-2"
            style={{ backgroundColor: '#fefce8', borderColor: '#fde047' }}
          >
            <AlertCircle className="shrink-0 mt-0.5" size={16} style={{ color: '#ca8a04' }} />
            <p className="text-[11px] font-semibold leading-relaxed" style={{ color: '#713f12' }}>
              This action moves the deal out of your active pipeline. Closing notes are critical business intelligence for future forecasting.
            </p>
          </div>
        </form>

        {/* Footer — always pinned at bottom */}
        <div
          className="p-6 border-t-2 border-gray-200 flex items-center justify-end gap-4 shrink-0"
          style={{ backgroundColor: '#f9fafb' }}
        >
          <button
            type="button"
            onClick={onClose}
            className="px-8 py-3 rounded-2xl border-2 border-gray-400 font-black text-xs uppercase tracking-widest hover:bg-gray-200 transition-all"
            style={{ color: '#374151' }}
          >
            Cancel
          </button>

          <button
            type="submit"
            form="close-deal-form"
            disabled={isSubmitting}
            className="px-8 py-3 bg-[#3b82f6] text-white rounded-2xl border-2 border-neutral-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-black text-xs uppercase tracking-widest hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all flex items-center gap-2 disabled:opacity-60"
          >
            {isSubmitting ? 'Syncing...' : 'Confirm Closure'}
            <Rocket size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
