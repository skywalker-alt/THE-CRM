const express = require('express');
const { google } = require('googleapis');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY);

// OAuth 2.0 configuration
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/auth/google/callback'
);

// Helper to get authenticated client for a user
async function getAuthenticatedClient(userId) {
  const { data, error } = await supabase
    .from('user_google_tokens')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    throw new Error('User not authenticated with Google');
  }

  oauth2Client.setCredentials({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  });

  return oauth2Client;
}

// ---------------------------------------------------------
// PHASE 1: AUTHENTICATION & INVITATIONS
// ---------------------------------------------------------

app.post('/api/auth/invite', async (req, res) => {
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
        // We use an upsert just in case they were invited before or already exist
        const { error: orgMemberError } = await supabase
            .from('organization_members')
            .upsert({
                id: targetUserId, // Optionally use a specific ID for the member record, or let it auto-gen if not PK
                organization_id: orgId,
                user_id: targetUserId,
                role: role,
                joined_at: new Date().toISOString()
            }, { onConflict: 'user_id' }); // Assuming user_id can be used as a conflict target, otherwise just insert
            
        // If upsert fails due to constraints, let's just try a simple insert or update
        if (orgMemberError) {
             console.log("Upsert member warning/error (might already exist):", orgMemberError);
             // Try a plain insert if upsert failed
             await supabase.from('organization_members').insert({
                 organization_id: orgId,
                 user_id: targetUserId,
                 role: role,
                 joined_at: new Date().toISOString()
             });
        }

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
            
        if (recordError) {
            console.error('Invitation record creation error:', recordError);
        }

        res.json({ success: true, message: 'Invitation sent via email', userId: targetUserId });

    } catch (e) {
        console.error('Unexpected error:', e);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/auth/google', (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).send('userId is required');

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/spreadsheets.readonly',
      'https://www.googleapis.com/auth/drive.metadata.readonly'
    ],
    state: userId, // Pass userId through state
    prompt: 'consent' // Force to get refresh token
  });

  res.redirect(authUrl);
});

app.get('/api/auth/google/callback', async (req, res) => {
  const { code, state: userId } = req.query;
  try {
    const { tokens } = await oauth2Client.getToken(code);

    // Upsert into Supabase
    const { error } = await supabase
      .from('user_google_tokens')
      .upsert({
        user_id: userId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date
      });

    if (error) throw error;

    res.send('<script>window.opener.postMessage("GOOGLE_AUTH_SUCCESS", "*"); window.close();</script>');
  } catch (error) {
    console.error('OAuth Callback Error:', error);
    res.status(500).send('Authentication failed.');
  }
});

app.get('/api/auth/status', async (req, res) => {
  const { userId } = req.query;
  const { data, error } = await supabase
    .from('user_google_tokens')
    .select('user_id')
    .eq('user_id', userId)
    .single();

  res.json({ connected: !!data && !error });
});

// ---------------------------------------------------------
// PHASE 2: SHEET SELECTION
// ---------------------------------------------------------
app.get('/api/sheets/list', async (req, res) => {
  try {
    const { userId } = req.query;
    const authClient = await getAuthenticatedClient(userId);
    const drive = google.drive({ version: 'v3', auth: authClient });

    const response = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
      fields: 'files(id, name)',
      orderBy: 'modifiedTime desc',
      pageSize: 50
    });

    res.json({ sheets: response.data.files });
  } catch (error) {
    console.error('List Sheets Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------
// PHASE 3: DATA IMPORT AND CLEANING
// ---------------------------------------------------------

// Column matching logic
function mapHeaders(sheetHeaders) {
    const map = {};
    const synonyms = {
        full_name: ['name', 'full name', 'fullname', 'contact', 'lead name', 'decision maker'],
        company_name: ['company', 'organization', 'business', 'employer'],
        email: ['email', 'e-mail', 'email address'],
        phone: ['phone', 'telephone', 'mobile', 'cell', 'contact number'],
        industry: ['industry', 'sector', 'field', 'vertical'],
        location: ['location', 'city', 'address', 'region'],
        linkedin_url: ['linkedin', 'linkedin profile', 'linkedin url']
    };

    sheetHeaders.forEach((h, index) => {
        const headerLower = h.toLowerCase().trim();
        for (const [dbField, possibleNames] of Object.entries(synonyms)) {
            if (possibleNames.includes(headerLower) && !map[dbField]) {
                map[dbField] = index;
                break;
            }
        }
    });
    return map;
}

function normalizeData(rowMapped) {
    let email = rowMapped.email ? rowMapped.email.toLowerCase().trim() : null;
    let full_name = rowMapped.full_name ? rowMapped.full_name.split(' ').map(n => n.charAt(0).toUpperCase() + n.slice(1).toLowerCase()).join(' ') : null;
    let phone = rowMapped.phone ? rowMapped.phone.replace(/[^0-9+]/g, '') : null;
    
    // Validation
    let data_quality_status = 'clean';
    if (!full_name || (!email && !phone)) {
        data_quality_status = 'incomplete';
    }

    return { ...rowMapped, email, full_name, phone, data_quality_status };
}


app.post('/api/sheets/import', async (req, res) => {
  try {
    const { userId, spreadsheetId } = req.body;
    
    const authClient = await getAuthenticatedClient(userId);
    const sheets = google.sheets({ version: 'v4', auth: authClient });

    // Assuming first sheet in workbook
    const sheetInfo = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetName = sheetInfo.data.sheets[0].properties.title;

    const sheetData = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:Z`
    });

    const rows = sheetData.data.values;
    if (!rows || rows.length < 2) {
      return res.status(400).json({ error: 'Sheet is empty or has no data rows' });
    }

    const headers = rows[0];
    const columnMap = mapHeaders(headers);

    // 1. Resolve Organization ID for the User
    let orgId = null;
    const { data: memberData, error: memberErr } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', userId)
        .single();

    if (memberErr || !memberData) {
         // Fallback: Create an organization for them if they don't have one
         const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
         const { data: newOrg, error: orgErr } = await supabaseAdmin
             .from('organizations')
             .insert([{ name: 'Default Organization' }])
             .select()
             .single();
         
         if (orgErr) throw orgErr;
         orgId = newOrg.id;

         await supabaseAdmin.from('organization_members').insert({
             organization_id: orgId,
             user_id: userId,
             role: 'Owner'
         });
    } else {
         orgId = memberData.organization_id;
    }

    // 2. Scope existing leads to the user's organization
    const { data: existingLeads } = await supabase
        .from('leads')
        .select('*')
        .eq('organization_id', orgId);

    let metrics = { total: 0, new: 0, updated: 0, incomplete: 0 };
    const dataRows = rows.slice(1);
    metrics.total = dataRows.length;

    for (let row of dataRows) {
        let mappedData = {};
        for (const [dbField, index] of Object.entries(columnMap)) {
            mappedData[dbField] = row[index] || null;
        }

        const cleanedData = normalizeData(mappedData);
        if (cleanedData.data_quality_status === 'incomplete') metrics.incomplete++;
        
        cleanedData.created_by = userId;
        cleanedData.organization_id = orgId; // VERY IMPORTANT: Attach the org ID
        cleanedData.lead_stage = 'New Lead';
        cleanedData.source = 'Google Sheets Import';

        // Deduplication Check
        let existingMatch = null;
        if (existingLeads) {
             existingMatch = existingLeads.find(l => 
                (cleanedData.email && l.email === cleanedData.email) || 
                (cleanedData.phone && l.phone === cleanedData.phone)
            );
        }

        if (existingMatch) {
            // Upsert / Update
            await supabase.from('leads').update(cleanedData).eq('id', existingMatch.id);
            metrics.updated++;
        } else {
            // Insert
            if (cleanedData.full_name) { // Enforce DB required constraint
                await supabase.from('leads').insert([cleanedData]);
                metrics.new++;
            }
        }
    }

    res.json({ 
        success: true, 
        message: `Imported ${metrics.total} total leads. ${metrics.new} new leads created. ${metrics.updated} duplicates updated. ${metrics.incomplete} marked incomplete.`
    });

  } catch (error) {
    console.error('Import Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------
// PHASE 4: MULTI-TENANCY & TEAM MANAGEMENT
// ---------------------------------------------------------

app.post('/api/org/invite', async (req, res) => {
    try {
        const { inviterId, email, role } = req.body;

        if (!email || !role) {
            return res.status(400).json({ error: 'Email and Role are required.' });
        }

        // 1. Resolve Organization ID for the Inviter
        // In a real production system, the inviter's organization_id is determined securely from their JWT token session.
        // For this implementation, we query the organization_members table.
        let orgId = null;

        const { data: memberData, error: memberErr } = await supabase
            .from('organization_members')
            .select('organization_id, role')
            .eq('user_id', inviterId)
            .single();

        if (memberErr || !memberData) {
            // If they dont have an org, lets create one as a fallback for the sake of the MVP
            // We MUST use the service_role key here to bypass RLS for this administrative action
            const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

            const { data: newOrg, error: orgErr } = await supabaseAdmin
                .from('organizations')
                .insert([{ name: 'My First Organization' }])
                .select()
                .single();
            
            if (orgErr) throw orgErr;
            orgId = newOrg.id;

            await supabaseAdmin.from('organization_members').insert({
                organization_id: orgId,
                user_id: inviterId,
                role: 'Owner'
            });
        } else {
            if (memberData.role !== 'Owner' && memberData.role !== 'Admin') {
                return res.status(403).json({ error: 'You do not have permission to invite team members.' });
            }
            orgId = memberData.organization_id;
        }

        // 2. Dispatch the Email Invitation via Supabase Admin Auth
        const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email);
        
        if (inviteError) {
             console.log("Invite error", inviteError);
             throw new Error(inviteError.message || 'Failed to send invite email from Supabase');
        }

        const newUserId = inviteData.user.id;

        // 3. Link the new user to the organization
        const { error: linkError } = await supabase
            .from('organization_members')
            .upsert({
                organization_id: orgId,
                user_id: newUserId,
                role: role
                // The status will be implicitly "invited" based on their auth.users profile status (not verified yet)
            });

        if (linkError) throw linkError;

        res.json({ success: true, message: 'Invitation sent successfully.', userId: newUserId });

    } catch (error) {
        console.error('Invite Error:', error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`CRM Sync Server running on port ${PORT}`));
