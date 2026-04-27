-- Migration: 004 — Pen pal letter scheduling placeholder (M10)
-- Adds a nullable scheduled_send_at column to pen_pal_letters so we can
-- insert a "pending" row on pen pal unlock. The row is not dispatched in
-- M10 (no scheduler). The Durable Object scheduler lands with M11 and
-- will promote rows whose scheduled_send_at <= now() and sent_at IS NULL.
--
-- Also adds last_interaction_at to user_pen_pals to support attention score
-- queries that already reference this column in worker/tools/pen-pals.ts.

ALTER TABLE pen_pal_letters ADD COLUMN scheduled_send_at TEXT;

ALTER TABLE user_pen_pals ADD COLUMN last_interaction_at TEXT;

CREATE INDEX IF NOT EXISTS idx_pen_pal_letters_scheduled
  ON pen_pal_letters(scheduled_send_at);
