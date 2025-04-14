import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';

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

    // Save state to database
    const savedState = await prisma.savedState.create({
      data: {
        userId,
        name,
        data,
      },
    });

    console.log('State saved successfully:', savedState.id);
    return res.status(200).json({ success: true, id: savedState.id });
  } catch (error) {
    console.error('Error saving state:', error);
    return res.status(500).json({ error: 'Failed to save state' });
  }
}