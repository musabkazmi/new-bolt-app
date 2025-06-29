import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Trash2, Sparkles, MessageCircle, AlertTriangle, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { aiChatBackend, ChatMessage } from '../lib/aiChatBackend';

export default function AIAgent() {
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string>('');
  const [isClearing, setIsClearing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  const getRoleColor = (role: string) => {
    const colors = {
      manager: 'from-blue-500 to-blue-600',
      waiter: 'from-green-500 to-green-600',
      kitchen: 'from-orange-500 to-orange-600',
      customer: 'from-purple-500 to-purple-600'
    };
    return colors[role as keyof typeof colors] || 'from-gray-500 to-gray-600';
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const isQuotaError = (errorMessage: string) => {
    return errorMessage.includes('usage limit') || 
           errorMessage.includes('quota') || 
           errorMessage.includes('billing details');
  };

  const generateMessageId = () => {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !user || isTyping) return;

    const userMessage = inputValue.trim();
    setError('');
    
    // Add user message to chat
    const userChatMessage: ChatMessage = {
      id: generateMessageId(),
      content: userMessage,
      type: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userChatMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      console.log('Sending message to AI Chat Backend:', userMessage, 'for user:', user.id);
      const result = await aiChatBackend.sendMessage(userMessage, user.id);
      
      if (result.error) {
        setError(result.error);
        setIsTyping(false);
        return;
      }

      // Add AI response to chat
      const aiChatMessage: ChatMessage = {
        id: generateMessageId(),
        content: result.answer,
        type: 'assistant',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiChatMessage]);
      
    } catch (error: any) {
      console.error('Error sending message:', error);
      setError('AI backend unavailable');
    } finally {
      setIsTyping(false);
    }
  };

  const clearChat = async () => {
    if (!user) return;
    
    setIsClearing(true);
    setError('');
    
    try {
      const result = await aiChatBackend.clearChat(user.id);
      
      if (result.success) {
        setMessages([]);
        console.log('Chat cleared successfully for user:', user.id);
      } else {
        setError(result.error || 'Failed to clear chat session');
      }
    } catch (error: any) {
      console.error('Error clearing chat:', error);
      setError('Failed to clear chat session');
    } finally {
      setIsClearing(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Don't show if user is not logged in
  if (!user) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto h-full flex flex-col">
      {/* Header */}
      <div className={`bg-gradient-to-r ${getRoleColor(user?.role || '')} text-white p-6 rounded-t-xl`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-lg">
              <div className="relative">
                <Bot className="w-6 h-6" />
                <Sparkles className="w-3 h-3 absolute -top-1 -right-1 text-yellow-300" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold">AI Assistant</h1>
              <p className="opacity-90 flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                Chat with AI about your restaurant data
              </p>
            </div>
          </div>
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              disabled={isClearing}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              {isClearing ? 'Clearing...' : 'Clear Chat'}
            </button>
          )}
        </div>
      </div>

      {/* Chat Container */}
      <div className="flex-1 bg-white border-x border-gray-200 overflow-hidden flex flex-col">
        {/* Error Messages */}
        {error && (
          <div className={`p-4 border-b ${isQuotaError(error) ? 'bg-orange-50 border-orange-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center gap-2">
              {isQuotaError(error) ? (
                <AlertCircle className="w-4 h-4 text-orange-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-600" />
              )}
              <div className="flex-1">
                <p className={`text-sm font-medium ${isQuotaError(error) ? 'text-orange-800' : 'text-red-700'}`}>
                  {isQuotaError(error) ? 'Service Temporarily Unavailable' : 'Error'}
                </p>
                <p className={`text-sm ${isQuotaError(error) ? 'text-orange-700' : 'text-red-600'}`}>
                  {error}
                </p>
              </div>
              <button
                onClick={() => setError('')}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <div className="bg-gray-50 rounded-lg p-6 max-w-md mx-auto">
                <Bot className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Welcome to AI Assistant</h3>
                <p className="text-gray-600 text-sm">
                  Start a conversation by typing your message below.
                </p>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-xs lg:max-w-md xl:max-w-lg ${message.type === 'user' ? 'order-2' : 'order-1'}`}>
                    <div className={`flex items-end gap-2 ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      {/* Avatar */}
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        message.type === 'user' 
                          ? `bg-gradient-to-r ${getRoleColor(user?.role || '')} text-white` 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {message.type === 'user' ? (
                          <User className="w-4 h-4" />
                        ) : (
                          <Bot className="w-4 h-4" />
                        )}
                      </div>
                      
                      {/* Message Bubble */}
                      <div className={`px-4 py-2 rounded-2xl ${
                        message.type === 'user'
                          ? `bg-gradient-to-r ${getRoleColor(user?.role || '')} text-white`
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </div>
                    
                    {/* Timestamp */}
                    <div className={`text-xs text-gray-500 mt-1 ${message.type === 'user' ? 'text-right' : 'text-left'} ${message.type === 'user' ? 'mr-10' : 'ml-10'}`}>
                      {formatTime(message.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Typing Indicator */}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="max-w-xs lg:max-w-md xl:max-w-lg">
                    <div className="flex items-end gap-2">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center">
                        <Bot className="w-4 h-4" />
                      </div>
                      <div className="px-4 py-2 rounded-2xl bg-gray-100">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1 ml-10">
                      Typing...
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 p-4">
          <form onSubmit={handleSendMessage} className="flex gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                id="input_query"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={isTyping ? "AI is typing..." : "Type your message..."}
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:bg-gray-50"
                disabled={isTyping}
                maxLength={500}
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isTyping}
                className={`absolute right-2 top-1/2 transform -translate-y-1/2 p-2 rounded-full transition-all duration-200 ${
                  inputValue.trim() && !isTyping
                    ? `bg-gradient-to-r ${getRoleColor(user?.role || '')} text-white hover:shadow-lg hover:scale-105`
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isTyping ? (
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </form>
          
          <div className="mt-2 text-xs text-gray-500 text-center">
            AI Chat Backend • User ID: {user.id.slice(0, 8)}...
            {isTyping && <span className="text-blue-600"> • AI is thinking...</span>}
          </div>
        </div>
      </div>
    </div>
  );
}