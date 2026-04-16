import React, { useState } from 'react';
import { useLeadStore } from '../store/useLeadStore';
import { 
  X, 
  User, 
  Phone, 
  MessageSquare,
  Building,
  Rocket,
  DollarSign,
  Mail,
  Save
} from 'lucide-react';
import { toast } from 'sonner';

/**
 * QualifyLeadModal
 * High-fidelity redesign matching image_7cd973.png
 * Features a solid blue header and two-column data management.
 */
const QualifyLeadModal = ({ lead, onClose }) => {
  const { updateLead, moveLead, unclaimLead } = useLeadStore();
  
  // Mappings per user request:
  // "Full Name" -> decisionMakerName
  // "Phone Number" -> decisionMakerContact
  // "Lead Information" -> leadStory
  const [formData, setFormData] = useState({
    decisionMakerName: lead.decisionMakerName || '',
    decisionMakerContact: lead.decisionMakerContact || '',
    email: lead.email || '',
    dealValue: lead.dealValue || 0,
    leadStory: lead.leadStory || '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async (e) => {
    e?.preventDefault();
    
    // VALIDATION: Ensure critical fields are actually filled
    if (!formData.decisionMakerName?.trim() || !formData.decisionMakerContact?.trim() || !formData.leadStory?.trim()) {
      toast.error("Please fill out Name, Contact Info, and the Lead Narrative before saving.");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateLead(lead.id, formData);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMoveToSales = async () => {
    // Stage update to 'Sales' is optimistic in the store
    await updateLead(lead.id, formData); // Ensure data is saved first
    await moveLead(lead.id, 'Sales');
    onClose();
  };

  const handleRelease = async () => {
    if (confirm('Are you sure you want to release this lead back to the Global Pool?')) {
      await unclaimLead(lead.id);
      onClose();
    }
  };

  if (!lead) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal Container */}
      <div className="relative w-full max-w-5xl max-h-[90vh] flex flex-col lg:flex-row bg-[#ffffff] rounded-[2.5rem] border-4 border-neutral-900 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Left Column: Contact & Info (Scrollable) */}
        <div className="flex-1 min-h-0 overflow-y-auto p-10 space-y-10 border-b-4 lg:border-b-0 lg:border-r-4 border-neutral-900">
          
          {/* Header */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center text-white">
                <Building size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tight leading-none">{lead.companyName}</h2>
                <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mt-1">Update Lead Information</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
            >
              <X size={24} strokeWidth={3} />
            </button>
          </div>
            
          {/* Contact Details Section */}
          <div className="space-y-6">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <User size={14} className="text-[#3b82f6]" /> Contact Details
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                  <input
                    type="text"
                    value={formData.decisionMakerName}
                    onChange={(e) => setFormData({ ...formData, decisionMakerName: e.target.value })}
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-[#3b82f6] focus:bg-white p-4 pl-12 rounded-xl font-bold text-gray-700 outline-none transition-all"
                    placeholder="DM Full Name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-[#3b82f6] focus:bg-white p-4 pl-12 rounded-xl font-bold text-gray-700 outline-none transition-all"
                    placeholder="contact@company.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                  <input
                    type="text"
                    value={formData.decisionMakerContact}
                    onChange={(e) => setFormData({ ...formData, decisionMakerContact: e.target.value })}
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-[#3b82f6] focus:bg-white p-4 pl-12 rounded-xl font-bold text-gray-700 outline-none transition-all"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Deal Value ($)</label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                  <input
                    type="number"
                    value={formData.dealValue}
                    onChange={(e) => setFormData({ ...formData, dealValue: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-[#3b82f6] focus:bg-white p-4 pl-12 rounded-xl font-bold text-gray-700 outline-none transition-all"
                    placeholder="5000"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Lead Information Section */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <MessageSquare size={14} className="text-[#3b82f6]" /> Lead Information
            </h3>
            <textarea
              value={formData.leadStory}
              onChange={(e) => setFormData({ ...formData, leadStory: e.target.value })}
              className="w-full bg-gray-50 border-2 border-transparent focus:border-[#3b82f6] focus:bg-white p-6 rounded-2xl font-medium text-gray-600 h-64 outline-none transition-all resize-none shadow-inner"
              placeholder="Write the narrative here..."
            />
          </div>
        </div>

        {/* Right Column: Pipeline Control */}
        <div className="w-full lg:w-80 bg-[#f9fafb] flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-2">Current Pool</p>
                <div className="flex items-center justify-between">
                  <span className="text-xl font-black text-gray-800 tracking-tight">Qualification</span>
                  <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                </div>
              </div>
              
              <div className="pt-4 border-t border-gray-100 italic text-[10px] text-gray-400 font-medium leading-relaxed">
                Lead is currently in your qualification desk. Ready to promote?
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <button 
                onClick={handleMoveToSales}
                className="w-full border-2 border-[#3b82f6] text-[#3b82f6] p-5 rounded-2xl font-black uppercase text-xs tracking-[0.15em] flex items-center justify-center gap-3 hover:bg-blue-50 transition-all group"
              >
                <Rocket size={18} className="group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform" />
                Move to Sales
              </button>
              
              <div className="text-center">
                <button 
                  onClick={handleRelease}
                  className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-red-500 transition-colors"
                >
                  Release back to pool
                </button>
              </div>
            </div>
          </div>
          
          {/* Action Footer locked to the bottom of the right column */}
          <div className="p-6 border-t-2 border-gray-200 bg-[#f9fafb] shrink-0">
            <button
              onClick={handleSave}
              disabled={isSubmitting}
              className="w-full h-14 bg-neutral-900 text-white font-bold text-sm uppercase tracking-wider rounded-2xl border-2 border-transparent hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2"
            >
              <Save size={18} />
              {isSubmitting ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QualifyLeadModal;
