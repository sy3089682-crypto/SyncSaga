/**
 * Authentication types for SyncSaga
 * Compatibility layer between custom JWT and Supabase sessions
 */

export interface User {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Session {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  token_type?: string;
}

export interface AuthState {
  user: User | null;
  session: Session | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface SignUpCredentials {
  email: string;
  password: string;
  name?: string;
}

export interface UseAuthReturn extends AuthState {
  signIn: (credentials: SignInCredentials) => Promise<void>;
  signUp: (credentials: SignUpCredentials) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  // Compatibility aliases for existing code during migration
  get token(): string | null;
  get logout(): () => Promise<void>;
}

// Type assertion for useAuth return type (declaration only - no implementation allowed in .d.ts)
export declare function assertUseAuthReturn(value: any): asserts value is UseAuthReturn;
