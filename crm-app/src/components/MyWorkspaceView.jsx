import React, { useState, useEffect } from 'react';
import { useLeadStore } from '../store/useLeadStore';
import { useCalendarStore } from '../store/useCalendarStore';
import { format, isSameDay } from 'date-fns';
import { 
  Target, 
  Users, 
  CornerUpLeft, 
  ChevronRight, 
  Mail, 
  Phone,
  BarChart3,
  CalendarDays,
  Zap,
  Search,
  TrendingUp,
  UserCheck,
  Check
} from 'lucide-react';
import QualifyLeadModal from './QualifyLeadModal';
import CloseDealModal from './CloseDealModal';
import FollowUpModal from './FollowUpModal';

/**
 * MyWorkspaceView
 * Personal workspace split into Qualification and Sales.
 * Focuses on execution and tracking.
 */

const MyTodaySidebar = ({ onLeadClick }) => {
  // ✅ Stable selectors
  const currentUser = useLeadStore((state) => state.currentUser);
  const myQualification = useLeadStore((state) => state.myQualification);
  const mySales = useLeadStore((state) => state.mySales);
  const completeNextAction = useLeadStore((state) => state.completeNextAction);
  const [todayEvents, setTodayEvents] = useState([]);

  useEffect(() => {
    if (!currentUser) return;
    const loadTodayEvents = async () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      const events = await fetchEvents(start.toISOString(), end.toISOString(), { 
        globalOnly: false,
        userId: currentUser.id 
      });
      setTodayEvents(events);
    };
    loadTodayEvents();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]); // Only re-run when the user changes, not on fetchEvents reference change

  const handleComplete = async (e, item) => {
    e.stopPropagation(); // Prevent opening the lead modal
    
    // Optimistic UI Removal
    if (item.itemType === 'event') {
      setTodayEvents(prev => prev.filter(ev => ev.id !== item.originalEventId));
      await completeEvent(item.originalEventId);
    } else if (item.itemType === 'lead') {
      // The lead gets removed from this list automatically because nextActionDate becomes null
      // via the optimistic update in the Zustand store
      await completeNextAction(item.leadId, item.displayType);
    }
  };

  // Aggregate standard events and lead next actions
  const combinedItems = [
    // Filter out events that are already completed
    ...todayEvents.filter(e => !e.is_completed).map(e => ({
      id: `event-${e.id}`,
      itemType: 'event',
      time: new Date(e.start_time),
      displayType: e.event_type,
      title: e.title,
      subtitle: e.description || '',
      isPrivate: e.is_private,
      originalEventId: e.id
    })),
    ...[...myQualification, ...mySales]
      .filter(lead => lead.nextActionDate && isSameDay(new Date(lead.nextActionDate), new Date()))
      .map(lead => ({
        id: `lead-${lead.id}`,
        itemType: 'lead',
        time: new Date(lead.nextActionDate),
        displayType: lead.nextActionType || 'Follow-up',
        title: lead.companyName || lead.decisionMakerName || 'Unnamed Lead',
        subtitle: lead.internalNotes || '',
        leadId: lead.id
      }))
  ].sort((a, b) => a.time - b.time);

  return (
    <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xl shadow-indigo-900/5 flex flex-col min-h-[400px]">
      <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
        <div className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-purple-400 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <CalendarDays size={20} className="text-white" strokeWidth={2.5} />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-slate-800">My Today</h3>
          <p className="text-xs font-medium text-slate-500">
            {format(new Date(), 'EEEE, MMM dd')}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {isLoading ? (
          <div className="w-full h-16 bg-slate-50 animate-pulse rounded-xl" />
        ) : combinedItems.length > 0 ? (
          combinedItems.map(item => (
            <div 
              key={item.id} 
              onClick={() => {
                if (item.itemType === 'lead') {
                  onLeadClick(item.leadId);
                }
              }}
              className={`p-4 rounded-2xl border border-slate-100 flex items-start gap-3 hover:-translate-y-0.5 transition-all group ${item.itemType === 'lead' ? 'bg-indigo-50/50 hover:bg-indigo-50 cursor-pointer' : 'bg-white hover:bg-slate-50 cursor-default shadow-sm'}`}
            >
              <button 
                onClick={(e) => handleComplete(e, item)}
                className="w-6 h-6 mt-1 rounded-full border border-slate-300 flex items-center justify-center shrink-0 hover:bg-green-500 hover:border-green-500 group-hover:border-green-400 transition-colors cursor-pointer bg-white"
                title="Mark as Done"
              >
                <Check size={14} className="text-white opacity-0 hover:opacity-100 group-hover:opacity-100" strokeWidth={3} />
              </button>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-medium px-2.5 py-1 rounded-lg ${item.itemType === 'lead' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                    {item.itemType === 'lead' ? `🎯 ${item.displayType}` : item.displayType}
                  </span>
                  <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                    {item.itemType === 'event' ? format(item.time, 'h:mm a') : 'Due Today'}
                  </span>
                </div>
                <h4 className="font-semibold text-sm text-slate-800 leading-tight mb-1 truncate">{item.title}</h4>
                {item.subtitle && (
                  <p className="text-xs font-normal text-slate-500 line-clamp-2 mb-2">{item.subtitle}</p>
                )}
                {item.isPrivate && (
                  <span className="text-[10px] font-medium text-red-500 flex items-center gap-1 mt-2 border-t border-slate-100 pt-2">
                    🔒 Private Follow-up
                  </span>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-40 p-6 space-y-2">
            <CalendarDays size={32} />
            <p className="text-sm font-medium text-slate-400">Clear Schedule</p>
          </div>
        )}
      </div>
    </div>
  );
};

export function MyWorkspaceView({ onLeadClick }) {
  const [activeSubTab, setActiveSubTab] = useState('qualification');
  const [qualifyingLead, setQualifyingLead] = useState(null);
  const [closingLead, setClosingLead] = useState(null);
  const [followUpLead, setFollowUpLead] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // ✅ Stable selectors
  const myQualification = useLeadStore((state) => state.myQualification);
  const mySales = useLeadStore((state) => state.mySales);
  const unclaimLead = useLeadStore((state) => state.unclaimLead);

  useEffect(() => {
    // Use getState() to avoid putting fetchMyWorkspace in the dep array,
    // which re-runs every time the store updates and causes an infinite loop.
    useLeadStore.getState().fetchMyWorkspace('qualification');
    useLeadStore.getState().fetchMyWorkspace('sales');
  }, []); // Fetch once on mount

  // Raw active list
  const activeLeads = activeSubTab === 'qualification' ? myQualification : mySales;

  // Filtered by Search
  const leads = activeLeads.filter(lead => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const company = (lead.companyName || '').toLowerCase();
    const dm = (lead.decisionMakerName || '').toLowerCase();
    return company.includes(term) || dm.includes(term);
  });

  // Roll-up Metrics
  const activeProspects = myQualification.length;
  const totalPipelineValue = mySales.reduce((acc, lead) => acc + (parseFloat(lead.dealValue) || 0), 0);

  // Urgency: true when next_action_date is today or in the past
  const isActionDue = (lead) => {
    if (!lead.nextActionDate) return false;
    const actionDay = new Date(lead.nextActionDate);
    actionDay.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return actionDay <= today;
  };

  return (
    <div className="p-8 max-w-[90rem] mx-auto flex flex-col xl:flex-row gap-8 items-start animate-in fade-in duration-300">
      
      {/* Main Pipeline Area */}
      <div className="flex-1 w-full min-w-0">
        {/* Unified Workspace Header */}
      <div className="flex flex-col lg:flex-row items-end lg:items-center justify-between mb-12 gap-6 bg-white p-8 rounded-3xl border border-slate-100 shadow-xl shadow-indigo-900/5">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3 text-slate-800">
            {activeSubTab === 'qualification' ? <Target className="text-indigo-500" size={32} /> : <BarChart3 className="text-purple-500" size={32} />}
            {activeSubTab === 'qualification' ? 'My Qualification' : 'Active Sales'}
          </h2>
          <p className="text-slate-500 font-medium text-sm mt-1">
            Focus on {activeSubTab === 'qualification' ? 'qualifying new prospects' : 'closing active deals'}
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-full border border-slate-200">
          <button 
            onClick={() => setActiveSubTab('qualification')}
            className={`px-6 py-2 rounded-full font-medium text-sm transition-all ${
              activeSubTab === 'qualification' 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Qualify ({myQualification.length})
          </button>
          <button 
            onClick={() => setActiveSubTab('sales')}
            className={`px-6 py-2 rounded-full font-medium text-sm transition-all ${
              activeSubTab === 'sales' 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Sales ({mySales.length})
          </button>
        </div>
      </div>

      {/* PIPELINE HUD & CONTROLS */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-12">
        {/* HUD Cards */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
          {/* Metric 1 */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 flex items-center gap-4 shadow-lg shadow-indigo-900/5 flex-1 sm:w-64">
            <div className="bg-indigo-50 p-3 rounded-xl text-indigo-600">
              <UserCheck size={24} />
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500 mb-1">Active Prospects</div>
              <div className="text-2xl font-bold text-slate-800">{activeProspects} <span className="text-xs font-normal text-slate-400">Qualifying</span></div>
            </div>
          </div>
          
          {/* Metric 2 */}
          <div className="bg-gradient-to-br from-indigo-400 to-purple-400 border border-transparent rounded-2xl p-5 flex items-center gap-4 shadow-lg shadow-indigo-500/20 flex-1 sm:w-64">
            <div className="bg-white/20 p-3 rounded-xl text-white">
              <TrendingUp size={24} />
            </div>
            <div>
              <div className="text-xs font-medium text-indigo-100 mb-1">Total Pipeline Value</div>
              <div className="text-2xl font-bold text-white">${totalPipelineValue.toLocaleString()} <span className="text-xs font-normal text-white/70">Sales</span></div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative w-full xl:w-96">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
            <Search size={20} />
          </div>
          <input
            type="text"
            placeholder="Search active deals..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-2xl h-14 pl-12 pr-4 font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm placeholder:text-slate-400"
          />
        </div>
      </div>

      {leads.length === 0 ? (
        <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-24 text-center">
          <h3 className="text-xl font-semibold text-slate-700 mb-2">Workspace is empty</h3>
          <p className="text-slate-500 font-normal">Claim some leads from the Global Pool to start your engine.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8">
          {leads.map((lead) => (
            <div 
              key={lead.id} 
              className="bg-white border border-slate-100 rounded-3xl flex flex-col md:flex-row items-center p-6 gap-8 group relative shadow-lg shadow-indigo-900/5 hover:-translate-y-1 transition-all"
            >
              {/* Lead Info Content */}
              <div 
                className="flex-1 cursor-pointer flex flex-col md:flex-row items-center gap-8"
                onClick={() => onLeadClick(lead.id)}
              >
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl text-indigo-600 font-bold text-2xl flex items-center justify-center shrink-0">
                  {lead.companyName?.charAt(0)}
                </div>
                
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-xl font-semibold mb-1 text-slate-800">{lead.companyName}</h3>
                  {isActionDue(lead) && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 mb-2 rounded-lg bg-red-50 text-red-600 text-[10px] font-medium border border-red-100">
                      ⚠ Action Required
                    </span>
                  )}
                  <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm font-medium text-slate-500">
                    <span className="flex items-center gap-1.5"><Mail size={14} className="text-slate-400" /> {lead.email}</span>
                    <span className="flex items-center gap-1.5"><CalendarDays size={14} className="text-slate-400" /> {new Date(lead.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="px-6 py-4 bg-slate-50 rounded-2xl border border-slate-100 text-right hidden lg:block">
                  <div className="text-xs font-medium text-slate-500 mb-1">Projected Value</div>
                  <div className="text-xl font-semibold text-slate-800">${lead.dealValue?.toLocaleString()}</div>
                </div>
              </div>

              {/* Action Stack — context-aware per tab */}
              <div className="flex flex-col gap-2 w-full md:w-52 shrink-0">
                {activeSubTab === 'qualification' ? (
                  // --- Qualification Actions ---
                  <>
                    <button
                      onClick={() => setQualifyingLead(lead)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium transition-colors"
                    >
                      <Users size={16} strokeWidth={2.5} />
                      <span className="font-medium">Qualify</span>
                    </button>
                    <button
                      onClick={() => unclaimLead(lead.id)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 font-medium transition-colors text-xs group/release"
                      title="Return to Pool"
                    >
                      <CornerUpLeft size={14} className="group-hover/release:-rotate-45 transition-transform" />
                      <span>Release</span>
                    </button>
                  </>
                ) : (
                  // --- Sales Actions: follow-up first, close is deliberate ---
                  <>
                    <button
                      onClick={() => setFollowUpLead(lead)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white font-medium hover:opacity-90 shadow-md shadow-indigo-500/20 transition-all"
                    >
                      <Zap size={16} strokeWidth={2.5} />
                      <span className="font-medium">Log Activity</span>
                    </button>
                    <button
                      onClick={() => setClosingLead(lead)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium transition-colors text-sm"
                    >
                      <span>Close Deal</span>
                    </button>
                    <button
                      onClick={() => unclaimLead(lead.id)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors text-xs font-medium group/release"
                      title="Return to Pool"
                    >
                      <CornerUpLeft size={12} className="group-hover/release:-rotate-45 transition-transform" />
                      <span>Release</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Qualification Wizard Modal */}
      {qualifyingLead && (
        <QualifyLeadModal
          lead={qualifyingLead}
          onClose={() => setQualifyingLead(null)}
        />
      )}

      {/* Log Activity / Follow-Up Modal */}
      {followUpLead && (
        <FollowUpModal
          lead={followUpLead}
          onClose={() => setFollowUpLead(null)}
        />
      )}

      {/* Close Deal Modal */}
      {closingLead && (
        <CloseDealModal
          lead={closingLead}
          onClose={() => setClosingLead(null)}
        />
      )}
      
      </div>

      {/* Right Sidebar: My Today */}
      <div className="w-full xl:w-96 shrink-0 sticky top-24">
        <MyTodaySidebar onLeadClick={onLeadClick} />
      </div>

    </div>
  );
}
