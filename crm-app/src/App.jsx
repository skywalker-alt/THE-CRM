import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  Terminal, 
  Layout, 
  Plus, 
  Bell, 
  User,
  Search,
  PlusCircle,
  Activity
} from 'lucide-react';
import { GlobalPoolView } from './components/GlobalPoolView';
import { MyWorkspaceView } from './components/MyWorkspaceView';
import { CalendarView } from './components/CalendarView';
import { ClientPortfolioView } from './components/ClientPortfolioView';
import { LeadDetailModal } from './components/LeadDetailModal';
import { NewLeadModal } from './components/NewLeadModal';
import { UserMenuDropdown } from './components/UserMenuDropdown';
import { AuthOverlay } from './components/AuthOverlay';
import { useLeadStore } from './store/useLeadStore';
import { Toaster } from 'sonner';
import logoUrl from './assets/logo.png';

/**
 * App.jsx (Refactored)
 * The sleek, Neo-Memphis command center for Q-CRM.
 * Features a sticky glass-nav and fluid pool switching.
 */
function App() {
  const [activeTab, setActiveTab] = useState('pool');
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [showNewLeadModal, setShowNewLeadModal] = useState(false);
  
  // ✅ Use stable selectors — only re-render App when exactly these values change.
  // Using the full useLeadStore() here caused App to re-render on EVERY store
  // update (globalPool changes, isLoading flips, etc.) which cascaded into all
  // children receiving new prop references including NewLeadModal's onClose — 
  // triggering re-renders that dropped input focus every keystroke.
  const currentUser = useLeadStore((state) => state.currentUser);
  const authInitialized = useLeadStore((state) => state.authInitialized);
  // Get initAuth once via getState — it's a stable action reference in Zustand
  // and must NOT be in the useEffect dependency array or it creates an infinite loop.
  useEffect(() => {
    useLeadStore.getState().initAuth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount only

  if (!authInitialized) {
    return (
      <div className="h-screen w-screen bg-black flex flex-col items-center justify-center p-8">
        <div className="w-16 h-16 bg-[var(--neo-blue)] rounded-3xl border-2 border-black animate-pulse shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]" />
        <h2 className="mt-8 text-2xl font-black text-white uppercase tracking-widest">Q-CRM Booting...</h2>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthOverlay />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 relative font-sans">
      <Toaster position="top-right" richColors closeButton />
      

      {/* Sticky Glass Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/50 px-8 py-1 md:py-2 flex justify-between items-center">
        <div className="flex items-center gap-6 md:gap-12 pl-4">
          <div className="relative flex items-center group cursor-pointer h-10 md:h-12 w-auto scale-[1.3] md:scale-[1.8] origin-left" onClick={() => setActiveTab('pool')}>
            <img src={logoUrl} className="h-full w-auto opacity-0" alt="QPLAY Logo" />
            <div 
              className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-purple-600 transition-transform group-hover:scale-105"
              style={{
                WebkitMaskImage: `url(${logoUrl})`,
                WebkitMaskSize: 'contain',
                WebkitMaskRepeat: 'no-repeat',
                WebkitMaskPosition: 'center',
                maskImage: `url(${logoUrl})`,
                maskSize: 'contain',
                maskRepeat: 'no-repeat',
                maskPosition: 'center'
              }}
            />
          </div>

          <div className="hidden md:flex items-center gap-1 bg-slate-100 rounded-full p-1 border border-slate-200">
            <button 
              onClick={() => setActiveTab('pool')}
              className={`px-6 py-2 rounded-full text-sm font-medium capitalize transition-all ${
                activeTab === 'pool' ? 'bg-white text-indigo-600 shadow-sm font-semibold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Global Pool
            </button>
            <button 
              onClick={() => setActiveTab('workspace')}
              className={`px-6 py-2 rounded-full text-sm font-medium capitalize transition-all ${
                activeTab === 'workspace' ? 'bg-white text-indigo-600 shadow-sm font-semibold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              My Workspace
            </button>
            <button 
              onClick={() => setActiveTab('calendar')}
              className={`px-6 py-2 rounded-full text-sm font-medium capitalize transition-all ${
                activeTab === 'calendar' ? 'bg-white text-indigo-600 shadow-sm font-semibold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Calendar
            </button>
            <button 
              onClick={() => setActiveTab('customers')}
              className={`px-6 py-2 rounded-full text-sm font-medium capitalize transition-all ${
                activeTab === 'customers' ? 'bg-white text-indigo-600 shadow-sm font-semibold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Portfolio
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowNewLeadModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white font-medium shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:-translate-y-0.5 active:translate-y-0 active:shadow-indigo-500/10 transition-all"
          >
            <PlusCircle size={18} strokeWidth={2.5} />
            <span className="hidden lg:block font-semibold">New Lead</span>
          </button>
          
          <div className="h-8 w-[1px] bg-slate-200 mx-2" />
          
          <button className="text-slate-400 hover:text-slate-600 transition-colors relative">
            <Bell size={22} />
            <span className="absolute top-0 right-0 max-w-full w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
          </button>
          
          <UserMenuDropdown />
        </div>
      </nav>

      {/* Mobile Navigation (Sub-Tabs) */}
      <div className="md:hidden flex justify-center py-4 bg-white/80 backdrop-blur-md border-b border-slate-200/50">
         <div className="flex gap-4">
           <button onClick={() => setActiveTab('pool')} className={`text-sm tracking-wide ${activeTab === 'pool' ? 'text-indigo-600 font-semibold' : 'text-slate-500 font-medium'}`}>Pool</button>
           <button onClick={() => setActiveTab('workspace')} className={`text-sm tracking-wide ${activeTab === 'workspace' ? 'text-indigo-600 font-semibold' : 'text-slate-500 font-medium'}`}>Workspace</button>
           <button onClick={() => setActiveTab('calendar')} className={`text-sm tracking-wide ${activeTab === 'calendar' ? 'text-indigo-600 font-semibold' : 'text-slate-500 font-medium'}`}>Calendar</button>
           <button onClick={() => setActiveTab('customers')} className={`text-sm tracking-wide ${activeTab === 'customers' ? 'text-indigo-600 font-semibold' : 'text-slate-500 font-medium'}`}>Portfolio</button>
         </div>
      </div>

      {/* Main Content Area */}
      <main className="container mx-auto pb-24">
        {activeTab === 'pool' && (
          <GlobalPoolView onLeadClick={setSelectedLeadId} />
        )}
        {activeTab === 'workspace' && (
          <MyWorkspaceView onLeadClick={setSelectedLeadId} />
        )}
        {activeTab === 'calendar' && (
          <CalendarView />
        )}
        {activeTab === 'customers' && (
          <ClientPortfolioView />
        )}
      </main>

      {/* Footer Branding Overlay */}
      <div className="fixed bottom-6 right-8 pointer-events-none opacity-20">
        <h3 className="text-4xl font-bold italic select-none text-slate-300">Q-PLAY CRM v2</h3>
      </div>

      {/* Modals */}
      {selectedLeadId && (
        <LeadDetailModal leadId={selectedLeadId} onClose={() => setSelectedLeadId(null)} />
      )}
      {showNewLeadModal && (
        <NewLeadModal onClose={() => setShowNewLeadModal(false)} />
      )}
    </div>
  );
}

export default App;
