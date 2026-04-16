import React, { useState } from 'react';
import {
  X,
  CalendarDays,
  Clock,
  Bell,
  FileText,
  Zap,
} from 'lucide-react';
import { useLeadStore } from '../store/useLeadStore';

const ACTION_TYPES = [
  { value: 'Call',     label: 'Call',     emoji: '📞' },
  { value: 'Email',    label: 'Email',    emoji: '✉️' },
  { value: 'WhatsApp', label: 'WhatsApp', emoji: '💬' },
  { value: 'Meeting',  label: 'Meeting',  emoji: '🤝' },
];

/** Meeting requires time pickers; all others default to 9:00 AM silently */
const REQUIRES_TIME = ['Meeting'];

const inputStyle = { backgroundColor: '#f9fafb', color: '#111827' };
const inputCls =
  'w-full h-12 px-4 rounded-2xl font-semibold text-sm border-2 border-gray-300 outline-none transition-all focus:border-[#3b82f6] focus:ring-4 focus:ring-[#3b82f6]/10';
const labelCls =
  'text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5';
const labelStyle = { color: '#374151' };

/**
 * FollowUpModal — Single-step "Schedule Next Action" modal.
 *
 * SDRs pick the action type, date (and time for Meetings), add optional
 * notes, then hit "Schedule Action" to write the event to the calendar.
 */
export default function FollowUpModal({ lead, onClose }) {
  const { logFollowUp } = useLeadStore();

  const [actionType, setActionType] = useState('Call');
  const [date, setDate]             = useState('');
  const [startTime, setStartTime]   = useState('');
  const [endTime, setEndTime]       = useState('');
  const [notes, setNotes]           = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  /** Auto-sets end time to start + 1 hour, wrapping at midnight. */
  const handleStartTimeChange = (value) => {
    setStartTime(value);
    if (!value) { setEndTime(''); return; }
    const [h, m] = value.split(':').map(Number);
    const endH = String((h + 1) % 24).padStart(2, '0');
    const endM = String(m).padStart(2, '0');
    setEndTime(`${endH}:${endM}`);
  };

  const showTimePickers = REQUIRES_TIME.includes(actionType);

  // "Schedule Action" is disabled until we have at least a date,
  // and — for Meetings — a start time too.
  const canSubmit =
    date.trim() !== '' &&
    (!showTimePickers || startTime.trim() !== '');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    setIsSubmitting(true);
    try {
      await logFollowUp(lead.id, {
        // We're no longer logging "what happened" — just scheduling forward.
        // Pass a neutral activity type so the timeline still gets an entry.
        activityType: actionType,
        outcome: notes || `Scheduled: ${actionType}`,
        nextActionType: actionType,
        nextActionDate: date,
        nextActionTime: startTime || null,
        internalNotes: notes || '',
      });
      onClose();
    } catch (err) {
      console.error('Schedule action failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!lead) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg rounded-[2.5rem] border-4 border-neutral-900 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] flex flex-col overflow-hidden max-h-[92vh]"
        style={{ backgroundColor: '#ffffff', colorScheme: 'light' }}
      >
        {/* Header */}
        <div className="bg-[#3b82f6] p-6 border-b-4 border-neutral-900 relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
          >
            <X size={18} strokeWidth={3} />
          </button>

          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <CalendarDays className="text-white" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-tight leading-none">
                SCHEDULE NEXT ACTION
              </h2>
              <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mt-0.5">
                {lead.companyName}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-7 flex flex-col gap-6"
          style={{ backgroundColor: '#ffffff' }}
        >
          {/* Action Type */}
          <div className="flex flex-col gap-3">
            <label className={labelCls} style={labelStyle}>
              <Bell size={12} className="text-[#3b82f6]" /> Action Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              {ACTION_TYPES.map(({ value, label, emoji }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setActionType(value);
                    setStartTime('');
                    setEndTime('');
                  }}
                  className="py-3 px-4 rounded-2xl border-2 font-black text-sm transition-all text-left flex items-center gap-2"
                  style={{
                    borderColor:       actionType === value ? '#3b82f6' : '#e5e7eb',
                    backgroundColor:   actionType === value ? '#eff6ff' : '#f9fafb',
                    color:             actionType === value ? '#1d4ed8' : '#374151',
                    boxShadow:         actionType === value ? '3px 3px 0px #1d4ed8' : 'none',
                  }}
                >
                  <span>{emoji}</span> {label}
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div className="flex flex-col gap-2">
            <label className={labelCls} style={labelStyle}>
              <CalendarDays size={12} className="text-[#3b82f6]" /> Date
            </label>
            <input
              type="date"
              required
              value={date}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setDate(e.target.value)}
              className={inputCls}
              style={inputStyle}
            />
          </div>

          {/* Time pickers — Meeting only */}
          {showTimePickers && (
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className={labelCls} style={labelStyle}>
                  <Clock size={12} className="text-[#3b82f6]" /> Start Time
                </label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                  className={inputCls}
                  style={inputStyle}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className={labelCls} style={labelStyle}>
                  <Clock size={12} className="text-[#3b82f6]" /> End Time
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className={inputCls}
                  style={inputStyle}
                />
              </div>
            </div>
          )}

          {/* PREPARATION / CONTEXT (optional) */}
          <div className="flex flex-col gap-2">
            <label className={labelCls} style={labelStyle}>
              <FileText size={12} className="text-[#3b82f6]" /> PREPARATION / CONTEXT{' '}
              <span className="normal-case font-medium text-gray-400">(optional)</span>
            </label>

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full h-24 p-4 rounded-2xl font-medium text-sm border-2 border-gray-300 outline-none transition-all focus:border-[#3b82f6] resize-none"
              style={inputStyle}
              placeholder="e.g. Prepare pricing deck, confirm location…"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-2xl border-2 border-gray-300 font-black text-xs uppercase tracking-widest hover:bg-gray-100 transition-all"
              style={{ color: '#374151' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !canSubmit}
              className="flex-1 py-3 bg-[#3b82f6] text-white rounded-2xl border-2 border-neutral-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] font-black text-xs uppercase tracking-widest hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-x-0 disabled:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
            >
              {isSubmitting ? (
                'Saving…'
              ) : (
                <>
                  <Zap size={14} strokeWidth={3} /> Schedule Action
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
