import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getAiRouter, resetAiRouter } from '../services/ai.service';
import { createAiRouter } from '../lib/ai/router/ai-router';
import { getEnv } from '@syncsaga/config';
import { logger } from '../lib/logger';

// Mock dependencies
vi.mock('../lib/ai/router/ai-router', () => ({
  createAiRouter: vi.fn(),
}));

vi.mock('@syncsaga/config', () => ({
  getEnv: vi.fn(),
}));

vi.mock('../lib/logger', () => ({
  logger: {
    info: vi.fn(),
  },
}));

describe('AI Service Initialization', () => {
  const mockAiRouterInstance = {
    hasProvider: vi.fn().mockReturnValue(true),
    isAvailable: vi.fn().mockReturnValue(true),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetAiRouter(); // Reset the singleton instance before each test
    vi.mocked(createAiRouter).mockReturnValue(mockAiRouterInstance as any);
  });

  afterEach(() => {
    resetAiRouter(); // Clean up after each test
  });

  it('should initialize AiRouter with proper configuration from environment', () => {
    const mockEnv = {
      AI_GROQ_API_KEY: 'test-groq-key',
      AI_GEMINI_API_KEY: 'test-gemini-key',
      CLOUDFLARE_ACCOUNT_ID: 'test-cf-id',
      CLOUDFLARE_API_TOKEN: 'test-cf-token',
    };
    vi.mocked(getEnv).mockReturnValue(mockEnv as any);

    const router = getAiRouter();

    expect(getEnv).toHaveBeenCalledTimes(1);
    expect(createAiRouter).toHaveBeenCalledTimes(1);
    expect(createAiRouter).toHaveBeenCalledWith({
      groqApiKey: 'test-groq-key',
      geminiApiKey: 'test-gemini-key',
      cloudflareAccountId: 'test-cf-id',
      cloudflareApiToken: 'test-cf-token',
    });
    expect(router).toBe(mockAiRouterInstance);

    // Verify logger was called
    expect(logger.info).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        groq: true,
        gemini: true,
        cloudflare: true,
        available: true,
      }),
      'AI router initialized'
    );
  });

  it('should fallback to AI_API_KEY for Groq if AI_GROQ_API_KEY is missing', () => {
    const mockEnv = {
      AI_API_KEY: 'test-fallback-key',
      AI_GEMINI_API_KEY: 'test-gemini-key',
      CLOUDFLARE_ACCOUNT_ID: 'test-cf-id',
      CLOUDFLARE_API_TOKEN: 'test-cf-token',
    };
    vi.mocked(getEnv).mockReturnValue(mockEnv as any);

    const router = getAiRouter();

    expect(createAiRouter).toHaveBeenCalledWith({
      groqApiKey: 'test-fallback-key',
      geminiApiKey: 'test-gemini-key',
      cloudflareAccountId: 'test-cf-id',
      cloudflareApiToken: 'test-cf-token',
    });
  });

  it('should act as a singleton, only calling createAiRouter once', () => {
    const mockEnv = {
      AI_GROQ_API_KEY: 'test-groq-key',
    };
    vi.mocked(getEnv).mockReturnValue(mockEnv as any);

    // First call
    const router1 = getAiRouter();
    expect(createAiRouter).toHaveBeenCalledTimes(1);
    expect(getEnv).toHaveBeenCalledTimes(1);

    // Second call
    const router2 = getAiRouter();
    expect(createAiRouter).toHaveBeenCalledTimes(1); // Still 1
    expect(getEnv).toHaveBeenCalledTimes(1); // Still 1
    expect(router1).toBe(router2);
  });
});
