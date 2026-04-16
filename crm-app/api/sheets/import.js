import { google } from 'googleapis';
import { supabase } from '../_lib/supabase.js';
import { getAuthenticatedClient } from '../_lib/google.js';

// Helper: Column matching logic
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
    if (!h) return;
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

// Helper: Data normalization
function normalizeData(rowMapped) {
  let email = rowMapped.email ? rowMapped.email.toLowerCase().trim() : null;
  let full_name = rowMapped.full_name ? rowMapped.full_name.split(' ').map(n => n.charAt(0).toUpperCase() + n.slice(1).toLowerCase()).join(' ') : null;
  let phone = rowMapped.phone ? rowMapped.phone.replace(/[^0-9+]/g, '') : null;
  
  let data_quality_status = 'clean';
  if (!full_name || (!email && !phone)) {
    data_quality_status = 'incomplete';
  }

  return { ...rowMapped, email, full_name, phone, data_quality_status };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { userId, spreadsheetId } = req.body;
    if (!userId || !spreadsheetId) return res.status(400).json({ error: 'Missing userId or spreadsheetId' });

    const authClient = await getAuthenticatedClient(userId, supabase);
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

    // 1. Resolve Organization ID
    const { data: memberData, error: memberErr } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', userId)
      .single();

    if (memberErr || !memberData) {
      return res.status(403).json({ error: 'User does not belong to an organization' });
    }
    const orgId = memberData.organization_id;

    // 2. Fetch existing leads for deduplication
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
      cleanedData.organization_id = orgId;
      cleanedData.lead_stage = 'New Lead';
      cleanedData.source = 'Google Sheets Import';

      let existingMatch = existingLeads?.find(l => 
        (cleanedData.email && l.email === cleanedData.email) || 
        (cleanedData.phone && l.phone === cleanedData.phone)
      );

      if (existingMatch) {
        await supabase.from('leads').update(cleanedData).eq('id', existingMatch.id);
        metrics.updated++;
      } else if (cleanedData.full_name) {
        await supabase.from('leads').insert([cleanedData]);
        metrics.new++;
      }
    }

    res.status(200).json({ 
      success: true, 
      message: `Imported ${metrics.total} total leads. ${metrics.new} new leads created. ${metrics.updated} duplicates updated. ${metrics.incomplete} marked incomplete.`
    });

  } catch (error) {
    console.error('Import Error:', error);
    res.status(500).json({ error: error.message });
  }
}
