import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

/**
 * Q-CRM: useLeadStore
 * Refactored to strictly enforce Supabase authentication.
 * Removed all mock users and fallback logic.
 */

const mapLeadToFrontend = (lead) => ({
  id: lead.id,
  companyName: lead.company_name,
  fullName: lead.full_name,
  decisionMakerName: lead.decision_maker_name || lead.full_name,
  decisionMakerContact: lead.decision_maker_contact || '',
  email: lead.email,
  phone: lead.phone,
  stage: lead.lead_stage,
  assignedTo: lead.assigned_to,
  ownerId: lead.assigned_to,
  dealValue: lead.deal_value || 0,
  industry: lead.industry,
  location: lead.location,
  website: lead.website,
  linkedinUrl: lead.linkedin_url,
  createdAt: lead.created_at,
  updatedAt: lead.updated_at,
  onboardingStatus: lead.onboarding_status,
  qualificationStatus: lead.qualification_status,
  leadStory: lead.lead_story || '',
  closingNotes: lead.closing_notes || '',
  internalNotes: lead.internal_notes || '',
  clientStatus: lead.client_status || 'Onboarding',
  nextActionType: lead.next_action_type || '',
  nextActionDate: lead.next_action_date || null,
  story: [],
});


export const useLeadStore = create((set, get) => ({
  // --- STATE ---
  currentUser: null,
  authInitialized: false,
  
  globalPool: [],
  myQualification: [],
  mySales: [],
  portfolio: [], // Holds 'Closed Won' CS Accounts
  
  
  isLoading: false,
  error: null,
  currentLeadActivities: [],

  // --- AUTH ACTIONS ---
  
  initAuth: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const handleSession = async (currentSession) => {
        if (currentSession?.user) {
          // Fetch additional profile/org info if needed
          const { data: orgMember } = await supabase
            .from('organization_members')
            .select('role, organization_id')
            .eq('user_id', currentSession.user.id)
            .single();
            
          set({
            currentUser: {
              id: currentSession.user.id,
              name: currentSession.user.email.split('@')[0],
              email: currentSession.user.email,
              role: orgMember?.role || 'Agent',
              organizationId: orgMember?.organization_id
            },
            authInitialized: true
          });
        } else {
          set({ currentUser: null, authInitialized: true });
        }
      };

      await handleSession(session);
      
      // Listen for auth changes
      supabase.auth.onAuthStateChange((_event, newSession) => {
        handleSession(newSession);
      });
    } catch (err) {
      console.error('Auth initialization failed:', err);
      set({ currentUser: null, authInitialized: true });
    }
  },

  // --- FETCH ACTIONS ---

  fetchGlobalPool: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .is('assigned_to', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ globalPool: (data || []).map(mapLeadToFrontend), isLoading: false });
    } catch (err) {
      toast.error('Failed to load Global Pool');
      set({ error: err.message, isLoading: false });
    }
  },

  fetchMyWorkspace: async (stage) => {
    const { currentUser } = get();
    if (!currentUser) return;

    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('assigned_to', currentUser.id)
        .eq('lead_stage', stage === 'qualification' ? 'Qualification' : 'Sales')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      
      const mapped = (data || []).map(mapLeadToFrontend);
      if (stage === 'qualification') set({ myQualification: mapped });
      else if (stage === 'sales') set({ mySales: mapped });
      
      set({ isLoading: false });
    } catch (err) {
      toast.error(`Failed to load My ${stage}`);
      set({ error: err.message, isLoading: false });
    }
  },

  fetchPortfolio: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('lead_stage', 'Closed Won')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      set({ portfolio: (data || []).map(mapLeadToFrontend), isLoading: false });
    } catch (err) {
      toast.error('Failed to load Client Portfolio');
      set({ error: err.message, isLoading: false });
    }
  },

  // --- MUTATION ACTIONS ---

  addLead: async (formData) => {
    const { currentUser } = get();
    if (!currentUser) {
      throw new Error('You must be signed in to add a lead.');
    }

    if (!currentUser.organizationId) {
      throw new Error('No organization found. Please contact your admin.');
    }

    const payload = {
      // full_name has a NOT NULL DB constraint; use company name or placeholder until DB is patched
      full_name:       (formData.full_name || formData.company_name || 'TBD').trim(),
      company_name:    formData.company_name || null,
      email:           formData.email        || null,
      phone:           formData.phone        || null,
      website:         formData.website      || null,
      linkedin_url:    formData.linkedin_url || null,
      industry:        formData.industry     || null,
      location:        formData.location     || null,
      deal_value:      formData.deal_value   || 0,
      lead_stage:      'Unassigned',
      assigned_to:     null,
      organization_id: currentUser.organizationId,
    };

    const { data, error } = await supabase
      .from('leads')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;

    const newLead = mapLeadToFrontend(data);
    set(state => ({ globalPool: [newLead, ...state.globalPool] }));
    toast.success('Lead added to Global Pool!');
    return newLead;
  },


  claimLead: async (leadId) => {
    const { currentUser, globalPool } = get();
    if (!currentUser) {
      toast.error('You must be signed in to claim leads');
      return;
    }

    const leadToClaim = globalPool.find(l => l.id === leadId);
    if (!leadToClaim) return;

    // 1. Optimistic Update
    const updatedLead = { 
      ...leadToClaim, 
      assignedTo: currentUser.id, 
      stage: 'Qualification', 
      ownerId: currentUser.id 
    };
    
    set(state => ({
      globalPool: state.globalPool.filter(l => l.id !== leadId),
      myQualification: [updatedLead, ...state.myQualification]
    }));

    try {
      // 2. Database Update
      const { data, error } = await supabase
        .from('leads')
        .update({ 
          assigned_to: currentUser.id, 
          lead_stage: 'Qualification',
          updated_at: new Date().toISOString()
        })
        .eq('id', leadId)
        .is('assigned_to', null)
        .select();

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('Lead already grabbed by another rep!');
      }
      toast.success('Lead claimed! Check your workspace.');
    } catch (err) {
      // 3. Rollback on Failure
      const errorMessage = err.message || 'Failed to claim lead';
      toast.error(errorMessage);
      
      set(state => ({
        globalPool: [leadToClaim, ...state.globalPool],
        myQualification: state.myQualification.filter(l => l.id !== leadId)
      }));
    }
  },

  unclaimLead: async (leadId) => {
    const { currentUser, globalPool, myQualification, mySales } = get();
    if (!currentUser) return;

    const leadToUnclaim = myQualification.find(l => l.id === leadId) || 
                          mySales.find(l => l.id === leadId) ||
                          portfolio.find(l => l.id === leadId);
    if (!leadToUnclaim) return;

    const originalStage = leadToUnclaim.stage;

    // Optimistic unclaim
    set({
      myQualification: myQualification.filter(l => l.id !== leadId),
      mySales: mySales.filter(l => l.id !== leadId),
      portfolio: (portfolio || []).filter(l => l.id !== leadId),
      globalPool: [{ ...leadToUnclaim, assignedTo: null, stage: 'Unassigned', ownerId: null }, ...globalPool]
    });

    try {
      const { error } = await supabase
        .from('leads')
        .update({ 
          assigned_to: null, 
          lead_stage: 'Unassigned',
          updated_at: new Date().toISOString()
        })
        .eq('id', leadId);

      if (error) throw error;
      toast.info('Lead returned to Global Pool');
    } catch (err) {
      toast.error(err.message || 'Failed to return lead');
      // Rollback
      set(state => ({
        myQualification: originalStage === 'Qualification' ? [leadToUnclaim, ...state.myQualification] : state.myQualification,
        mySales: originalStage === 'Sales' ? [leadToUnclaim, ...state.mySales] : state.mySales,
        globalPool: state.globalPool.filter(l => l.id !== leadId)
      }));
    }
  },

  updateLead: async (leadId, updates) => {
    const { currentUser } = get();
    if (!currentUser) return;

    const updateInArray = (arr) => arr.map(l => l.id === leadId ? { ...l, ...updates } : l);
    
    set(state => ({
      globalPool: updateInArray(state.globalPool),
      myQualification: updateInArray(state.myQualification),
      mySales: updateInArray(state.mySales)
    }));

    try {
      const dbUpdates = {};
      if (updates.companyName) dbUpdates.company_name = updates.companyName;
      if (updates.fullName) dbUpdates.full_name = updates.fullName;
      if (updates.email) dbUpdates.email = updates.email;
      if (updates.phone) dbUpdates.phone = updates.phone;
      if (updates.dealValue !== undefined) dbUpdates.deal_value = updates.dealValue;
      if (updates.industry) dbUpdates.industry = updates.industry;
      if (updates.location) dbUpdates.location = updates.location;
      if (updates.website) dbUpdates.website = updates.website;
      if (updates.linkedinUrl) dbUpdates.linkedin_url = updates.linkedinUrl;
      if (updates.leadStory !== undefined) dbUpdates.lead_story = updates.leadStory;
      if (updates.decisionMakerName) dbUpdates.decision_maker_name = updates.decisionMakerName;
      if (updates.decisionMakerContact) dbUpdates.decision_maker_contact = updates.decisionMakerContact;
      if (updates.nextActionType !== undefined) dbUpdates.next_action_type = updates.nextActionType;
      if (updates.nextActionDate !== undefined) dbUpdates.next_action_date = updates.nextActionDate || null;

      const { error } = await supabase
        .from('leads')
        .update({ ...dbUpdates, updated_at: new Date().toISOString() })
        .eq('id', leadId);

      if (error) throw error;
      toast.success('Lead updated');
    } catch (err) {
      toast.error('Failed to update: ' + err.message);
    }
  },

  updateClientStatus: async (leadId, newStatus) => {
    const { currentUser, portfolio } = get();
    if (!currentUser) return;

    // Optimistically update
    const leadToUpdate = portfolio.find(l => l.id === leadId);
    if (!leadToUpdate) return;

    set(state => ({
      portfolio: state.portfolio.map(l => 
        l.id === leadId ? { ...l, clientStatus: newStatus } : l
      )
    }));

    try {
      const { error } = await supabase
        .from('leads')
        .update({ 
          client_status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', leadId);

      if (error) throw error;
      
      // Auto-log the status change in the activity timeline
      await get().addActivity(leadId, 'Status Changed', `Client moved to ${newStatus}`);
      
      toast.success(`Client moved to ${newStatus}`);
    } catch (err) {
      toast.error('Failed to update client status: ' + err.message);
      // Rollback
      set(state => ({
        portfolio: state.portfolio.map(l => 
          l.id === leadId ? { ...l, clientStatus: leadToUpdate.clientStatus } : l
        )
      }));
    }
  },

  moveLead: async (leadId, newStage) => {
    const { currentUser, myQualification, mySales } = get();
    if (!currentUser) return;

    const lead = myQualification.find(l => l.id === leadId) || 
                 mySales.find(l => l.id === leadId) ||
                 (portfolio || []).find(l => l.id === leadId);
    if (!lead) return;

    const oldStage = lead.stage;

    // Optimistic 
    set(state => ({
      myQualification: newStage === 'Qualification' ? [...state.myQualification, { ...lead, stage: newStage }] : state.myQualification.filter(l => l.id !== leadId),
      mySales: newStage === 'Sales' ? [...state.mySales, { ...lead, stage: newStage }] : state.mySales.filter(l => l.id !== leadId),
      portfolio: state.portfolio.filter(l => l.id !== leadId)
    }));

    try {
      const { error } = await supabase
        .from('leads')
        .update({ lead_stage: newStage, updated_at: new Date().toISOString() })
        .eq('id', leadId);

      if (error) throw error;

      get().addActivity(leadId, 'Status Change', `Lead moved to ${newStage}`);
      toast.success(`Success! Lead moved to ${newStage}`);
    } catch (err) {
      toast.error('Move failed: ' + err.message);
      // Rollback
      set(state => ({
        myQualification: oldStage === 'Qualification' ? [lead, ...state.myQualification] : state.myQualification.filter(l => l.id !== leadId),
        mySales: oldStage === 'Sales' ? [lead, ...state.mySales] : state.mySales.filter(l => l.id !== leadId)
      }));
    }
  },

  qualifyLead: async (id, data) => {
    const { currentUser, myQualification, mySales } = get();
    if (!currentUser) return;

    const lead = myQualification.find(l => l.id === id) || mySales.find(l => l.id === id);
    if (!lead) return;

    const oldStage = lead.stage;
    const isHighlyQualified = data.qualification_status === 'Highly Qualified';
    const newStage = isHighlyQualified ? 'Sales' : oldStage;

    // 1. Optimistic Update
    const updatedLead = { ...lead, ...data, stage: newStage };
    
    set(state => ({
      myQualification: newStage === 'Qualification' ? state.myQualification.map(l => l.id === id ? updatedLead : l) : state.myQualification.filter(l => l.id !== id),
      mySales: newStage === 'Sales' ? (oldStage === 'Sales' ? state.mySales.map(l => l.id === id ? updatedLead : l) : [updatedLead, ...state.mySales]) : state.mySales
    }));

    try {
      // 2. Database Update
      const { error } = await supabase
        .from('leads')
        .update({
          phone: data.phone,
          decision_maker_name: data.decision_maker_name,
          decision_maker_contact: data.decision_maker_contact,
          qualification_status: data.qualification_status,
          lead_story: data.lead_story,
          lead_stage: newStage,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      
      if (newStage !== oldStage) {
        get().addActivity(id, 'System', `Qualified and promoted to ${newStage}`);
      } else {
        get().addActivity(id, 'Update', 'Lead information was updated');
      }
      
      toast.success(isHighlyQualified ? 'Lead Promoted to Sales!' : 'Qualification Updated');
    } catch (err) {
      console.error('Qualification failed:', err);
      toast.error('Sync failed: ' + err.message);
      
      // 3. Rollback on Failure
      set(state => ({
        myQualification: newStage === 'Qualification' ? state.myQualification.map(l => l.id === id ? lead : l) : [lead, ...state.myQualification.filter(l => l.id !== id)],
        mySales: newStage === 'Sales' ? (oldStage === 'Sales' ? state.mySales.map(l => l.id === id ? lead : l) : state.mySales.filter(l => l.id !== id)) : state.mySales
      }));
    }
  },

  closeLead: async (id, closeData) => {
    const { currentUser, mySales } = get();
    if (!currentUser) return;

    const lead = mySales.find(l => l.id === id);
    if (!lead) return;

    const { finalDealValue, outcome, closingNotes } = closeData;

    // 1. Optimistic Update (Remove from Sales tab)
    set(state => ({
      mySales: state.mySales.filter(l => l.id !== id)
    }));

    try {
      // 2. Database Update
      const { error } = await supabase
        .from('leads')
        .update({
          deal_value: finalDealValue,
          closing_notes: closingNotes,
          lead_stage: outcome,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      toast.success(`Deal ${outcome === 'Closed Won' ? 'WON' : 'LOST'} - System Updated.`);
    } catch (err) {
      console.error('Closing failed:', err);
      toast.error('Sync failed: ' + err.message);
      
      // 3. Rollback
      set(state => ({ mySales: [lead, ...state.mySales] }));
    }
  },

  /**
   * logFollowUp — Inserts a lead_activity row, then updates the lead's
   * next_action_type and next_action_date so the urgency indicator refreshes.
   */
  logFollowUp: async (leadId, data) => {
    const { currentUser } = get();
    if (!currentUser) return;

    const { activityType, outcome, nextActionType, nextActionDate, internalNotes } = data;

    try {
      // 1. Find the lead to get company name for the event title
      const lead = get().myQualification.find(l => l.id === leadId) || 
                   get().mySales.find(l => l.id === leadId) || 
                   get().portfolio.find(l => l.id === leadId);

      // 2. Insert activity log and capture the returned ID
      const fullContent = nextActionDate && internalNotes
        ? `${outcome}\n\n→ Scheduled Next Action (${nextActionType}): ${internalNotes}`
        : outcome;

      const activityRecord = await get().addActivity(leadId, activityType, fullContent);
      const activityId = activityRecord?.id || null;


      // 3. Update next action on lead
      const dbUpdates = {
        next_action_type: nextActionType,
        next_action_date: nextActionDate,
        internal_notes: internalNotes !== undefined ? internalNotes : null,
        updated_at: new Date().toISOString(),
      };

      const { error: leadError } = await supabase
        .from('leads')
        .update(dbUpdates)
        .eq('id', leadId);

      if (leadError) throw leadError;

      // 4. Sync to Calendar if a date is set
      if (nextActionDate && nextActionType) {
        try {
          const userId = currentUser?.id;
          const organizationId = currentUser?.organizationId;

          if (!userId || !organizationId) {
            console.error('Calendar sync skipped: missing userId or organizationId', { userId, organizationId });
            toast.error('Calendar sync failed: missing user/org context');
          } else {
            // Meetings are global (visible to the team); everything else is private
            const isPrivate = nextActionType !== 'Meeting';

            // For Meetings: use the selected time. Others default to 09:00 AM.
            const startTime = (nextActionType === 'Meeting' && data.nextActionTime)
              ? data.nextActionTime
              : '09:00';
            const [startHour, startMin] = startTime.split(':');
            const endHour = String(Number(startHour) + 1).padStart(2, '0');
            const endTime = `${endHour}:${startMin}`;

            const calendarPayload = {
              title: `${nextActionType} with ${lead?.companyName || 'Lead'}`,
              event_type: nextActionType,
              description: internalNotes || '',
              start_time: `${nextActionDate}T${startTime}:00Z`,
              end_time: `${nextActionDate}T${endTime}:00Z`,
              is_private: isPrivate,
              assigned_to: userId,
              lead_id: leadId,
              organization_id: organizationId,
              linked_activity_id: activityId,
              status: 'pending',
            };

            const { error: calError } = await supabase
              .from('calendar_events')
              .insert([calendarPayload]);

            if (calError) {
              console.error('Calendar insert failed:', calError.message, calError.details);
              toast.error('Failed to sync to calendar: ' + calError.message);
            }
          }
        } catch (calendarCatch) {
          console.error('Calendar sync exception:', calendarCatch);
          toast.error('Failed to sync to calendar (system error)');
        }
      }


      // 5. Update local state
      const updateInArray = (arr) =>
        arr.map((l) =>
          l.id === leadId
            ? { ...l, nextActionType: nextActionType, nextActionDate: nextActionDate, internalNotes: internalNotes !== undefined ? internalNotes : l.internalNotes }
            : l
        );

      set((state) => ({
        myQualification: updateInArray(state.myQualification),
        mySales: updateInArray(state.mySales),
        portfolio: updateInArray(state.portfolio),
      }));

      toast.success(`${activityType} logged${nextActionDate ? ` · Follow-up set for ${nextActionDate}` : ''}`);
    } catch (err) {
      console.error('logFollowUp failed:', err);
      toast.error('Failed to log activity: ' + err.message);
    }
  },

  completeNextAction: async (leadId, actionType) => {
    const { currentUser, myQualification, mySales } = get();
    if (!currentUser) return;

    try {
      // Optimitistic update
      const updateInArray = (arr) =>
        arr.map((l) =>
          l.id === leadId
            ? { ...l, nextActionDate: null, nextActionType: null }
            : l
        );

      set((state) => ({
        myQualification: updateInArray(state.myQualification),
        mySales: updateInArray(state.mySales),
      }));

      const { error: leadError } = await supabase
        .from('leads')
        .update({
          next_action_date: null,
          next_action_type: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', leadId);

      if (leadError) throw leadError;

      // Log the action as requested
      await get().addActivity(leadId, 'Action Completed', `Completed scheduled task: ${actionType || 'Follow-up'}`);

      toast.success('Task marked as completed');
    } catch (err) {
      console.error('completeNextAction failed:', err);
      toast.error('Failed to complete task: ' + err.message);
      // Optional: A true rollback would require keeping the original date and type
    }
  },

  // --- TIMELINE ACTIONS ---
  fetchLeadActivities: async (leadId) => {
    try {
      const { data, error } = await supabase
        .from('lead_activity')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      set({ currentLeadActivities: data || [] });
    } catch (err) {
      console.error('Failed to fetch activities:', err);
    }
  },

  addActivity: async (leadId, type, content) => {
    try {
      const { data, error } = await supabase
        .from('lead_activity')
        .insert({
          lead_id: leadId,
          activity_type: type,
          content: content
        }).select();
        
      if (error) throw error;
      
      set(state => ({
        currentLeadActivities: [data[0], ...state.currentLeadActivities]
      }));

      // Return the record so callers can use its ID
      return data[0];
    } catch (err) {
      console.error('Failed to log activity:', err);
      return null;
    }
  },

  /**
   * deleteActivity — Deletes a lead_activity row and cascades deletion
   * of any linked calendar_events record.
   */
  deleteActivity: async (activityId) => {
    try {
      // 1. Delete any calendar events linked to this activity
      const { error: calError } = await supabase
        .from('calendar_events')
        .delete()
        .eq('linked_activity_id', activityId);

      if (calError) {
        // Log but don't block — the activity deletion should still succeed
        console.error('Failed to delete linked calendar event:', calError.message);
      }

      // 2. Delete the activity itself
      const { error: actError } = await supabase
        .from('lead_activity')
        .delete()
        .eq('id', activityId);

      if (actError) throw actError;

      // 3. Remove from local state
      set((state) => ({
        currentLeadActivities: state.currentLeadActivities.filter(
          (a) => a.id !== activityId
        ),
      }));

      toast.success('Activity deleted');
    } catch (err) {
      console.error('deleteActivity failed:', err);
      toast.error('Failed to delete activity: ' + err.message);
    }
  },
}));
