import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('Path: /api/states/delete Request received:', { method: req.method, query: req.query });
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id, userId } = req.query;

    if (!id || typeof id !== 'string' || !userId || typeof userId !== 'string') {
      console.log('Missing required fields:', { id, userId });
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { error } = await supabase
      .from('saved_states')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting state:', error);
      return res.status(500).json({ error: 'Failed to delete state' });
    }

    console.log(`Deleted state ${id} for user ${userId}`);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error deleting state:', error);
    return res.status(500).json({ error: 'Failed to delete state' });
  }
}