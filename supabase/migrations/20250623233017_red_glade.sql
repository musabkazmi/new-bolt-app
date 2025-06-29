/*
  # Fix user insert policy creation

  1. Security Changes
    - Drop existing policy if it exists to avoid conflicts
    - Recreate the policy to allow authenticated users to insert their own profile data
    - This enables users to create their profile during the signup process
    - Policy ensures users can only insert rows where their auth.uid() matches the id field

  This resolves the "new row violates row-level security policy" error that prevents
  user profile creation during signup.
*/

-- Drop the policy if it already exists
DROP POLICY IF EXISTS "Users can insert own data" ON users;

-- Create the policy to allow users to insert their own data
CREATE POLICY "Users can insert own data"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);