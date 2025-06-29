// This file is now deprecated - all AI functionality moved to QueryAI Backend
// Keeping minimal exports for backward compatibility

export interface AIResponse {
  message: string;
  data?: any;
  error?: string;
}

// Note: AIAgent class is no longer used as all AI calls are now handled by QueryAI Backend
console.log('AI functionality moved to QueryAI Backend');

// Export a mock agent for backward compatibility
export const aiAgent = {
  processMessage: async (message: string): Promise<AIResponse> => {
    return {
      message: 'AI functionality has been moved to QueryAI Backend',
      error: 'Deprecated'
    };
  }
};