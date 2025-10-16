import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.query;

    if (!userId || typeof userId !== 'string') {
      console.log('Missing or invalid userId:', userId);
      return res.status(400).json({ error: 'Missing or invalid userId' });
    }

    const { data: savedStates, error } = await supabase
      .from('saved_states')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error getting saved states:', error);
      return res.status(500).json({ error: 'Failed to get saved states' });
    }

    console.log(`Retrieved ${savedStates?.length || 0} saved states for user ${userId}`);
    return res.status(200).json(savedStates || []);
  } catch (error) {
    console.error('Error getting saved states:', error);
    return res.status(500).json({ error: 'Failed to get saved states' });
  }
}