-- Migration 002: Character Session State
-- Created: 2026-04-27
-- Description: Extend sessions table to track active character and voice for multi-character conversations

-- Add character state columns to sessions table
ALTER TABLE sessions ADD COLUMN active_character TEXT NOT NULL DEFAULT 'iris';
ALTER TABLE sessions ADD COLUMN active_quest TEXT;
ALTER TABLE sessions ADD COLUMN current_region TEXT NOT NULL DEFAULT 'berlin';
ALTER TABLE sessions ADD COLUMN active_voice_id TEXT NOT NULL DEFAULT 'XB0fDUnXU5powFXDhCwa';

-- Add character field to messages for attribution
ALTER TABLE messages ADD COLUMN character TEXT NOT NULL DEFAULT 'iris';

-- Index for querying messages by character
CREATE INDEX IF NOT EXISTS idx_messages_character ON messages(conversation_id, character);

-- Comment explaining the fields
-- active_character: ID of the character speaking (e.g., 'iris', 'karl', 'mila')
-- active_quest: Optional quest ID that triggered the character switch
-- current_region: Current region for regional content/characters
-- active_voice_id: ElevenLabs voice ID for TTS (synced with active_character)
-- character (messages): Which character spoke this assistant message
