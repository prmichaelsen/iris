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

// ---- Flashcard Freeform (future) ----

export interface FlashcardFreeformWidget extends WidgetBase {
  type: 'flashcard-freeform'
  word: string
  audio?: boolean
  cefr_level: string
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

// ---- Fill-in-the-Blank (future) ----

export interface FillBlankWidget extends WidgetBase {
  type: 'fill-blank'
  sentence: string
  hint?: string
  cefr_level: string
}

// ---- Gender Pick (future) ----

export interface GenderPickWidget extends WidgetBase {
  type: 'gender-pick'
  noun: string
  cefr_level: string
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

// ---- Definition (future) ----

export interface DefinitionWidget extends WidgetBase {
  type: 'definition'
  word: string
  audio?: boolean
  cefr_level: string
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

export type WidgetResult = FlashcardMatchingResult
// Future: | FlashcardFreeformResult | DictationResult | ...

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
  response?: FlashcardMatchingResponse | null
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
  cards: FlashcardMatchingCardResult[]
}

export interface WidgetCancelMessage {
  type: 'widget_cancel'
  widget_id: string
  reason: string
}

export interface WidgetResponseMessage {
  type: 'widget_response'
  widget_id: string
  answers: FlashcardMatchingAnswer[]
}

// ---- Retake ----

export interface WidgetRetakeMessage {
  type: 'widget_retake'
  widget_id: string
}
