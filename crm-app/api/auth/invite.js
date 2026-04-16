import { supabase } from '../_lib/supabase.js';

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, role, inviterId } = req.body;
  if (!email || !role || !inviterId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // 1. Check Inviter role & get organization_id
    const { data: inviterData, error: inviterError } = await supabase
      .from('organization_members')
      .select('role, organization_id')
      .eq('user_id', inviterId)
      .single();

    if (inviterError || !inviterData) {
      return res.status(403).json({ error: 'Inviter not found or no permissions' });
    }

    if (inviterData.role !== 'Owner' && inviterData.role !== 'Admin') {
      return res.status(403).json({ error: 'Not authorized to invite members' });
    }

    const orgId = inviterData.organization_id;

    // 2. Generate Invite via Supabase Auth Admin
    const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email);

    if (inviteError) {
      console.error('Invite Error:', inviteError);
      return res.status(500).json({ error: 'Failed to generate invite' });
    }

    const targetUserId = inviteData.user.id;

    // 3. Pre-register the user in organization_members
    const { error: orgMemberError } = await supabase
      .from('organization_members')
      .upsert({
        organization_id: orgId,
        user_id: targetUserId,
        role: role,
        joined_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    // 4. Create Invitation Record
    const { error: recordError } = await supabase
      .from('invitations')
      .insert({
        organization_id: orgId,
        email: email,
        role: role,
        invited_by: inviterId,
        status: 'pending'
      });

    if (recordError) console.error('Invitation record creation error:', recordError);

    res.status(200).json({ success: true, message: 'Invitation sent via email', userId: targetUserId });

  } catch (e) {
    console.error('Unexpected error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}
