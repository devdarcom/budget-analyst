import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name, data } = req.body;

    if (!name || !data) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data: savedState, error } = await supabase
      .from('saved_states')
      .insert({
        user_id: user.id,
        name,
        data,
        date: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving state:', error);
      return res.status(500).json({ error: 'Failed to save state' });
    }

    return res.status(200).json({ success: true, id: savedState.id });
  } catch (error) {
    console.error('Error saving state:', error);
    return res.status(500).json({ error: 'Failed to save state' });
  }
}