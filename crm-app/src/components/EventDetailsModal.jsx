import React from 'react';
import {
  X,
  Calendar,
  Clock,
  Building2,
  User,
  FileText,
  Users,
  Mail,
  Phone,
  Lock,
  Globe,
} from 'lucide-react';
import { format } from 'date-fns';

/** Match the same theme palette used in CalendarView */
const getEventTheme = (type) => {
  switch (type) {
    case 'Meeting':
      return { accent: '#f97316', accentBg: '#fff7ed', iconBg: '#ffedd5', label: 'text-orange-700', Icon: Users };
    case 'Send Proposal':
      return { accent: '#9333ea', accentBg: '#faf5ff', iconBg: '#f3e8ff', label: 'text-purple-700', Icon: FileText };
    case 'Send Email':
      return { accent: '#2563eb', accentBg: '#eff6ff', iconBg: '#dbeafe', label: 'text-blue-700', Icon: Mail };
    case 'Call':
      return { accent: '#16a34a', accentBg: '#f0fdf4', iconBg: '#dcfce7', label: 'text-green-700', Icon: Phone };
    case 'WhatsApp':
      return { accent: '#16a34a', accentBg: '#f0fdf4', iconBg: '#dcfce7', label: 'text-green-700', Icon: Phone };
    case 'Email':
      return { accent: '#2563eb', accentBg: '#eff6ff', iconBg: '#dbeafe', label: 'text-blue-700', Icon: Mail };
    case 'Follow-up':
    default:
      return { accent: '#059669', accentBg: '#ecfdf5', iconBg: '#d1fae5', label: 'text-emerald-700', Icon: Phone };
  }
};

/**
 * EventDetailsModal
 * Opened when a user clicks on an event card in CalendarView.
 * Shows full details: type, title, time, lead context, and notes.
 */
export const EventDetailsModal = ({ event, onClose }) => {
  if (!event) return null;

  const theme = getEventTheme(event.event_type);
  const { Icon } = theme;

  const startDate = new Date(event.start_time);
  const endDate = new Date(event.end_time);

  // Parse the title to extract company/lead name (format: "Meeting with Acme Corp")
  const titleParts = event.title?.split(' with ');
  const companyFromTitle = titleParts?.length > 1 ? titleParts.slice(1).join(' with ') : null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-[#0f0f0f] rounded-[2rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-6 duration-300 border border-white/10">

        {/* Colored top accent bar */}
        <div
          className="h-1.5 w-full"
          style={{ background: `linear-gradient(to right, ${theme.accent}, ${theme.accent}88)` }}
        />

        {/* Header */}
        <div className="p-6 pb-0 flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Icon bubble */}
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: theme.iconBg }}
            >
              <Icon size={26} style={{ color: theme.accent }} strokeWidth={2.5} />
            </div>

            <div>
              <span
                className="text-[10px] font-black uppercase tracking-[0.2em]"
                style={{ color: theme.accent }}
              >
                {event.event_type}
              </span>
              <h2 className="text-lg font-black text-white leading-tight mt-0.5">
                {event.title}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/5 hover:bg-white/15 transition-colors border border-white/10 shrink-0"
          >
            <X size={18} className="text-white/70" strokeWidth={2.5} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-5">

          {/* Date & Time */}
          <div className="bg-white/5 rounded-2xl p-4 border border-white/8 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
                <Calendar size={14} className="text-white/60" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Date</p>
                <p className="text-sm font-bold text-white">
                  {format(startDate, 'EEEE, MMMM d, yyyy')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
                <Clock size={14} className="text-white/60" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Time</p>
                <p className="text-sm font-bold text-white">
                  {format(startDate, 'h:mm a')}
                  <span className="text-white/40 mx-2">→</span>
                  {format(endDate, 'h:mm a')}
                </p>
              </div>
            </div>
          </div>

          {/* Lead / Company Context */}
          {companyFromTitle && (
            <div className="bg-white/5 rounded-2xl p-4 border border-white/8 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
                <Building2 size={14} className="text-white/60" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Lead / Company</p>
                <p className="text-sm font-bold text-white">{companyFromTitle}</p>
              </div>
            </div>
          )}

          {/* Visibility badge */}
          <div className="flex items-center gap-2">
            {event.is_private ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20">
                <Lock size={11} className="text-yellow-400" strokeWidth={2.5} />
                <span className="text-[10px] font-black uppercase tracking-widest text-yellow-400">Private</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
                <Globe size={11} className="text-green-400" strokeWidth={2.5} />
                <span className="text-[10px] font-black uppercase tracking-widest text-green-400">Global · Visible to team</span>
              </div>
            )}
          </div>

          {/* Notes / Description */}
          {event.description && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <FileText size={12} className="text-white/40" />
                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Notes</span>
              </div>
              <p className="text-sm text-white/70 leading-relaxed bg-white/5 rounded-2xl p-4 border border-white/8">
                {event.description}
              </p>
            </div>
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            className="w-full py-3.5 mt-1 rounded-2xl bg-white/8 hover:bg-white/12 text-white font-black text-xs uppercase tracking-widest transition-all border border-white/10"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
