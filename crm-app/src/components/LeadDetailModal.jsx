import React, { useState, useEffect } from 'react';
import { useLeadStore } from '../store/useLeadStore';
import { 
  X, 
  Building, 
  User, 
  Mail, 
  Phone, 
  DollarSign, 
  MessageSquare,
  Rocket,
  CornerUpLeft,
  Layout,
  Globe,
  MapPin,
  Bell,
  CalendarDays,
  Send,
  Activity,
  History,
  FileText
} from 'lucide-react';

/**
 * LeadDetailModal (Redesigned)
 * Unified Premium Blue/White style matching image_1.png.
 */
export function LeadDetailModal({ leadId, onClose }) {
  const { 
    globalPool, 
    myQualification, 
    mySales,
    portfolio,
    currentUser, 
    updateLead, 
    moveLead,
    claimLead,
    unclaimLead,
    fetchLeadActivities,
    currentLeadActivities,
    addActivity
  } = useLeadStore();
  
  const [isSaving, setIsSaving] = useState(false);
  const [quickNote, setQuickNote] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  
  // Search across pools
  const lead = globalPool.find(l => l.id === leadId) || 
               myQualification.find(l => l.id === leadId) || 
               mySales.find(l => l.id === leadId) ||
               (portfolio && portfolio.find(l => l.id === leadId));

  const [editForm, setEditForm] = useState(lead ? {
    ...lead,
    nextActionType: lead.nextActionType || '',
    nextActionDate: lead.nextActionDate ? lead.nextActionDate.slice(0, 10) : '',
  } : {});

  useEffect(() => {
    if (leadId) {
      fetchLeadActivities(leadId);
    }
  }, [leadId, fetchLeadActivities]);

  if (!lead) return null;

  const handleSaveLead = async () => {
    setIsSaving(true);
    await updateLead(lead.id, editForm);
    setIsSaving(false);
  };

  const handleMove = async (newStage) => {
    setIsSaving(true);
    await moveLead(lead.id, newStage);
    setIsSaving(false);
  };

  const isUnassigned = !lead.assignedTo;
  const isOwner = lead.assignedTo === currentUser?.id;

  const handleQuickNote = async (e) => {
    e.preventDefault();
    if (!quickNote.trim()) return;
    setIsAddingNote(true);
    await addActivity(lead.id, 'Note', quickNote);
    setQuickNote('');
    setIsAddingNote(false);
  };

  const getActivityIcon = (type) => {
    switch(type) {
      case 'Call': return <Phone size={14} className="text-blue-500" />;
      case 'Email': return <Mail size={14} className="text-neo-cyan" />;
      case 'Meeting': return <User size={14} className="text-purple-500" />;
      case 'Note': return <MessageSquare size={14} className="text-neo-yellow" />;
      case 'Status Change':
      case 'System': return <Activity size={14} className="text-green-500" />;
      case 'Update': return <FileText size={14} className="text-gray-500" />;
      default: return <History size={14} className="text-gray-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal Container */}
      <div className="relative w-full max-w-7xl max-h-[95vh] md:max-h-[90vh] overflow-hidden bg-white rounded-t-[2rem] md:rounded-[2rem] shadow-2xl flex flex-col border border-gray-100">
        
        {/* Header: Unified Blue Style */}
        <div className="bg-[#3b82f6] p-4 md:p-6 flex justify-between items-center text-white shrink-0">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-white/20 rounded-xl md:rounded-2xl flex items-center justify-center backdrop-blur-md">
              <Building size={20} className="md:w-6 md:h-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg md:text-2xl font-black uppercase tracking-tight leading-none truncate">{lead.companyName}</h2>
              <p className="text-blue-100 text-[9px] md:text-[10px] font-bold uppercase tracking-widest mt-1 opacity-80 truncate">Lead Details & History</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <X size={18} strokeWidth={3} />
          </button>
        </div>
        
        {/* Scrollable Body */}
        <div className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden flex flex-col lg:flex-row bg-gray-50/50">
            
          {/* Left Column: Form Fields */}
          <div className="w-full lg:w-2/3 lg:overflow-y-auto p-4 md:p-8 space-y-6 md:space-y-8 border-b lg:border-b-0 lg:border-r border-gray-200">
            
            {/* Status Display Card & Primary Actions */}
            <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl border border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 md:gap-6 shadow-sm">
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <div className={`px-4 py-2 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-tighter ${
                   lead.stage === 'Sales' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
                }`}>
                  {lead.stage === 'Sales' ? 'Closing Phase' : lead.stage}
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                {isUnassigned ? (
                  <button 
                    onClick={() => { claimLead(lead.id); onClose(); }} 
                    className="w-full sm:w-auto bg-[#3b82f6] text-white px-6 py-3 rounded-xl font-black uppercase text-xs tracking-widest shadow-md shadow-blue-200 flex items-center justify-center gap-2 hover:translate-y-[-2px] transition-all whitespace-nowrap"
                  >
                    <Rocket size={16} /> Claim Lead
                  </button>
                ) : isOwner ? (
                  <>
                    <button 
                      onClick={() => handleMove(lead.stage === 'Qualification' ? 'Sales' : 'Qualification')}
                      className="w-full sm:w-auto border-2 border-[#3b82f6] text-[#3b82f6] px-6 py-3 rounded-xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 hover:bg-blue-50 transition-all whitespace-nowrap"
                    >
                      <Rocket size={16} /> Move to {lead.stage === 'Qualification' ? 'Sales' : 'Qualify'}
                    </button>
                    <button 
                      onClick={() => { unclaimLead(lead.id); onClose(); }}
                      className="text-gray-400 font-bold uppercase text-[9px] tracking-widest hover:text-red-500 transition-colors whitespace-nowrap hidden sm:block"
                    >
                      Release
                    </button>
                  </>
                ) : (
                  <div className="w-full sm:w-auto text-center text-xs font-black text-gray-400 uppercase border border-gray-200 px-4 py-2 rounded-xl">🔒 Protected</div>
                )}
              </div>
            </div>
              
              {/* Primary Contact Info Section */}
              <div className="bg-white p-5 md:p-8 rounded-2xl md:rounded-3xl border border-gray-100 space-y-5 md:space-y-6">
                <h3 className="text-[10px] md:text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <User size={14} className="text-[#3b82f6]" /> Contact Details
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-2">
                    <label className="text-[9px] md:text-[10px] font-black text-gray-500 uppercase ml-1">Full Name</label>
                    <input 
                      type="text"
                      value={editForm.fullName}
                      onChange={(e) => setEditForm({...editForm, fullName: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-200 p-3 md:p-4 rounded-xl md:rounded-2xl font-bold text-black focus:ring-2 focus:ring-[#3b82f6] outline-none transition-all text-base md:text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] md:text-[10px] font-black text-gray-500 uppercase ml-1">Email Address</label>
                    <input 
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-200 p-3 md:p-4 rounded-xl md:rounded-2xl font-bold text-black focus:ring-2 focus:ring-[#3b82f6] outline-none transition-all text-base md:text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] md:text-[10px] font-black text-gray-500 uppercase ml-1">Phone Number</label>
                    <input 
                      type="text"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-200 p-3 md:p-4 rounded-xl md:rounded-2xl font-bold text-black focus:ring-2 focus:ring-[#3b82f6] outline-none transition-all text-base md:text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] md:text-[10px] font-black text-gray-500 uppercase ml-1">Deal Value ($)</label>
                    <input 
                      type="number"
                      value={editForm.dealValue}
                      onChange={(e) => setEditForm({...editForm, dealValue: parseFloat(e.target.value)})}
                      className="w-full bg-gray-50 border border-gray-200 p-3 md:p-4 rounded-xl md:rounded-2xl font-bold text-black focus:ring-2 focus:ring-[#3b82f6] outline-none transition-all text-base md:text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Next Action Section */}
              <div className="bg-white p-5 md:p-8 rounded-2xl md:rounded-3xl border border-gray-100 space-y-5 md:space-y-6">
                <h3 className="text-[10px] md:text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <Bell size={14} className="text-[#3b82f6]" /> Next Action
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-2">
                    <label className="text-[9px] md:text-[10px] font-black text-gray-500 uppercase ml-1">Action Type</label>
                    <select
                      value={editForm.nextActionType}
                      onChange={(e) => setEditForm({...editForm, nextActionType: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-200 p-3 md:p-4 rounded-xl md:rounded-2xl font-bold text-black focus:ring-2 focus:ring-[#3b82f6] outline-none transition-all appearance-none cursor-pointer text-base md:text-sm"
                    >
                      <option value="">-- Select Type --</option>
                      <option value="Call">📞 Call</option>
                      <option value="Email">✉️ Email</option>
                      <option value="WhatsApp">💬 WhatsApp</option>
                      <option value="Meeting">🤝 Meeting</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] md:text-[10px] font-black text-gray-500 uppercase ml-1 flex items-center gap-1">
                      <CalendarDays size={11} /> Action Date
                    </label>
                    <input
                      type="date"
                      value={editForm.nextActionDate}
                      onChange={(e) => setEditForm({...editForm, nextActionDate: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-200 p-3 md:p-4 rounded-xl md:rounded-2xl font-bold text-black focus:ring-2 focus:ring-[#3b82f6] outline-none transition-all text-base md:text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2 mt-4">
                  <label className="text-[9px] md:text-[10px] font-black text-gray-500 uppercase ml-1">Action Notes</label>
                  <textarea
                    value={editForm.internalNotes || ''}
                    onChange={(e) => setEditForm({...editForm, internalNotes: e.target.value})}
                    placeholder="e.g. Discuss the comparative pricing slide deck..."
                    className="w-full bg-gray-50 border border-gray-200 p-4 rounded-xl md:rounded-2xl font-medium text-gray-700 h-20 md:h-24 focus:ring-2 focus:ring-[#3b82f6] outline-none transition-all resize-none text-base md:text-sm"
                  />
                </div>
              </div>

              {/* Lead Story Panel */}
              <div className="bg-white p-5 md:p-8 rounded-2xl md:rounded-3xl border border-gray-100 space-y-4">
                <h3 className="text-[10px] md:text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <MessageSquare size={14} className="text-[#3b82f6]" /> Lead Information
                </h3>
                <textarea 
                  value={editForm.leadStory}
                  onChange={(e) => setEditForm({...editForm, leadStory: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-200 p-5 md:p-6 rounded-xl md:rounded-2xl font-medium text-gray-700 h-32 md:h-48 focus:ring-2 focus:ring-[#3b82f6] outline-none transition-all resize-none text-base md:text-sm"
                  placeholder="Tell the full narrative of this lead..."
                />
              </div>

              {/* Mobile Sticky CTA Placeholder (Hidden on desktop, space filler) */}
              <div className="h-20 lg:hidden" />

              {/* Desktop Update CTA */}
              <div className="hidden lg:flex items-center gap-4 pt-4 pb-12">
                <button 
                  onClick={handleSaveLead}
                  disabled={isSaving}
                  className="flex-1 bg-[#3b82f6] text-white py-5 rounded-2xl font-black uppercase text-sm tracking-widest shadow-xl shadow-blue-100 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50"
                >
                  {isSaving ? 'Syncing...' : 'Save Profile Changes'}
                </button>
              </div>

            </div>

          {/* Right Column: Activity Timeline */}
          <div className="w-full lg:w-1/3 lg:overflow-y-auto flex flex-col bg-white">
            <div className="p-4 md:p-6 border-b border-gray-100 bg-gray-50 shrink-0">
              <h3 className="text-[10px] md:text-sm font-black text-gray-800 uppercase tracking-widest mb-3 md:mb-4 flex items-center gap-2">
                <History size={16} className="text-[#3b82f6]" /> Activity Timeline
              </h3>
              
              {/* Quick Add Form */}
              <form onSubmit={handleQuickNote} className="relative">
                <input
                  type="text"
                  value={quickNote}
                  onChange={(e) => setQuickNote(e.target.value)}
                  placeholder="Drop a quick note..."
                  className="w-full bg-white border border-gray-200 rounded-xl py-3 pl-4 pr-12 text-base md:text-sm font-medium focus:ring-2 focus:ring-[#3b82f6] transition-all outline-none"
                />
                <button 
                  type="submit"
                  disabled={!quickNote.trim() || isAddingNote}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-[#3b82f6] text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  <Send size={14} />
                </button>
              </form>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {currentLeadActivities.length === 0 ? (
                <div className="text-center text-gray-400 text-sm font-medium py-10 italic">
                  No activity logged yet.
                </div>
              ) : (
                <div className="space-y-6">
                  {currentLeadActivities.map((activity, index) => (
                    <div key={activity.id || index} className="relative pl-6">
                      {/* Timeline line */}
                      {index !== currentLeadActivities.length - 1 && (
                        <div className="absolute left-[11px] top-6 bottom-[-24px] w-[2px] bg-gray-100"></div>
                      )}
                      
                      {/* Timeline dot */}
                      <div className="absolute left-0 top-1 w-[24px] h-[24px] bg-white border-2 border-gray-200 rounded-full flex items-center justify-center z-10 shadow-sm">
                        {getActivityIcon(activity.activity_type)}
                      </div>
                      
                      <div className="bg-gray-50 border border-gray-100 p-4 rounded-xl ml-2 shadow-sm relative">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider">
                            {activity.activity_type}
                          </span>
                          <span className="text-[9px] font-bold text-gray-400">
                            {new Date(activity.created_at).toLocaleString([], {
                              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <p className="text-xs text-gray-700 font-medium whitespace-pre-wrap leading-relaxed">
                          {activity.content}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Sticky Action Bar */}
        <div className="lg:hidden sticky bottom-0 left-0 right-0 bg-white p-4 border-t border-gray-100 flex items-center justify-between gap-4 z-50">
          <button 
            onClick={handleSaveLead}
            disabled={isSaving}
            className="flex-1 bg-[#3b82f6] text-white py-4 rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-blue-100 active:scale-95 transition-all disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
          {!isUnassigned && isOwner && (
            <button 
              onClick={() => { unclaimLead(lead.id); onClose(); }}
              className="px-4 py-4 rounded-xl border border-gray-200 text-gray-400 font-bold uppercase text-[10px] tracking-widest active:bg-gray-50 transition-all"
            >
              Release
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
