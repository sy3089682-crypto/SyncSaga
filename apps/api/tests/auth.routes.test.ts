import request from 'supertest';
import express from 'express';
import { authRouter } from '../src/routes/auth.routes';

// Mock supabase client - must be defined before jest.mock
const mockInsert = jest.fn().mockReturnThis();
const mockSelect = jest.fn().mockReturnThis();
const mockEq = jest.fn().mockReturnThis();
const mockSingle = jest.fn().mockResolvedValue({ data: null });

jest.mock('../src/lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signInWithIdToken: jest.fn(),
    },
    from: jest.fn(() => ({
      insert: mockInsert,
      select: mockSelect,
      eq: mockEq,
      single: mockSingle,
    })),
  },
}));

jest.mock('../src/lib/jwt', () => ({
  generateToken: jest.fn(() => 'mock-jwt-token'),
}));

// Import after mocks are set up
const { supabase: mockSupabase } = require('../src/lib/supabase');

describe('Auth Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/auth', authRouter);
    
    // Clear all mocks
    jest.clearAllMocks();
    mockInsert.mockClear();
    mockSelect.mockClear();
    mockEq.mockClear();
    mockSingle.mockClear();
  });

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        username: 'testuser',
      };

      mockSupabase.auth.signUp.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: userData.email,
          },
        },
        error: null,
      });

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: userData.email,
        password: userData.password,
      });
    });

    it('should return error for invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'password123',
        username: 'testuser',
      };

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should return error for short password', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'short',
        username: 'testuser',
      };

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle Supabase registration error', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        username: 'testuser',
      };

      mockSupabase.auth.signUp.mockResolvedValue({
        data: null,
        error: { message: 'User already exists' },
      });

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.error).toBe('User already exists');
    });
  });

  describe('POST /auth/login', () => {
    it('should login user successfully', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'password123',
      };

      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: credentials.email,
          },
        },
        error: null,
      });

      const response = await request(app)
        .post('/auth/login')
        .send(credentials)
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: credentials.email,
        password: credentials.password,
      });
    });

    it('should return error for invalid credentials', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: null,
        error: { message: 'Invalid login credentials' },
      });

      const response = await request(app)
        .post('/auth/login')
        .send(credentials)
        .expect(401);

      expect(response.body.error).toBe('Invalid login credentials');
    });
  });

  describe('POST /auth/google', () => {
    it('should handle Google OAuth login', async () => {
      const googleToken = 'google-id-token';

      mockSupabase.auth.signInWithIdToken.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
            user_metadata: {
              full_name: 'Test User',
              avatar_url: 'https://example.com/avatar.jpg',
            },
          },
        },
        error: null,
      });

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null,
      });

      const response = await request(app)
        .post('/auth/google')
        .send({ code: googleToken })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
    });

    it('should create profile if not exists', async () => {
      const googleToken = 'google-id-token';

      mockSupabase.auth.signInWithIdToken.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
            user_metadata: {
              full_name: 'Test User',
            },
          },
        },
        error: null,
      });

      // Return null for profile (doesn't exist)
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null,
      });

      await request(app)
        .post('/auth/google')
        .send({ code: googleToken })
        .expect(200);

      expect(mockSupabase.from().insert).toHaveBeenCalled();
    });
  });
});
