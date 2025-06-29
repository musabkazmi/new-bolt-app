export interface QueryAIBackendRequest {
  message: string;
}

export interface QueryAIBackendResponse {
  answer?: string;
  result: any[];
  sql_query: string;
  error?: string;
}

export class QueryAIBackend {
  private apiUrl = 'https://bolt-ai-sql-backend.onrender.com/ai/query';

  async query(message: string): Promise<QueryAIBackendResponse> {
    try {
      console.log('Calling QueryAI Backend with message:', message);

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Handle specific quota errors
        if (response.status === 429) {
          if (errorData.error?.message?.includes('quota') || errorData.error?.code === 'insufficient_quota') {
            throw new Error('The AI service has reached its usage limit. Please try again later or contact support.');
          }
          throw new Error('Too many requests. Please wait a moment and try again.');
        }
        
        throw new Error(errorData.error?.message || errorData.error || `API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('QueryAI Backend response:', data);

      return {
        answer: data.answer || '',
        result: data.result || [],
        sql_query: data.sql_query || '',
        error: data.error
      };

    } catch (error: any) {
      console.error('Error calling QueryAI Backend:', error);
      
      return {
        answer: '',
        result: [],
        sql_query: '',
        error: error.message || 'Failed to connect to QueryAI Backend'
      };
    }
  }
}

export const queryAIBackend = new QueryAIBackend();