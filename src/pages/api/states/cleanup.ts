import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await supabase
      .from('saved_states')
      .delete()
      .lt('date', thirtyDaysAgo.toISOString())
      .select();

    if (error) {
      console.error('Error cleaning up database:', error);
      return res.status(500).json({ error: 'Failed to clean up database' });
    }

    const count = data?.length || 0;
    console.log(`Cleaned up ${count} old saved states`);
    return res.status(200).json({
      success: true,
      message: `Cleaned up ${count} old saved states`,
      count
    });
  } catch (error) {
    console.error('Error cleaning up database:', error);
    return res.status(500).json({ error: 'Failed to clean up database' });
  }
}