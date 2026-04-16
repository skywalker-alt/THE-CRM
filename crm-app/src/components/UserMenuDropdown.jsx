import React, { useState, useRef, useEffect } from 'react';
import { LogOut, UserPlus, Shield, User, ChevronDown } from 'lucide-react';
import { useLeadStore } from '../store/useLeadStore';
import { InviteTeamModal } from './InviteTeamModal';
import { supabase } from '../lib/supabase';

/**
 * UserMenuDropdown (Refactored)
 * Neo-Memphis styled user menu with clean actions.
 */
export function UserMenuDropdown() {
  const { currentUser } = useLeadStore();
  const [isOpen, setIsOpen] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      window.location.reload(); 
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const name = currentUser?.email?.split('@')[0] || 'User';

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        className="flex items-center gap-3 p-1 rounded-full border-2 border-transparent hover:border-black hover:bg-white/5 transition-all group"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="w-10 h-10 rounded-full border-2 border-black bg-[var(--neo-magenta)] flex items-center justify-center text-black font-black text-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] group-hover:scale-105 transition-transform uppercase">
          {name.charAt(0)}
        </div>
        <div className="hidden lg:block text-left mr-2">
          <div className="text-xs font-black uppercase tracking-widest text-slate-900 leading-none mb-1">{name}</div>
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter flex items-center gap-1">
            <Shield size={10} className="text-[var(--neo-cyan)]" /> {currentUser?.role || 'User'}
          </div>
        </div>
        <ChevronDown size={14} className={`text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-4 w-64 neo-card bg-[#1a1a1a] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] py-2 z-[100] overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 bg-black/40">
             <div className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-1">Signed in as</div>
             <div className="font-bold truncate text-sm text-slate-100">{currentUser?.email}</div>
          </div>

          <div className="p-2 space-y-1">
            <button 
              onClick={() => { setIsOpen(false); setShowInviteModal(true); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-neutral-800 text-slate-100 transition-all font-bold text-sm text-left group"
            >
              <UserPlus size={18} className="text-slate-300 group-hover:text-white group-hover:scale-110 transition-transform" />
              <span>Invite Team</span>
            </button>
            
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500 hover:text-white text-slate-100 transition-all font-bold text-sm text-left group"
            >
              <LogOut size={18} className="text-slate-300 group-hover:text-white group-hover:scale-110 transition-transform" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}

      {showInviteModal && <InviteTeamModal onClose={() => setShowInviteModal(false)} />}
    </div>
  );
}
