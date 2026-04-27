// Widget type definitions — shared between worker and client.
// Phase 1: only FlashcardMatching is fully fleshed out.
// All 11 types are defined so the discriminated union is stable.

// ---- Base ----

export interface WidgetBase {
  widget_id: string
}

// ---- Flashcard Matching (Phase 1 MVP) ----

export interface FlashcardMatchingCard {
  card_id: string
  word: string       // e.g. "die Abfahrt"
  options: string[]  // 4 options, shuffled; correct answer included
}

export interface FlashcardMatchingWidget extends WidgetBase {
  type: 'flashcard-matching'
  cards: FlashcardMatchingCard[]
  cefr_level: string
}

export interface FlashcardMatchingAnswer {
  card_id: string
  selected_index: number
}

export interface FlashcardMatchingResponse {
  type: 'widget_response'
  widget_id: string
  answers: FlashcardMatchingAnswer[]
}

export interface FlashcardMatchingCardResult {
  card_id: string
  word: string
  correct_answer: string
  correct_index: number
  selected_index: number
  correct: boolean
}

export interface FlashcardMatchingResult {
  type: 'widget_result'
  widget_id: string
  widget_type: 'flashcard-matching'
  score: number
  total: number
  cards: FlashcardMatchingCardResult[]
}

// ---- Flashcard Freeform ----

export interface FlashcardFreeformWidget extends WidgetBase {
  type: 'flashcard-freeform'
  word: string
  audio?: boolean
  cefr_level: string
}

export interface FlashcardFreeformResponse {
  type: 'widget_response'
  widget_id: string
  answer: string
}

export interface FlashcardFreeformResult {
  type: 'widget_result'
  widget_id: string
  widget_type: 'flashcard-freeform'
  word: string
  correct_answer: string
  user_answer: string
  correct: boolean
  grading_method: 'exact' | 'fuzzy' | 'claude'
  claude_explanation?: string
}

// ---- Dictation (future) ----

export interface DictationWidget extends WidgetBase {
  type: 'dictation'
  audio: true
  cefr_level: string
}

// ---- Comprehension (future) ----

export interface ComprehensionWidget extends WidgetBase {
  type: 'comprehension'
  audio: true
  cefr_level: string
}

// ---- Fill-in-the-Blank ----

export interface FillBlankCard {
  card_id: string
  sentence: string       // "Ich gehe ___ die Schule." (with ___ for blank)
  hint?: string         // "dative preposition" or "past participle"
  vocab_id: string      // for SM-2 lookup (lemma)
}

export interface FillBlankWidget extends WidgetBase {
  type: 'fill-blank'
  cards: FillBlankCard[]
  cefr_level: string
}

export interface FillBlankAnswer {
  card_id: string
  typed_answer: string  // user's typed string (may be empty)
}

export interface FillBlankResponse {
  type: 'widget_response'
  widget_id: string
  answers: FillBlankAnswer[]
}

export interface FillBlankCardResult {
  card_id: string
  sentence: string
  expected: string      // revealed after grading
  typed_answer: string
  correct: boolean
  hint?: string
}

export interface FillBlankResult {
  type: 'widget_result'
  widget_id: string
  widget_type: 'fill-blank'
  score: number
  total: number
  cards: FillBlankCardResult[]
}

// ---- Gender Pick (future) ----

export interface GenderPickCard {
  card_id: string
  noun: string
}

export interface GenderPickWidget extends WidgetBase {
  type: 'gender-pick'
  cards: GenderPickCard[]
  cefr_level: string
}

export interface GenderPickAnswer {
  card_id: string
  selected_article: 'der' | 'die' | 'das'
}

export interface GenderPickResponse {
  type: 'widget_response'
  widget_id: string
  answers: GenderPickAnswer[]
}

export interface GenderPickCardResult {
  card_id: string
  noun: string
  correct_article: 'der' | 'die' | 'das'
  selected_article: 'der' | 'die' | 'das'
  correct: boolean
}

export interface GenderPickResult {
  type: 'widget_result'
  widget_id: string
  widget_type: 'gender-pick'
  score: number
  total: number
  cards: GenderPickCardResult[]
}

// ---- Article in Context (future) ----

export interface ArticleInContextWidget extends WidgetBase {
  type: 'article-in-context'
  sentence: string
  hint?: string
  options?: string[]
  cefr_level: string
}

// ---- Pluralization (future) ----

export interface PluralizationWidget extends WidgetBase {
  type: 'pluralization'
  noun: string
  hint?: string
  cefr_level: string
}

// ---- Conjugation (future) ----

export interface ConjugationWidget extends WidgetBase {
  type: 'conjugation'
  verb: string
  subject: string
  tense: string
  context_sentence?: string
  cefr_level: string
}

// ---- Definition (Phase 2) ----

export interface DefinitionCard {
  card_id: string
  word: string          // "die Abfahrt"
  audio_url?: string    // present if speak=true and TTS succeeded
}

export interface DefinitionWidget extends WidgetBase {
  type: 'definition'
  cards: DefinitionCard[]
  cefr_level: string
  speak: boolean        // true = audio mode, false = text mode
}

export interface DefinitionAnswer {
  card_id: string
  answer: string        // user's freeform text: "departure"
}

export interface DefinitionResponse {
  type: 'widget_response'
  widget_id: string
  answers: DefinitionAnswer[]
}

export interface DefinitionCardResult {
  card_id: string
  word: string
  user_answer: string
  expected_meaning: string   // revealed after grading (gloss_en)
  correct: boolean
  feedback: string           // Claude's 1-sentence feedback
}

export interface DefinitionResult {
  type: 'widget_result'
  widget_id: string
  widget_type: 'definition'
  score: number
  total: number
  cards: DefinitionCardResult[]
}

// ---- Sentence Order (future) ----

export interface SentenceOrderWidget extends WidgetBase {
  type: 'sentence-order'
  words: string[]
  cefr_level: string
}

// ---- Discriminated Union ----

export type Widget =
  | FlashcardMatchingWidget
  | FlashcardFreeformWidget
  | DictationWidget
  | ComprehensionWidget
  | FillBlankWidget
  | GenderPickWidget
  | ArticleInContextWidget
  | PluralizationWidget
  | ConjugationWidget
  | DefinitionWidget
  | SentenceOrderWidget

// ---- Widget Result (generic envelope — extend per type) ----

export type WidgetResult = FlashcardMatchingResult | FlashcardFreeformResult | GenderPickResult | DefinitionResult | FillBlankResult
// Future: | DictationResult | ...

// ---- Cancel ----

export interface WidgetCancel {
  type: 'widget_cancel'
  widget_id: string
  reason: string
}

// ---- Persistence (stored in D1 messages.content as ContentBlock) ----

export interface WidgetContentBlock {
  type: 'widget'
  widget_type: Widget['type']
  widget_id: string
  payload: Widget
  response?: FlashcardMatchingResponse | FlashcardFreeformResponse | GenderPickResponse | DefinitionResponse | FillBlankResponse | null
  result?: WidgetResult | null
  status: 'active' | 'completed' | 'timed_out' | 'cancelled'
}

export interface TextContentBlock {
  type: 'text'
  text: string
}

export type ContentBlock = TextContentBlock | WidgetContentBlock

// ---- WS Protocol ----

export interface WidgetMessage {
  type: 'widget'
  widget: Widget
}

export interface WidgetResultMessage {
  type: 'widget_result'
  widget_id: string
  widget_type: Widget['type']
  score: number
  total: number
  cards: FlashcardMatchingCardResult[] | GenderPickCardResult[] | DefinitionCardResult[] | FillBlankCardResult[]
}

export interface WidgetCancelMessage {
  type: 'widget_cancel'
  widget_id: string
  reason: string
}

export interface WidgetResponseMessage {
  type: 'widget_response'
  widget_id: string
  answers: FlashcardMatchingAnswer[] | GenderPickAnswer[] | DefinitionAnswer[] | FillBlankAnswer[]
}

// ---- Retake ----

export interface WidgetRetakeMessage {
  type: 'widget_retake'
  widget_id: string
}
