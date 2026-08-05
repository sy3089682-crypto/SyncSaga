import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Guest session store (in production, use Redis)
const guestSessions = new Map<string, {
  id: string;
  username: string;
  createdAt: Date;
  lastActive: Date;
}>();

// Clean up expired sessions every hour
setInterval(() => {
  const now = new Date();
  const expirationTime = 24 * 60 * 60 * 1000; // 24 hours
  
  for (const [key, session] of guestSessions.entries()) {
    if (now.getTime() - session.createdAt.getTime() > expirationTime) {
      guestSessions.delete(key);
    }
  }
}, 60 * 60 * 1000);

// Validate guest join request
const guestJoinSchema = z.object({
  roomId: z.string().min(1),
  username: z.string().min(2).max(50).optional(),
});

// Join as guest
router.post('/join', async (req: Request, res: Response) => {
  try {
    const { roomId, username } = guestJoinSchema.parse(req.body);
    
    // Generate guest ID and username
    const guestId = `guest_${uuidv4().slice(0, 8)}`;
    const finalUsername = username || `Guest_${Math.floor(Math.random() * 1000)}`;
    
    // Create guest session
    const session = {
      id: guestId,
      username: finalUsername,
      createdAt: new Date(),
      lastActive: new Date(),
    };
    
    guestSessions.set(guestId, session);
    
    // Generate a temporary token for the guest
    // In production, this should be a proper JWT with guest claims
    const token = Buffer.from(JSON.stringify({
      type: 'guest',
      userId: guestId,
      username: finalUsername,
      roomId,
      exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    })).toString('base64');
    
    res.json({
      guest: {
        id: guestId,
        username: finalUsername,
      },
      token,
    });
  } catch (error) {
    console.error('Guest join error:', error);
    res.status(400).json({ error: 'Invalid request' });
  }
});

// Validate guest token
router.get('/verify/:token', (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
    
    if (decoded.type !== 'guest') {
      return res.status(401).json({ valid: false });
    }
    
    // Check if session exists
    const session = guestSessions.get(decoded.userId);
    if (!session) {
      return res.status(401).json({ valid: false, expired: true });
    }
    
    // Check expiration
    if (decoded.exp && Date.now() > decoded.exp) {
      guestSessions.delete(decoded.userId);
      return res.status(401).json({ valid: false, expired: true });
    }
    
    res.json({ valid: true, guest: session });
  } catch {
    res.status(401).json({ valid: false });
  }
});

// Get room as guest (limited access)
router.get('/room/:roomId', (req: Request, res: Response) => {
  const { roomId } = req.params;
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const token = authHeader.substring(7);
  
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
    
    if (decoded.type !== 'guest' || decoded.roomId !== roomId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Return limited room info for guests
    res.json({
      id: roomId,
      name: 'Watch Room',
      isGuest: true,
      canHost: false,
    });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Convert guest to registered user
router.post('/upgrade', async (req: Request, res: Response) => {
  try {
    const { token, email, password, username } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Token required' });
    }
    
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
    
    if (decoded.type !== 'guest') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    // Get guest session
    const session = guestSessions.get(decoded.userId);
    if (!session) {
      return res.status(401).json({ error: 'Session expired' });
    }
    
    // In production, this would create a real user account
    // For now, we'll just return a success response
    // The frontend will handle the actual registration
    
    // Clean up guest session
    guestSessions.delete(decoded.userId);
    
    res.json({
      success: true,
      message: 'Ready to upgrade',
      previousUsername: session.username,
    });
  } catch (error) {
    console.error('Upgrade error:', error);
    res.status(400).json({ error: 'Upgrade failed' });
  }
});

export default router;
