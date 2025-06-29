/*
  # Add INSERT policy for users table

  1. Security Changes
    - Add RLS policy to allow authenticated users to insert their own profile data
    - This enables users to create their profile during the signup process
    - Policy ensures users can only insert rows where their auth.uid() matches the id field

  This resolves the "new row violates row-level security policy" error that prevents
  user profile creation during signup.
*/

CREATE POLICY "Users can insert own data"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);