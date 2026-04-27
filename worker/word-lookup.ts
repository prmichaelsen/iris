/**
 * Word definition lookup for hover/tap translation popover.
 *
 * Hybrid strategy:
 *   1. Check word_definitions cache (instant)
 *   2. Check vocab_cards (instant for items already in user curriculum)
 *   3. Fall through to Claude (slowest path, result cached for future hits)
 */

import Anthropic from '@anthropic-ai/sdk'

export interface WordDefinition {
  lemma: string
  article: string | null
  gloss: string
  cefr_level: string | null
  example_de: string | null
  example_en: string | null
  source: 'cache' | 'vocab_cards' | 'claude'
}

const NORMALIZE_RE = /[.,!?;:"'„"()\[\]…—–]/g

export function normalizeWord(word: string): string {
  return word.trim().toLowerCase().replace(NORMALIZE_RE, '').trim()
}

export async function lookupWord(
  db: D1Database,
  anthropicApiKey: string | undefined,
  word: string,
  targetLangCode: string,
): Promise<WordDefinition | { error: string; lemma: string }> {
  const lemma = normalizeWord(word)
  if (!lemma) return { error: 'empty_word', lemma }

  // 1. Cache hit
  const cached = await db
    .prepare(
      `SELECT lemma, article, gloss, cefr_level, example_de, example_en, source
       FROM word_definitions WHERE lemma = ? AND target_lang_code = ?`,
    )
    .bind(lemma, targetLangCode)
    .first<Omit<WordDefinition, 'source'> & { source: string }>()

  if (cached) {
    return { ...cached, source: 'cache' }
  }

  // 2. vocab_items hit — join an example sentence if available
  // Language code mapping: frontend/study_list uses 'de', DB uses 'deu' (ISO 639-3)
  const langCodeDb = targetLangCode === 'de' ? 'deu' : targetLangCode
  const vocabRow = await db
    .prepare(
      `SELECT v.lemma, v.article, v.gloss_en as gloss, v.cefr_level,
              ex.sentence_de as example_de, ex.sentence_en as example_en
       FROM vocab_items v
       LEFT JOIN vocab_examples ex ON ex.vocab_item_id = v.id
       WHERE LOWER(v.lemma) = ? AND v.language = ?
       LIMIT 1`,
    )
    .bind(lemma, langCodeDb)
    .first<{
      lemma: string
      article: string | null
      gloss: string | null
      cefr_level: string | null
      example_de: string | null
      example_en: string | null
    }>()

  if (vocabRow && vocabRow.gloss) {
    const result: WordDefinition = {
      lemma: vocabRow.lemma,
      article: vocabRow.article,
      gloss: vocabRow.gloss,
      cefr_level: vocabRow.cefr_level,
      example_de: vocabRow.example_de,
      example_en: vocabRow.example_en,
      source: 'vocab_cards',
    }
    await cacheResult(db, lemma, targetLangCode, result)
    return result
  }

  // 3. Claude fallback
  if (!anthropicApiKey) return { error: 'no_api_key', lemma }
  try {
    const claudeResult = await askClaudeForDefinition(anthropicApiKey, lemma, targetLangCode)
    if (!claudeResult) return { error: 'lookup_failed', lemma }
    const result: WordDefinition = { ...claudeResult, source: 'claude' }
    await cacheResult(db, lemma, targetLangCode, result)
    return result
  } catch (err) {
    console.error('Claude word lookup failed:', err)
    return { error: 'lookup_failed', lemma }
  }
}

async function cacheResult(
  db: D1Database,
  lemma: string,
  langCode: string,
  def: WordDefinition,
): Promise<void> {
  const now = Math.floor(Date.now() / 1000)
  try {
    await db
      .prepare(
        `INSERT INTO word_definitions
           (lemma, target_lang_code, article, gloss, cefr_level, example_de, example_en, source, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (lemma, target_lang_code) DO UPDATE SET
           article = excluded.article,
           gloss = excluded.gloss,
           cefr_level = excluded.cefr_level,
           example_de = excluded.example_de,
           example_en = excluded.example_en,
           source = excluded.source`,
      )
      .bind(
        lemma,
        langCode,
        def.article,
        def.gloss,
        def.cefr_level,
        def.example_de,
        def.example_en,
        def.source === 'cache' ? 'claude' : def.source, // never store 'cache' as source
        now,
      )
      .run()
  } catch (err) {
    console.error('Failed to cache word definition:', err)
  }
}

async function askClaudeForDefinition(
  apiKey: string,
  lemma: string,
  targetLangCode: string,
): Promise<Omit<WordDefinition, 'source'> | null> {
  const languageName = targetLangCode === 'de' ? 'German' : targetLangCode

  const prompt = `You are a concise ${languageName} → English dictionary. The user is looking up a word in context of language learning.

Word: "${lemma}"

Return a JSON object with these exact fields (no other text, no markdown):
{
  "lemma": "<base form, lowercase for non-nouns, capitalized for German nouns>",
  "article": "<der|die|das if noun, or null>",
  "gloss": "<concise English translation, 1-5 words>",
  "cefr_level": "<A1|A2|B1|B2|C1|C2 or null if unknown>",
  "example_de": "<one short natural example sentence in ${languageName}>",
  "example_en": "<English translation of the example>"
}

If the word is not a real word or can't be identified, still return JSON with gloss set to "unknown word" and other fields null.`

  const anthropic = new Anthropic({ apiKey })
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)

  try {
    const response = await anthropic.messages.create(
      {
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      },
      { signal: controller.signal },
    )
    clearTimeout(timeout)

    const textBlock = response.content.find((b) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') return null

    const raw = textBlock.text.trim()
    // Strip markdown code fences if Claude added them
    const jsonStr = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim()

    const parsed = JSON.parse(jsonStr) as Omit<WordDefinition, 'source'>
    return {
      lemma: parsed.lemma || lemma,
      article: parsed.article ?? null,
      gloss: parsed.gloss || 'unknown word',
      cefr_level: parsed.cefr_level ?? null,
      example_de: parsed.example_de ?? null,
      example_en: parsed.example_en ?? null,
    }
  } catch (err) {
    clearTimeout(timeout)
    console.error('askClaudeForDefinition error:', err)
    return null
  }
}
