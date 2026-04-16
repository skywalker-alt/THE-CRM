import { google } from 'googleapis';
import { supabase } from '../_lib/supabase.js';
import { getAuthenticatedClient } from '../_lib/google.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    const authClient = await getAuthenticatedClient(userId, supabase);
    const drive = google.drive({ version: 'v3', auth: authClient });

    const response = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
      fields: 'files(id, name)',
      orderBy: 'modifiedTime desc',
      pageSize: 50
    });

    res.status(200).json({ sheets: response.data.files });
  } catch (error) {
    console.error('List Sheets Error:', error);
    res.status(500).json({ error: error.message });
  }
}
