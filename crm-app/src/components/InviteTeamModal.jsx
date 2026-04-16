import React, { useState } from 'react';
import { X, Mail, Shield, Loader2, AlertCircle, Send } from 'lucide-react';
import { useLeadStore } from '../store/useLeadStore';

/**
 * InviteTeamModal (Refactored)
 * Neo-Memphis styled invitation form.
 */
export function InviteTeamModal({ onClose }) {
  const { currentUser } = useLeadStore();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Sales');
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [errorMessage, setErrorMessage] = useState('');

  const SYNC_SERVER_URL = 'http://localhost:3001';

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!email) {
      setErrorMessage('Email is required');
      return;
    }

    setStatus('loading');
    setErrorMessage('');

    try {
      const res = await fetch(`${SYNC_SERVER_URL}/api/auth/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inviterId: currentUser.id,
          email,
          role
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send invitation');

      setStatus('success');
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message);
      setStatus('error');
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-md neo-card bg-[#141414] shadow-[8px_8px_0px_0px_rgba(34,211,238,0.2)] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="h-2 bg-[var(--neo-cyan)]" />
        
        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-black uppercase tracking-tight">Invite Agent</h2>
            <button 
              onClick={onClose} 
              className="w-10 h-10 rounded-full border-2 border-black bg-white text-black flex items-center justify-center hover:scale-110 transition-transform"
              disabled={status === 'loading'}
            >
              <X size={20} strokeWidth={3} />
            </button>
          </div>

          {status === 'success' ? (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-[var(--neo-cyan)] rounded-full border-2 border-black flex items-center justify-center mx-auto mb-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <Send size={32} className="text-black" />
              </div>
              <h3 className="text-xl font-black mb-2">Invitation Sent!</h3>
              <p className="text-gray-400 text-sm mb-8">
                We've sent a secure link to <span className="text-white font-bold">{email}</span>.
              </p>
              <button className="w-full neo-button bg-white text-black py-4 uppercase font-black tracking-widest text-xs" onClick={onClose}>
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleInvite} className="space-y-6">
              <p className="text-sm text-gray-400 font-medium leading-relaxed">
                Add a new collaborator to the pool. They will get an invitation to join your organization as <span className="text-[var(--neo-cyan)] font-bold">{role}</span>.
              </p>

              {status === 'error' && (
                <div className="p-4 bg-red-500/10 border-2 border-red-500 rounded-xl flex items-center gap-3 text-red-200 text-xs font-bold">
                  <AlertCircle size={16} /> {errorMessage}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  <input 
                    type="email" 
                    className="w-full pl-12 pr-4 py-3 rounded-2xl border-2 border-black bg-black text-white focus:ring-4 focus:ring-[var(--neo-cyan)] outline-none font-bold placeholder:text-gray-700" 
                    placeholder="agent@qplay.ai"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    disabled={status === 'loading'}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Agent Role</label>
                <div className="relative">
                  <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  <select 
                    className="w-full pl-12 pr-4 py-3 rounded-2xl border-2 border-black bg-black text-white focus:ring-4 focus:ring-[var(--neo-cyan)] outline-none font-black appearance-none"
                    value={role}
                    onChange={e => setRole(e.target.value)}
                    disabled={status === 'loading'}
                  >
                    <option value="Sales">Sales Team</option>
                    <option value="Onboarding">Onboarding Team</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button" 
                  className="flex-1 font-black uppercase tracking-widest text-[10px] text-gray-500 hover:text-white transition-colors" 
                  onClick={onClose} 
                  disabled={status === 'loading'}
                >
                  Skip
                </button>
                <button 
                  type="submit" 
                  className="flex-[2] neo-button bg-[var(--neo-blue)] text-white py-4 flex items-center justify-center gap-2 uppercase font-black tracking-tighter" 
                  disabled={status === 'loading' || !email}
                >
                  {status === 'loading' ? <Loader2 className="animate-spin" size={18} /> : 'Send Invite'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
