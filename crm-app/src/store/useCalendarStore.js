import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

/** Resolve the current user's organizationId from the lead store (avoids circular imports). */
const getOrgId = async () => {
  const { useLeadStore } = await import('./useLeadStore');
  return useLeadStore.getState().currentUser?.organizationId;
};

export const useCalendarStore = create((set, get) => ({
  events: [],
  isLoading: false,
  error: null,

  /**
   * fetchEvents — Pulls only PENDING events for the current org.
   * Global view → is_private = false
   * Personal view → assigned to the current user
   */
  fetchEvents: async (startDate, endDate, options = {}) => {
    set({ isLoading: true, error: null });
    const organizationId = await getOrgId();

    try {
      let query = supabase
        .from('calendar_events')
        .select('*')
        .gte('start_time', startDate)
        .lte('end_time', endDate)
        .eq('status', 'pending')           // Only show pending events
        .order('start_time', { ascending: true });

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      if (options.globalOnly) {
        // Global view: non-private (Meetings)
        query = query.eq('is_private', false);
      } else if (options.userId) {
        // Personal view: everything assigned to me
        query = query.eq('assigned_to', options.userId);
      }

      const { data, error } = await query;
      if (error) throw error;

      set({ events: data || [] });
      return data || [];
    } catch (err) {
      console.error('Fetch Events Error:', err.message);
      set({ error: err.message });
      return [];
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * addEvent — Inserts a new pending event scoped to the current org.
   */
  addEvent: async (eventData, userId) => {
    set({ isLoading: true, error: null });
    const organizationId = await getOrgId();

    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .insert([{
          ...eventData,
          assigned_to: userId,
          organization_id: organizationId,
          status: 'pending',
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success('Event scheduled successfully');
      set((state) => ({ events: [...state.events, data] }));
      return data;
    } catch (err) {
      console.error('Add Event Error:', err.message);
      set({ error: err.message });
      toast.error('Failed to schedule event: ' + err.message);
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * markEventCompleted — Sets status to 'completed' in Supabase, then
   * removes the event from local state after a short animation delay.
   */
  /**
   * completeEventWithRecap — Sets status to 'completed' and updates description
   * with the final outcome/recap.
   */
  completeEventWithRecap: async (eventId, recap) => {
    // Optimistic: mark as completing so the UI can animate out
    set((state) => ({
      events: state.events.map((e) =>
        e.id === eventId ? { ...e, _completing: true } : e
      ),
    }));

    try {
      const { error } = await supabase
        .from('calendar_events')
        .update({ 
          status: 'completed',
          description: recap 
        })
        .eq('id', eventId);

      if (error) throw error;

      // Remove from local state after animation
      setTimeout(() => {
        set((state) => ({
          events: state.events.filter((e) => e.id !== eventId),
        }));
      }, 600);

      toast.success('Event completed and logged ✓');
    } catch (err) {
      console.error('completeEventWithRecap Error:', err.message);
      // Rollback
      set((state) => ({
        events: state.events.map((e) =>
          e.id === eventId ? { ...e, _completing: false } : e
        ),
      }));
      toast.error('Failed to complete event: ' + err.message);
    }
  },

  markEventCompleted: async (eventId) => {

    // Optimistic: mark as completing so the UI can animate out
    set((state) => ({
      events: state.events.map((e) =>
        e.id === eventId ? { ...e, _completing: true } : e
      ),
    }));

    try {
      const { error } = await supabase
        .from('calendar_events')
        .update({ status: 'completed' })
        .eq('id', eventId);

      if (error) throw error;

      // Remove from local state after a short delay (allows CSS fade-out)
      setTimeout(() => {
        set((state) => ({
          events: state.events.filter((e) => e.id !== eventId),
        }));
      }, 600);

      toast.success('Event marked as done ✓');
    } catch (err) {
      console.error('markEventCompleted Error:', err.message);
      // Rollback the optimistic update
      set((state) => ({
        events: state.events.map((e) =>
          e.id === eventId ? { ...e, _completing: false } : e
        ),
      }));
      toast.error('Failed to complete event: ' + err.message);
    }
  },

  /**
   * deleteEvent — Hard-deletes a calendar event by ID.
   */
  deleteEvent: async (eventId) => {
    set((state) => ({
      events: state.events.filter((e) => e.id !== eventId),
    }));

    try {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;
      toast.success('Event removed');
    } catch (err) {
      console.error('Delete Event Error:', err.message);
      toast.error('Failed to delete event');
    }
  },
}));
