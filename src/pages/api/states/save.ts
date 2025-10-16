import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, name, data } = req.body;

    if (!userId || !name || !data) {
      console.log('Missing required fields:', { userId, name, data: !!data });
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data: savedState, error } = await supabase
      .from('saved_states')
      .insert({
        user_id: userId,
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

    console.log('State saved successfully:', savedState.id);
    return res.status(200).json({ success: true, id: savedState.id });
  } catch (error) {
    console.error('Error saving state:', error);
    return res.status(500).json({ error: 'Failed to save state' });
  }
}