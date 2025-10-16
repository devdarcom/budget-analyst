/*
  # Create saved_states table for Budget Visualization Tool

  1. New Tables
    - `saved_states`
      - `id` (uuid, primary key) - Unique identifier for each saved state
      - `user_id` (text) - User identifier who owns the state
      - `name` (text) - User-defined name for the saved state
      - `date` (timestamptz) - When the state was created
      - `data` (jsonb) - JSON data containing budget parameters, iterations, and chart data
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Record update timestamp

  2. Security
    - Enable RLS on `saved_states` table
    - Add policy for users to read their own saved states
    - Add policy for users to create their own saved states
    - Add policy for users to delete their own saved states
    - Add policy for users to update their own saved states

  3. Indexes
    - Add index on `user_id` for faster queries
    - Add index on `created_at` for cleanup operations
*/

CREATE TABLE IF NOT EXISTS saved_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  name text NOT NULL,
  date timestamptz DEFAULT now(),
  data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE saved_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own saved states"
  ON saved_states
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own saved states"
  ON saved_states
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own saved states"
  ON saved_states
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own saved states"
  ON saved_states
  FOR DELETE
  TO authenticated
  USING (auth.uid()::text = user_id);

CREATE INDEX IF NOT EXISTS idx_saved_states_user_id ON saved_states(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_states_created_at ON saved_states(created_at);
