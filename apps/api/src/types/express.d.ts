// Global augmentation: authenticated middleware attaches userId to Request.
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export {};
