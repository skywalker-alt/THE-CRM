import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock, Mail, FileText, Phone, Users, Lock, Circle, CheckCircle2 } from 'lucide-react';
import { startOfWeek, endOfWeek, addWeeks, subWeeks, format, eachDayOfInterval, isSameDay } from 'date-fns';
import { useCalendarStore } from '../store/useCalendarStore';
import { useLeadStore } from '../store/useLeadStore';
import { CalendarEventModal } from './CalendarEventModal';
import { EventDetailsModal } from './EventDetailsModal';
import MeetingCompletionModal from './MeetingCompletionModal';

export const CalendarView = () => {
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null); // for EventDetailsModal
  const [viewContext, setViewContext] = useState('global'); // 'global' or 'personal'
  const [completingEvent, setCompletingEvent] = useState(null);
  const [showCompletion, setShowCompletion] = useState(false);

  
  const { fetchEvents, markEventCompleted, isLoading } = useCalendarStore();
  const { currentUser } = useLeadStore();


  const storeEvents = useCalendarStore((s) => s.events);

  const loadEvents = async () => {
    const start = currentWeekStart;
    const end = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
    
    // Fetch logic: Global Context (non-private) or Personal Context (assigned to me)
    const options = viewContext === 'global' 
      ? { globalOnly: true } 
      : { userId: currentUser?.id };

    await fetchEvents(start.toISOString(), end.toISOString(), options);
  };

  // Re-sort and display whenever the store's events change (picks up _completing flags)
  useEffect(() => {
    const sorted = [...storeEvents].sort(
      (a, b) => new Date(a.start_time) - new Date(b.start_time)
    );
    setEvents(sorted);
  }, [storeEvents]);

  useEffect(() => {
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWeekStart, viewContext, currentUser?.id]);


  const handleNextWeek = () => setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  const handlePrevWeek = () => setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  const handleToday = () => {
    const today = new Date();
    setCurrentWeekStart(startOfWeek(today, { weekStartsOn: 1 }));
    setSelectedDay(today);
  };

  const weekDays = eachDayOfInterval({ 
    start: currentWeekStart, 
    end: endOfWeek(currentWeekStart, { weekStartsOn: 1 }) 
  });

  const getEventTheme = (type) => {
    switch (type) {
      case 'Meeting': 
        return { 
          bg: 'bg-orange-100', 
          text: 'text-orange-900', 
          iconBg: 'bg-orange-200',
          iconColor: 'text-orange-700',
          Icon: Users 
        };
      case 'Send Proposal': 
        return { 
          bg: 'bg-purple-100', 
          text: 'text-purple-900', 
          iconBg: 'bg-purple-200',
          iconColor: 'text-purple-700',
          Icon: FileText 
        };
      case 'Send Email': 
        return { 
          bg: 'bg-blue-100', 
          text: 'text-blue-900', 
          iconBg: 'bg-blue-200',
          iconColor: 'text-blue-700',
          Icon: Mail 
        };
      case 'Follow-up': 
      default:
        return { 
          bg: 'bg-emerald-100', 
          text: 'text-emerald-900', 
          iconBg: 'bg-emerald-200',
          iconColor: 'text-emerald-700',
          Icon: Phone 
        };
    }
  };

  const selectedDayEvents = events.filter(e => isSameDay(new Date(e.start_time), selectedDay));

  return (
    <div className="flex justify-center h-full animate-in fade-in duration-300 px-2 sm:px-4 pb-8">
      {/* Main Container */}
      <div className="w-full max-w-4xl bg-white rounded-[2rem] shadow-xl overflow-hidden flex flex-col min-h-[600px] md:min-h-[700px]">
        
        {/* Header Section */}
        <div className="bg-[#1a1a1a] text-white p-6 sm:px-10 sm:pt-10 sm:pb-8 flex flex-col gap-8 rounded-t-[2rem]">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center">
                <CalendarIcon size={24} className="text-white" strokeWidth={2.5} />
              </div>
              <h1 className="text-xl font-bold tracking-wide uppercase">
                {format(currentWeekStart, 'MMM d')} - {format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'MMM d, yyyy')}
              </h1>
            </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
              {/* Context Selector Toggle */}
              <div className="bg-white/5 border border-white/10 p-1 rounded-xl flex items-center gap-1">
                <button 
                  onClick={() => setViewContext('global')}
                  className={`px-3 sm:px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                    viewContext === 'global' 
                      ? 'bg-white text-black shadow-lg scale-105' 
                      : 'text-white/40 hover:text-white/60'
                  }`}
                >
                  Global
                </button>
                <button 
                  onClick={() => setViewContext('personal')}
                  className={`px-3 sm:px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                    viewContext === 'personal' 
                      ? 'bg-white text-black shadow-lg scale-105' 
                      : 'text-white/40 hover:text-white/60'
                  }`}
                >
                  <span className="hidden sm:inline">My Workspace</span>
                  <span className="sm:hidden">Mine</span>
                </button>
              </div>

              <div className="flex bg-white/10 rounded-full p-1 border border-white/20">
                <button onClick={handlePrevWeek} className="p-2 hover:bg-white/20 rounded-full transition-colors text-white">
                  <ChevronLeft size={18} strokeWidth={2.5} />
                </button>
                <button onClick={handleToday} className="px-5 hover:bg-white/20 rounded-full transition-colors font-bold uppercase tracking-wider text-xs text-white">
                  Today
                </button>
                <button onClick={handleNextWeek} className="p-2 hover:bg-white/20 rounded-full transition-colors text-white">
                  <ChevronRight size={18} strokeWidth={2.5} />
                </button>
              </div>
              <button 
                onClick={() => setShowEventModal(true)}
                className="flex-1 sm:flex-none justify-center bg-[#3b82f6] text-white px-4 sm:px-6 py-2.5 rounded-full font-bold uppercase text-xs tracking-wider hover:bg-blue-600 transition-colors flex items-center gap-2"
              >
                <Plus size={16} strokeWidth={3} />
                <span className="hidden sm:inline">Add Event</span>
              </button>
            </div>
          </div>

          {/* Horizontal Date Selector */}
          <div className="flex justify-between items-center px-2">
            {weekDays.map((day, idx) => {
              const isSelected = isSameDay(day, selectedDay);
              const isToday = isSameDay(day, new Date());
              return (
                <div 
                  key={idx} 
                  onClick={() => setSelectedDay(day)}
                  className="flex flex-col items-center gap-2 cursor-pointer group"
                >
                  <span className={`text-xs font-bold uppercase tracking-wider ${isSelected ? 'text-orange-400' : 'text-gray-400 group-hover:text-gray-300'}`}>
                    {format(day, 'EEE')}
                  </span>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    isSelected 
                      ? 'bg-orange-500 text-white shadow-md scale-110' 
                      : isToday 
                        ? 'bg-white/10 text-white hover:bg-white/20' 
                        : 'text-gray-300 hover:bg-white/5'
                  }`}>
                    <span className="text-lg font-bold">{format(day, 'd')}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Vertical Timeline Body */}
        <div className="flex-1 bg-[#fcfcfc] p-6 sm:p-10 overflow-y-auto">
          {isLoading && selectedDayEvents.length === 0 ? (
            <div className="w-full h-32 bg-gray-100 animate-pulse rounded-2xl" />
          ) : selectedDayEvents.length > 0 ? (
            <div className="flex flex-col gap-6">
              {selectedDayEvents.map((event, idx) => {
                const theme = getEventTheme(event.event_type);
                const Icon = theme.Icon;
                
                return (
                  <div key={event.id} className={`flex items-stretch gap-4 sm:gap-8 min-h-[100px] transition-all duration-500 ${
                    event._completing ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
                  }`}>
                    {/* Time Column */}
                    <div className="w-20 sm:w-24 shrink-0 flex flex-col items-end pt-5 relative">
                      <span className="text-sm font-semibold text-gray-400">
                        {format(new Date(event.start_time), 'h:mm a')}
                      </span>
                    </div>

                    {/* Event Card — click body to view details */}
                    <div
                      onClick={() => setSelectedEvent(event)}
                      className={`flex-1 ${theme.bg} rounded-2xl p-5 flex items-center gap-5 transition-transform hover:-translate-y-1 shadow-sm relative cursor-pointer`}
                    >
                      {/* Completion Checkbox — stopPropagation prevents modal from opening */}
                      <button
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setCompletingEvent(event);
                          setShowCompletion(true);
                        }}
                        title="Complete & Recap"
                        className="absolute top-3 right-3 p-1 rounded-full hover:scale-110 transition-transform text-black/20 hover:text-green-600"
                      >
                        <Circle size={22} strokeWidth={2} />
                      </button>

                      <div className={`w-14 h-14 ${theme.iconBg} rounded-full flex items-center justify-center shrink-0`}>
                        <Icon size={24} className={theme.iconColor} strokeWidth={2.5} />
                      </div>
                      
                      <div className="flex flex-col pr-8">
                        <span className={`text-xs font-bold uppercase tracking-wider ${theme.text} opacity-80 mb-1`}>
                          {event.event_type}
                        </span>
                        <h4 className={`text-lg font-bold leading-tight ${theme.text} flex items-center gap-2`}>
                          {event.title}
                          {event.is_private && <Lock size={14} className="opacity-40" strokeWidth={3} />}
                        </h4>
                        
                        {event.description && (
                          <p className={`text-sm mt-2 opacity-80 line-clamp-2 ${theme.text}`}>
                            {event.description}
                          </p>
                        )}
                        
                        <div className={`flex items-center gap-2 text-xs font-semibold mt-3 ${theme.text} opacity-70 uppercase tracking-wider`}>
                          <Clock size={12} strokeWidth={2.5} />
                          {format(new Date(event.start_time), 'h:mm a')} - {format(new Date(event.end_time), 'h:mm a')}
                        </div>
                      </div>
                    </div>
                  </div>

                );
              })}
            </div>
          ) : (
            <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <CalendarIcon size={32} className="text-gray-300" strokeWidth={2} />
              </div>
              <h3 className="text-lg font-bold text-gray-800">No Events Scheduled</h3>
              <p className="text-gray-500 font-medium mt-1">
                {viewContext === 'global' 
                  ? 'There are no public events on this day.' 
                  : 'You have no scheduled actions on this day.'}
              </p>
            </div>
          )}
        </div>

      </div>

      {showEventModal && (
        <CalendarEventModal
          onClose={() => {
            setShowEventModal(false);
            loadEvents();
          }}
        />
      )}

      {selectedEvent && (
        <EventDetailsModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}

      {showCompletion && completingEvent && (
        <MeetingCompletionModal
          event={completingEvent}
          onClose={() => {
            setShowCompletion(false);
            setCompletingEvent(null);
            loadEvents();
          }}
        />
      )}
    </div>
  );
};
