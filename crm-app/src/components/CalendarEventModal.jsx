import React, { useState } from 'react';
import { X, Calendar as CalendarIcon, Clock, Link, Type } from 'lucide-react';
import { useCalendarStore } from '../store/useCalendarStore';
import { useLeadStore } from '../store/useLeadStore';

export const CalendarEventModal = ({ onClose }) => {
  const { addEvent, isLoading } = useCalendarStore();
  const { currentUser } = useLeadStore();
  
  const [formData, setFormData] = useState({
    title: '',
    event_type: 'Meeting',
    date: new Date().toISOString().split('T')[0],
    start_time: '10:00',
    end_time: '11:00',
    description: '',
  });


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    // Combine date and time
    const startDateTime = new Date(`${formData.date}T${formData.start_time}:00`).toISOString();
    const endDateTime = new Date(`${formData.date}T${formData.end_time}:00`).toISOString();

    // Meetings are global; everything else is private
    const isPrivate = formData.event_type !== 'Meeting';

    const payload = {
      title: formData.title,
      event_type: formData.event_type,
      description: formData.description,
      start_time: startDateTime,
      end_time: endDateTime,
      is_private: isPrivate,
    };


    const result = await addEvent(payload, currentUser.id);
    if (result) {
      onClose();
    }
  };

  const inputCls = "w-full bg-gray-50 border-2 border-black p-4 rounded-xl font-bold text-black focus:ring-4 focus:ring-[#facc15] outline-none transition-all";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal Body */}
      <div className="relative w-full max-w-2xl bg-white rounded-[2.5rem] border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] flex flex-col overflow-hidden max-h-[90vh] animate-in slide-in-from-bottom-8 duration-300">
        
        {/* Header */}
        <div className="bg-[#facc15] p-6 border-b-4 border-black relative shrink-0">
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-full bg-black/10 hover:bg-black/20 transition-colors border-2 border-transparent hover:border-black"
          >
            <X size={20} strokeWidth={3} />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="p-3 bg-black rounded-2xl">
              <CalendarIcon className="text-[#facc15]" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tight">Schedule Action</h2>
              <p className="text-black/70 font-bold text-[10px] uppercase tracking-widest mt-0.5">
                Block your calendar
              </p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 flex flex-col gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Event Title</label>
            <input 
              type="text" 
              required
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
              placeholder="e.g. Acme Corp Demo"
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Event Type</label>
              <select 
                value={formData.event_type}
                onChange={e => setFormData({...formData, event_type: e.target.value})}
                className={`${inputCls} appearance-none cursor-pointer`}
              >
                <option value="Meeting">🤝 Meeting</option>
                <option value="Send Proposal">📄 Send Proposal</option>
                <option value="Send Email">✉️ Send Email</option>
                <option value="Follow-up">📞 Follow-up</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Date</label>
              <input 
                type="date"
                required
                value={formData.date}
                onChange={e => setFormData({...formData, date: e.target.value})}
                className={inputCls}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Start Time</label>
              <input 
                type="time" 
                required
                value={formData.start_time}
                onChange={e => setFormData({...formData, start_time: e.target.value})}
                className={inputCls}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">End Time</label>
              <input 
                type="time" 
                required
                value={formData.end_time}
                onChange={e => setFormData({...formData, end_time: e.target.value})}
                className={inputCls}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Description</label>
            <textarea 
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              placeholder="Meeting links, notes, or objectives..."
              className={`${inputCls} h-24 resize-none`}
            />
          </div>

          {/* Visibility hint (auto-set based on type) */}
          <div className="mt-2 bg-gray-100 p-5 rounded-2xl border-2 border-black flex items-center gap-4">
            <div className={`w-3 h-3 rounded-full shrink-0 ${formData.event_type === 'Meeting' ? 'bg-green-500' : 'bg-yellow-500'}`} />
            <div>
              <h4 className="font-black uppercase tracking-widest text-sm">
                {formData.event_type === 'Meeting' ? 'Global Event' : 'Private Event'}
              </h4>
              <p className="text-xs text-gray-500 font-bold mt-0.5">
                {formData.event_type === 'Meeting'
                  ? 'Meetings are visible to the entire sales team on the Global Calendar.'
                  : 'This action is only visible in your personal Workspace.'}
              </p>
            </div>
          </div>


          {/* Submit Actions */}
          <div className="mt-4 flex gap-4 pt-4 border-t border-gray-200">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 text-black py-4 rounded-xl font-black uppercase text-xs tracking-widest border-2 border-black hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-black text-white py-4 rounded-xl font-black uppercase text-xs tracking-widest shadow-[4px_4px_0px_0px_#facc15] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#facc15] transition-all disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : 'Drop on Calendar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
