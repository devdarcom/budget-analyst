import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Calculate date threshold (states older than 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Delete old saved states
    const deletedStates = await prisma.savedState.deleteMany({
      where: {
        date: {
          lt: thirtyDaysAgo
        }
      }
    });

    console.log(`Cleaned up ${deletedStates.count} old saved states`);
    return res.status(200).json({ 
      success: true, 
      message: `Cleaned up ${deletedStates.count} old saved states`,
      count: deletedStates.count
    });
  } catch (error) {
    console.error('Error cleaning up database:', error);
    return res.status(500).json({ error: 'Failed to clean up database' });
  }
}