import { oauth2Client } from '../../_lib/google.js';
import { supabase } from '../../_lib/supabase.js';

export default async function handler(req, res) {
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
}
