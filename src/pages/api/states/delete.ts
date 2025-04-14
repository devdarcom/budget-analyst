import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id, userId } = req.query;

    if (!id || typeof id !== 'string' || !userId || typeof userId !== 'string') {
      console.log('Missing required fields:', { id, userId });
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Delete state from database
    await prisma.savedState.deleteMany({
      where: {
        id,
        userId, // Ensure the state belongs to the user
      },
    });

    console.log(`Deleted state ${id} for user ${userId}`);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error deleting state:', error);
    return res.status(500).json({ error: 'Failed to delete state' });
  }
}