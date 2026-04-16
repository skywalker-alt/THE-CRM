import { supabase } from '../_lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { inviterId, email, role } = req.body;
    if (!email || !role || !inviterId) {
      return res.status(400).json({ error: 'Email, Role, and Inviter ID are required.' });
    }

    // 1. Resolve Organization ID for the Inviter
    const { data: memberData, error: memberErr } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', inviterId)
      .single();

    if (memberErr || !memberData) {
      return res.status(403).json({ error: 'Inviter organization not found.' });
    }

    if (memberData.role !== 'Owner' && memberData.role !== 'Admin') {
      return res.status(403).json({ error: 'You do not have permission to invite team members.' });
    }
    const orgId = memberData.organization_id;

    // 2. Dispatch Email Invitation via Supabase Admin Auth
    const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email);
    
    if (inviteError) {
      throw new Error(inviteError.message || 'Failed to send invite email');
    }

    const newUserId = inviteData.user.id;

    // 3. Link new user to the organization
    const { error: linkError } = await supabase
      .from('organization_members')
      .upsert({
        organization_id: orgId,
        user_id: newUserId,
        role: role
      });

    if (linkError) throw linkError;

    res.status(200).json({ success: true, message: 'Invitation sent successfully.', userId: newUserId });

  } catch (error) {
    console.error('Invite Error:', error);
    res.status(500).json({ error: error.message });
  }
}
