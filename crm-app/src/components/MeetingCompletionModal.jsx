import React, { useState } from 'react';
import { 
  X, 
  CheckCircle2, 
  Zap, 
  CalendarDays, 
  Clock, 
  MessageSquare,
  ArrowRight,
  Bell,
  FileText
} from 'lucide-react';
import { useCalendarStore } from '../store/useCalendarStore';
import { useLeadStore } from '../store/useLeadStore';

const ACTION_TYPES = [
  { value: 'Call',     label: 'Call',     emoji: '📞' },
  { value: 'Email',    label: 'Email',    emoji: '✉️' },
  { value: 'WhatsApp', label: 'WhatsApp', emoji: '💬' },
  { value: 'Meeting',  label: 'Meeting',  emoji: '🤝' },
];

const REQUIRES_TIME = ['Meeting'];

const inputStyle = { backgroundColor: '#1a1a1a', color: '#ffffff', borderColor: '#333333' };
const labelCls = 'text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 text-gray-400';

export default function MeetingCompletionModal({ event, onClose }) {
  const { completeEventWithRecap } = useCalendarStore();
  const { logFollowUp } = useLeadStore();

  // Section A: Recap
  const [recap, setRecap] = useState('');

  // Section B: Next Step
  const [nextActionType, setNextActionType] = useState('Call');
  const [nextDate, setNextDate]             = useState('');
  const [nextStartTime, setNextStartTime]   = useState('');
  const [nextEndTime, setNextEndTime]       = useState('');
  const [prepNotes, setPrepNotes]           = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleStartTimeChange = (value) => {
    setNextStartTime(value);
    if (!value) { setNextEndTime(''); return; }
    const [h, m] = value.split(':').map(Number);
    const endH = String((h + 1) % 24).padStart(2, '0');
    const endM = String(m).padStart(2, '0');
    setNextEndTime(`${endH}:${endM}`);
  };

  const showTimePickers = REQUIRES_TIME.includes(nextActionType);
  const canSubmit = recap.trim() !== '' && nextDate.trim() !== '' && (!showTimePickers || nextStartTime.trim() !== '');

  const handleCompleteAndSchedule = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    setIsSubmitting(true);
    try {
      // 1. Complete the current event
      await completeEventWithRecap(event.id, recap);

      // 2. Schedule the next action
      await logFollowUp(event.lead_id, {
        activityType: nextActionType,
        outcome: `Next Step: ${nextActionType} | Prep: ${prepNotes}`,
        nextActionType,
        nextActionDate: nextDate,
        nextActionTime: nextStartTime || null,
        internalNotes: prepNotes,
      });

      onClose();
    } catch (err) {
      console.error('Completion loop failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!event) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Card */}
      <div 
        className="relative w-full max-w-2xl bg-[#0f0f0f] border-2 border-neutral-800 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-neutral-800 flex items-center justify-between bg-gradient-to-r from-[#0f0f0f] to-[#1a1a1a]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-green-500/10 rounded-xl border border-green-500/20">
              <CheckCircle2 className="text-green-500" size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-tight">WRAP UP & SCHEDULE</h2>
              <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">
                Current Activity: {event.title}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-500 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleCompleteAndSchedule} className="flex-1 overflow-y-auto p-8 space-y-8">
          
          {/* SECTION A: THE RECAP */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center font-black text-xs border border-green-500/20">A</span>
              <h3 className="text-sm font-black text-white uppercase tracking-widest">The Recap: What happened?</h3>
            </div>
            
            <div className="flex flex-col gap-2 pl-10">
              <label className={labelCls}>
                <MessageSquare size={12} className="text-green-500" /> FINAL RECAP NOTES
              </label>
              <textarea
                required
                value={recap}
                onChange={(e) => setRecap(e.target.value)}
                placeholder="Briefly describe the outcome of this meeting..."
                className="w-full h-28 p-4 bg-[#1a1a1a] border-2 border-neutral-800 rounded-2xl text-sm font-medium text-white outline-none focus:border-green-500/50 transition-all resize-none"
              />
            </div>
          </div>

          <div className="h-px bg-neutral-800/50 mx-[-2rem]" />

          {/* SECTION B: THE NEXT STEP */}
          <div className="space-y-4 pb-4">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center font-black text-xs border border-blue-500/20">B</span>
              <h3 className="text-sm font-black text-white uppercase tracking-widest">The Next Step: Keep Momentum</h3>
            </div>

            <div className="pl-10 space-y-6">
              {/* Type Selection */}
              <div className="flex flex-col gap-3">
                <label className={labelCls}>
                  <Bell size={12} className="text-[#3b82f6]" /> Next Action Type
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {ACTION_TYPES.map(({ value, label, emoji }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setNextActionType(value);
                        setNextStartTime('');
                        setNextEndTime('');
                      }}
                      className="py-2.5 px-3 rounded-xl border font-black text-[10px] uppercase tracking-wider transition-all flex flex-col items-center gap-1"
                      style={{
                        borderColor:     nextActionType === value ? '#3b82f6' : '#262626',
                        backgroundColor: nextActionType === value ? '#3b82f6' : '#1a1a1a',
                        color:           nextActionType === value ? '#ffffff' : '#737373',
                      }}
                    >
                      <span className="text-base">{emoji}</span>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date & Time Row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className={labelCls}>
                    <CalendarDays size={12} className="text-[#3b82f6]" /> Follow-up Date
                  </label>
                  <input
                    type="date"
                    required
                    value={nextDate}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setNextDate(e.target.value)}
                    className="h-11 px-4 bg-[#1a1a1a] border-2 border-neutral-800 rounded-xl text-xs font-bold text-white outline-none focus:border-[#3b82f6]/50"
                  />
                </div>

                {showTimePickers && (
                  <div className="flex flex-col gap-2">
                    <label className={labelCls}>
                      <Clock size={12} className="text-[#3b82f6]" /> Start Time
                    </label>
                    <input
                      type="time"
                      required
                      value={nextStartTime}
                      onChange={(e) => handleStartTimeChange(e.target.value)}
                      className="h-11 px-4 bg-[#1a1a1a] border-2 border-neutral-800 rounded-xl text-xs font-bold text-white outline-none focus:border-[#3b82f6]/50"
                    />
                  </div>
                )}
              </div>

              {/* Prep Notes */}
              <div className="flex flex-col gap-2">
                <label className={labelCls}>
                  <FileText size={12} className="text-[#3b82f6]" /> PREPARATION / CONTEXT
                </label>
                <textarea
                  value={prepNotes}
                  onChange={(e) => setPrepNotes(e.target.value)}
                  placeholder="What needs to happen before this next step?"
                  className="w-full h-20 p-4 bg-[#1a1a1a] border-2 border-neutral-800 rounded-2xl text-xs font-medium text-white outline-none focus:border-[#3b82f6]/50 transition-all resize-none"
                />
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="p-8 bg-neutral-900/50 border-t border-neutral-800 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 rounded-2xl border border-neutral-700 font-black text-[10px] uppercase tracking-widest text-gray-400 hover:text-white hover:bg-white/5 transition-all"
          >
            I'll do it later
          </button>
          <button
            onClick={handleCompleteAndSchedule}
            disabled={isSubmitting || !canSubmit}
            className="flex-1 py-4 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-gray-200 transition-all flex items-center justify-center gap-2 group disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Syncing...' : (
              <>
                <Zap size={14} fill="currentColor" />
                Complete & Schedule Next Action
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
