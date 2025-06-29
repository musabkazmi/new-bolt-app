import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, User } from '../lib/supabase';
import { aiChatBackend } from '../lib/aiChatBackend';
import type { AuthError, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string, role: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  clearAIChatHistory: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log('Initializing auth with Supabase...');

        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          if (mounted) {
            setSession(null);
            setUser(null);
            setLoading(false);
          }
          return;
        }

        console.log('Initial session:', session?.user?.email);

        if (mounted) {
          setSession(session);
          if (session?.user) {
            await fetchUserProfile(session.user.id);
          } else {
            setUser(null);
            setLoading(false);
          }
        }

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (!mounted) return;
          
          console.log('Auth state changed:', event, session?.user?.email);
          
          // Handle sign out immediately
          if (event === 'SIGNED_OUT' || !session) {
            console.log('User signed out, clearing state immediately');
            setSession(null);
            setUser(null);
            setLoading(false);
            return;
          }
          
          setSession(session);
          if (session?.user) {
            await fetchUserProfile(session.user.id);
          } else {
            setUser(null);
            setLoading(false);
          }
        });

        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setSession(null);
          setUser(null);
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      console.log('Fetching user profile for:', userId);
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user profile:', error);
        setUser(null);
      } else if (data) {
        console.log('User profile found:', data);
        setUser(data);
      } else {
        console.warn('No user profile found for user ID:', userId);
        setUser(null);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name: string, role: string) => {
    try {
      console.log('Attempting to sign up user:', email, 'with role:', role);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
        }
      });

      console.log('Sign up response:', { data, error });

      if (error) {
        console.error('Sign up error:', error);
        return { error };
      }

      if (data.user) {
        console.log('User created, now creating profile...');
        
        // Wait a moment for the user to be fully created
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Create user profile
        const { data: profileData, error: profileError } = await supabase
          .from('users')
          .insert([
            {
              id: data.user.id,
              email,
              name,
              role,
            },
          ])
          .select()
          .single();

        console.log('Profile creation response:', { profileData, profileError });

        if (profileError) {
          console.error('Error creating user profile:', profileError);
          return { error: profileError as AuthError };
        }

        // If email confirmation is disabled, the user should be signed in immediately
        if (data.session) {
          console.log('User signed in immediately');
          setUser(profileData);
        }
      }

      return { error: null };
    } catch (error) {
      console.error('Error in signUp:', error);
      return { error: error as AuthError };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log('Attempting to sign in user:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log('Sign in response:', { data, error });

      return { error };
    } catch (error) {
      console.error('Error in signIn:', error);
      return { error: error as AuthError };
    }
  };

  const clearAIChatHistory = async () => {
    if (!user) return;

    try {
      console.log('Clearing AI chat history for user:', user.id);
      
      // Clear chat from backend using the new API
      const result = await aiChatBackend.clearChat(user.id);
      
      if (!result.success) {
        console.error('Error clearing AI chat history from backend:', result.error);
        throw new Error(result.error || 'Failed to clear chat history');
      }
      
      console.log('AI chat history cleared from backend successfully');
      
      // Also delete all messages for the current user from Supabase (if still using local storage)
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        console.error('Error clearing AI chat history from database:', error);
        // Don't throw here as backend clearing is more important
      } else {
        console.log('AI chat history cleared from database successfully');
      }
    } catch (error) {
      console.error('Error clearing AI chat history:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      console.log('Starting logout process...');
      
      // Step 1: Clear AI chat history from backend FIRST (while user is still authenticated)
      if (user) {
        try {
          console.log('Clearing AI chat history before logout...');
          await clearAIChatHistory();
          console.log('AI chat history cleared successfully');
        } catch (error) {
          console.error('Error clearing AI chat history during logout:', error);
          // Continue with logout even if chat history clearing fails
        }
      }
      
      // Step 2: Call Supabase signOut first to ensure proper cleanup
      console.log('Signing out from Supabase...');
      const { error } = await supabase.auth.signOut({
        scope: 'global' // This ensures all sessions are cleared
      });
      
      if (error) {
        console.error('Error signing out from Supabase:', error);
        // Continue with local cleanup even if Supabase signOut fails
      } else {
        console.log('Successfully signed out from Supabase');
      }
      
      // Step 3: Force clear local state immediately after Supabase signOut
      console.log('Clearing local authentication state...');
      setUser(null);
      setSession(null);
      setLoading(false);
      
      // Step 4: Clear any cached data or local storage
      try {
        // Clear any localStorage items related to auth
        localStorage.removeItem('supabase.auth.token');
        sessionStorage.clear();
        
        // Force reload the page to ensure complete cleanup
        setTimeout(() => {
          window.location.reload();
        }, 100);
      } catch (storageError) {
        console.error('Error clearing storage:', storageError);
      }
      
      console.log('Logout process completed');
    } catch (error) {
      console.error('Error in signOut:', error);
      // Ensure state is cleared even if there's an error
      setUser(null);
      setSession(null);
      setLoading(false);
      
      // Force reload as fallback
      setTimeout(() => {
        window.location.reload();
      }, 100);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      signUp,
      signIn,
      signOut,
      clearAIChatHistory,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}