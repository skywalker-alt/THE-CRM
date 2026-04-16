import React, { useEffect } from 'react';
import { useLeadStore } from '../store/useLeadStore';
import { 
  Building, 
  DollarSign, 
  Users, 
  MapPin, 
  Briefcase,
  ChevronRight,
  UserCheck
} from 'lucide-react';
import { LeadDetailModal } from './LeadDetailModal';

export function ClientPortfolioView() {
  const { portfolio, fetchPortfolio, isLoading, updateClientStatus } = useLeadStore();
  const [selectedLeadId, setSelectedLeadId] = React.useState(null);

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  const activeClients = portfolio?.length || 0;
  const totalMRR = (portfolio || []).reduce((sum, client) => sum + (Number(client.dealValue) || 0), 0);

  const onboardingClients = (portfolio || []).filter(c => c.clientStatus === 'Onboarding' || c.clientStatus === 'Pending Onboarding' || !c.clientStatus);
  const trialClients = (portfolio || []).filter(c => c.clientStatus === 'Active Trial');
  const liveClients = (portfolio || []).filter(c => c.clientStatus === 'Live Subscription');

  const renderClientCard = (client) => (
    <div key={client.id} className="bg-white rounded-[20px] p-5 shadow-sm border border-slate-100 hover:shadow-md hover:-translate-y-1 transition-all flex flex-col gap-4">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center">
            <Building className="w-5 h-5 text-slate-400" />
          </div>
          <div>
            <h3 className="text-slate-800 font-semibold text-base leading-tight">{client.companyName || 'Unnamed Client'}</h3>
            <div className="flex items-center gap-1.5 text-sm text-slate-400 mt-0.5">
              <UserCheck className="w-4 h-4" />
              <span>{client.decisionMakerName}</span>
            </div>
          </div>
        </div>
        
        {/* Status Changer Dropdown */}
        <select 
          className="appearance-none bg-slate-50 border border-slate-200 rounded-full px-3 py-1 text-xs font-medium text-slate-600 cursor-pointer hover:bg-slate-100 transition-colors"
          value={client.clientStatus === 'Active Trial' || client.clientStatus === 'Live Subscription' ? client.clientStatus : 'Onboarding'}
          onChange={(e) => updateClientStatus(client.id, e.target.value)}
        >
          <option value="Onboarding">Onboarding</option>
          <option value="Active Trial">Active Trial</option>
          <option value="Live Subscription">Live Subscription</option>
        </select>
      </div>

      <div className="mt-1 grid grid-cols-2 gap-2 text-sm text-slate-600">
        <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-full">
          <DollarSign className="w-4 h-4 text-green-500" />
          <span className="font-medium">${Number(client.dealValue || 0).toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-full truncate">
          <Briefcase className="w-4 h-4 text-purple-500" />
          <span className="truncate font-medium">{client.industry || 'No Industry'}</span>
        </div>
      </div>

      <button 
        onClick={() => setSelectedLeadId(client.id)}
        className="w-full mt-2 py-2.5 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium transition-colors flex items-center justify-center gap-2 text-sm"
      >
        View Profile <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );

  return (
    <div className="max-w-[1600px] mx-auto px-8 relative z-10 py-12">
      
      {/* Portfolio HUD */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        <div className="bg-white rounded-[24px] shadow-sm border border-slate-100 p-6 flex items-center justify-between">
          <div>
            <p className="text-slate-500 font-medium text-sm mb-1">Active Clients</p>
            <h2 className="text-slate-800 font-bold text-4xl">{activeClients}</h2>
          </div>
          <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center">
            <Users className="w-6 h-6 text-slate-400" />
          </div>
        </div>

        <div className="bg-white rounded-[24px] shadow-sm border border-slate-100 p-6 flex items-center justify-between">
          <div>
            <p className="text-slate-500 font-medium text-sm mb-1">Total MRR / ARR</p>
            <h2 className="text-slate-800 font-bold text-4xl text-green-500">${totalMRR.toLocaleString()}</h2>
          </div>
          <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-green-500" />
          </div>
        </div>
      </div>

      {/* 3-Column Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Onboarding Column */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-700 font-semibold text-lg">Onboarding</h3>
            <span className="bg-slate-100 text-slate-600 rounded-full px-3 py-1 text-sm font-medium">{onboardingClients.length}</span>
          </div>
          {isLoading && onboardingClients.length === 0 ? (
            <div className="animate-pulse h-32 bg-slate-50 border border-slate-100 rounded-[20px]" />
          ) : (
            <div className="flex flex-col gap-4">
              {onboardingClients.map(renderClientCard)}
            </div>
          )}
        </div>

        {/* Active Trial Column */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-700 font-semibold text-lg">Active Trial</h3>
            <span className="bg-slate-100 text-slate-600 rounded-full px-3 py-1 text-sm font-medium">{trialClients.length}</span>
          </div>
          {isLoading && trialClients.length === 0 ? (
            <div className="animate-pulse h-32 bg-slate-50 border border-slate-100 rounded-[20px]" />
          ) : (
            <div className="flex flex-col gap-4">
              {trialClients.map(renderClientCard)}
            </div>
          )}
        </div>

        {/* Live Subscription Column */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-700 font-semibold text-lg">Live Subscription</h3>
            <span className="bg-slate-100 text-slate-600 rounded-full px-3 py-1 text-sm font-medium">{liveClients.length}</span>
          </div>
          {isLoading && liveClients.length === 0 ? (
            <div className="animate-pulse h-32 bg-slate-50 border border-slate-100 rounded-[20px]" />
          ) : (
            <div className="flex flex-col gap-4">
              {liveClients.map(renderClientCard)}
            </div>
          )}
        </div>
      </div>

      {selectedLeadId && (
        <LeadDetailModal leadId={selectedLeadId} onClose={() => setSelectedLeadId(null)} />
      )}
    </div>
  );
}
