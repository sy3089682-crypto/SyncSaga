import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Poll schemas
const pollOptionSchema = z.object({
  id: z.string(),
  text: z.string().min(1).max(200),
  votes: z.number().int().min(0),
});

const pollSchema = z.object({
  question: z.string().min(1).max(500),
  options: z.array(z.string().min(1).max(200)).min(2).max(6),
  durationSeconds: z.number().int().min(10).max(3600).optional(),
});

// In-memory poll store (use Redis in production)
const polls = new Map<string, {
  id: string;
  question: string;
  options: Map<string, { id: string; text: string; votes: number; voters: string[] }>;
  totalVotes: number;
  isOpen: boolean;
  expiresAt?: number;
  createdBy: string;
  createdAt: number;
  roomId: string;
}>();

// Helper to get poll
function getPoll(pollId: string) {
  return polls.get(pollId);
}

// Helper to broadcast poll update
function broadcastPollUpdate(pollId: string, io: any) {
  const poll = polls.get(pollId);
  if (!poll) return;
  
  const options = Array.from(poll.options.values()).map(opt => ({
    id: opt.id,
    text: opt.text,
    votes: opt.votes,
    percentage: poll.totalVotes > 0 ? Math.round((opt.votes / poll.totalVotes) * 100) : 0,
  }));
  
  const pollData = {
    id: poll.id,
    question: poll.question,
    options,
    totalVotes: poll.totalVotes,
    isOpen: poll.isOpen,
    expiresAt: poll.expiresAt,
    createdBy: poll.createdBy,
    createdAt: poll.createdAt,
    roomId: poll.roomId,
    voted: false, // Will be set by client based on their vote
  };
  
  io.to(`room:${poll.roomId}`).emit(`poll:update:${poll.roomId}`, pollData);
}

// Create poll
router.post('/create', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { roomId, question, options, durationSeconds } = req.body;
    
    const validated = pollSchema.parse({ question, options, durationSeconds });
    
    const pollId = `poll_${uuidv4().slice(0, 8)}`;
    const optionIds = options.map(() => `opt_${uuidv4().slice(0, 6)}`);
    
    const optionMap = new Map<string, { id: string; text: string; votes: number; voters: string[] }>();
    options.forEach((text: string, index: number) => {
      optionMap.set(optionIds[index], {
        id: optionIds[index],
        text,
        votes: 0,
        voters: [],
      });
    });
    
    const expiresAt = durationSeconds 
      ? Date.now() + durationSeconds * 1000 
      : undefined;
    
    const poll = {
      id: pollId,
      question,
      options: optionMap,
      totalVotes: 0,
      isOpen: true,
      expiresAt,
      createdBy: req.user!.id || 'unknown',
      createdAt: Date.now(),
      roomId,
    };
    
    polls.set(pollId, poll);
    
    // Build response
    const responseOptions = Array.from(optionMap.values()).map(opt => ({
      id: opt.id,
      text: opt.text,
      votes: opt.votes,
      percentage: 0,
    }));
    
    const pollResponse = {
      id: pollId,
      question,
      options: responseOptions,
      totalVotes: 0,
      isOpen: true,
      expiresAt,
      createdBy: poll.createdBy,
      createdAt: poll.createdAt,
      roomId,
      voted: false,
    };
    
    res.json({ poll: pollResponse });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid poll data' });
    } else {
      console.error('Create poll error:', error);
      res.status(500).json({ error: 'Failed to create poll' });
    }
  }
});

// Vote on poll
router.post('/vote', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { roomId, pollId, optionId } = req.body;
    
    if (!roomId || !pollId || !optionId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const poll = polls.get(pollId);
    
    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }
    
    if (!poll.isOpen) {
      return res.status(400).json({ error: 'Poll is closed' });
    }
    
    if (poll.roomId !== roomId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const option = poll.options.get(optionId);
    if (!option) {
      return res.status(404).json({ error: 'Option not found' });
    }
    
    // Check if already voted
    if (option.voters.includes(req.user!.id)) {
      return res.status(400).json({ error: 'Already voted' });
    }
    
    // Record vote
    option.votes += 1;
    option.voters.push(req.user!.id);
    poll.totalVotes += 1;
    
    // Build response
    const responseOptions = Array.from(poll.options.values()).map(opt => ({
      id: opt.id,
      text: opt.text,
      votes: opt.votes,
      percentage: poll.totalVotes > 0 ? Math.round((opt.votes / poll.totalVotes) * 100) : 0,
    }));
    
    const pollResponse = {
      id: poll.id,
      question: poll.question,
      options: responseOptions,
      totalVotes: poll.totalVotes,
      isOpen: poll.isOpen,
      expiresAt: poll.expiresAt,
      createdBy: poll.createdBy,
      createdAt: poll.createdAt,
      roomId: poll.roomId,
      voted: true,
      userVote: optionId,
    };
    
    res.json({ poll: pollResponse });
  } catch (error) {
    console.error('Vote error:', error);
    res.status(500).json({ error: 'Failed to vote' });
  }
});

// Close poll
router.post('/close', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { roomId, pollId } = req.body;
    
    const poll = polls.get(pollId);
    
    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }
    
    if (poll.roomId !== roomId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Would check if user is creator or host in production
    poll.isOpen = false;
    
    // Build response
    const responseOptions = Array.from(poll.options.values()).map(opt => ({
      id: opt.id,
      text: opt.text,
      votes: opt.votes,
      percentage: poll.totalVotes > 0 ? Math.round((opt.votes / poll.totalVotes) * 100) : 0,
    }));
    
    const pollResponse = {
      id: poll.id,
      question: poll.question,
      options: responseOptions,
      totalVotes: poll.totalVotes,
      isOpen: false,
      expiresAt: poll.expiresAt,
      createdBy: poll.createdBy,
      createdAt: poll.createdAt,
      roomId: poll.roomId,
      voted: false,
    };
    
    res.json({ poll: pollResponse });
  } catch (error) {
    console.error('Close poll error:', error);
    res.status(500).json({ error: 'Failed to close poll' });
  }
});

// Get poll
router.get('/:pollId', (req: AuthenticatedRequest, res: Response) => {
  const { pollId } = req.params;
  const poll = pollId! ? polls.get(pollId!) : undefined;
  
  if (!poll) {
    return res.status(404).json({ error: 'Poll not found' });
  }
  
  const responseOptions = Array.from(poll.options.values()).map(opt => ({
    id: opt.id,
    text: opt.text,
    votes: opt.votes,
    percentage: poll.totalVotes > 0 ? Math.round((opt.votes / poll.totalVotes) * 100) : 0,
  }));
  
  res.json({
    id: poll.id,
    question: poll.question,
    options: responseOptions,
    totalVotes: poll.totalVotes,
    isOpen: poll.isOpen,
    expiresAt: poll.expiresAt,
    createdBy: poll.createdBy,
    createdAt: poll.createdAt,
    roomId: poll.roomId,
    voted: false,
  });
});

// Auto-close expired polls
setInterval(() => {
  const now = Date.now();
  
  for (const [pollId, poll] of polls.entries()) {
    if (poll.isOpen && poll.expiresAt && now > poll.expiresAt) {
      poll.isOpen = false;
      // Broadcast update
      console.log(`Auto-closing poll ${pollId}`);
    }
  }
}, 10000); // Check every 10 seconds

export default router;
