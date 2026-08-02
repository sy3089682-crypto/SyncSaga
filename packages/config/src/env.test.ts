import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("getEnv", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("should return parsed environment variables when all required variables are present", async () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: "development",
      JWT_SECRET: "a-very-long-secret-key-that-is-at-least-32-chars",
      JWT_REFRESH_SECRET:
        "another-very-long-secret-key-that-is-at-least-32-chars",
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_KEY: "service-key-123",
    };

    const { getEnv } = await import("./env");
    const env = getEnv();

    expect(env).toBeDefined();
    expect(env.NODE_ENV).toBe("development");
    expect(env.JWT_SECRET).toBe(
      "a-very-long-secret-key-that-is-at-least-32-chars",
    );
    expect(env.SUPABASE_URL).toBe("https://example.supabase.co");
  });

  it("should throw an error with missing variable names when required variables are absent", async () => {
    process.env = {
      NODE_ENV: "development",
    };

    const { getEnv } = await import("./env");

    expect(() => getEnv()).toThrowError(
      /Missing required environment variables: JWT_SECRET, JWT_REFRESH_SECRET, SUPABASE_URL, SUPABASE_SERVICE_KEY/,
    );
  });

  it("should not throw, but print a console.warn when a string is too short", async () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: "development",
      JWT_SECRET: "short", // Too short
      JWT_REFRESH_SECRET:
        "another-very-long-secret-key-that-is-at-least-32-chars",
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_KEY: "service-key-123",
    };

    const consoleWarnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => {});

    const { getEnv } = await import("./env");

    const env = getEnv();

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "Environment validation warnings:",
      "JWT_SECRET",
    );
    expect(env.JWT_SECRET).toBe("short");
  });

  it("should cache and return the same environment on subsequent calls", async () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: "development",
      JWT_SECRET: "a-very-long-secret-key-that-is-at-least-32-chars",
      JWT_REFRESH_SECRET:
        "another-very-long-secret-key-that-is-at-least-32-chars",
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_KEY: "service-key-123",
    };

    const { getEnv } = await import("./env");
    const env1 = getEnv();

    process.env.NODE_ENV = "production";

    const env2 = getEnv();

    expect(env1).toBe(env2);
    expect(env2.NODE_ENV).toBe("development");
  });
});
