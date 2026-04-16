import { oauth2Client } from '../_lib/google.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).send('userId is required');
  }

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/spreadsheets.readonly',
      'https://www.googleapis.com/auth/drive.metadata.readonly'
    ],
    state: userId,
    prompt: 'consent'
  });

  res.redirect(authUrl);
}
