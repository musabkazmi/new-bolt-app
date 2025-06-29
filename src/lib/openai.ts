// This file is now deprecated - all OpenAI functionality moved to secure backend
// Keeping minimal exports for backward compatibility

export interface RateLimiter {
  canMakeRequest(): boolean;
  getWaitTime(): number;
}

// Mock rate limiter for frontend compatibility
class MockRateLimiter implements RateLimiter {
  canMakeRequest(): boolean {
    return true; // Backend handles rate limiting now
  }

  getWaitTime(): number {
    return 0;
  }
}

export const rateLimiter = new MockRateLimiter();

// Note: OpenAI client is no longer exported as all API calls are now handled securely in the backend
console.log('OpenAI functionality moved to secure backend Edge Function');