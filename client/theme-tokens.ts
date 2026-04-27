/**
 * Iris theme token catalog
 *
 * Synthesized from an audit of client/styles.css (2026-04-27). This file is
 * the canonical source of truth for semantic color tokens. It is NOT yet
 * consumed by any runtime code — the CSS still uses `--bg`, `--fg`, and
 * inline hex/rgba values directly.
 *
 * Purpose:
 *   - Document what colors the app actually uses, grouped by semantic role.
 *   - Reserve short-key names so future theme-swap logic (loot box theme
 *     prizes, custom themes) has stable identifiers to persist in cookies/D1.
 *   - Serve as a contract when we later refactor CSS to use `var(--color-*)`.
 *
 * Pattern modeled after memorycloud.chat's `src/lib/theme-variables.ts`.
 * Reference design: `agent/design/reference.custom-theme-editor.md`.
 *
 * Groups:
 *   - brand        — Iris brand identity (accent, error/status reds)
 *   - backgrounds  — page/surface/bubble backgrounds
 *   - text         — foreground text colors
 *   - borders      — divider/outline colors
 *   - status       — semantic state colors (correct, incorrect, warning)
 *   - widget       — widget-specific (word popover, CEFR pills)
 *   - cefr         — CEFR-level pill colors (A1–C2)
 */

export type ThemeGroup =
  | 'brand'
  | 'backgrounds'
  | 'text'
  | 'borders'
  | 'status'
  | 'widget'
  | 'cefr'

export interface ThemeToken {
  /** Full CSS custom property name: --color-bg-page */
  key: string
  /** Short key for storage/cookies: bg-page */
  shortKey: string
  /** Human-readable label for editor UI */
  label: string
  group: ThemeGroup
  /** Default values for dark/light modes */
  default: { dark: string; light: string }
  /** Where this color currently appears in styles.css (for audit traceability) */
  usedFor?: string
}

export const THEME_TOKENS: ThemeToken[] = [
  // ---------------------------------------------------------------------
  // BRAND
  // ---------------------------------------------------------------------
  {
    key: '--color-brand-accent',
    shortKey: 'brand-accent',
    label: 'Accent',
    group: 'brand',
    default: { dark: '#c75d3a', light: '#c75d3a' },
    usedFor: 'Iris signature — mic ring, focus outlines, lang-picker border',
  },
  {
    key: '--color-brand-accent-alt',
    shortKey: 'brand-accent-alt',
    label: 'Accent Alternate',
    group: 'brand',
    default: { dark: '#b94a3a', light: '#b94a3a' },
    usedFor: 'Mic pressed state, error surfaces, widget-incorrect mark',
  },

  // ---------------------------------------------------------------------
  // BACKGROUNDS
  // ---------------------------------------------------------------------
  {
    key: '--color-bg-page',
    shortKey: 'bg-page',
    label: 'Page',
    group: 'backgrounds',
    default: { dark: '#1a1816', light: '#fafaf7' },
    usedFor: 'body background; was --bg',
  },
  {
    key: '--color-bg-user-bubble',
    shortKey: 'bg-user-bubble',
    label: 'User Message Bubble',
    group: 'backgrounds',
    default: { dark: '#2a2622', light: '#efebe3' },
    usedFor: 'chat turn (user); was --user-bg',
  },
  {
    key: '--color-bg-assistant-bubble',
    shortKey: 'bg-assistant-bubble',
    label: 'Assistant Message Bubble',
    group: 'backgrounds',
    default: { dark: '#221f1c', light: '#f7f3ea' },
    usedFor: 'chat turn (assistant); was --assistant-bg',
  },
  {
    key: '--color-bg-elevated',
    shortKey: 'bg-elevated',
    label: 'Elevated Surface',
    group: 'backgrounds',
    default: { dark: '#2b2824', light: '#ffffff' },
    usedFor: 'popovers, cards, input fields',
  },
  {
    key: '--color-bg-input',
    shortKey: 'bg-input',
    label: 'Input Field',
    group: 'backgrounds',
    default: { dark: '#221f1c', light: '#ffffff' },
    usedFor: 'auth form inputs, lang picker input',
  },
  {
    key: '--color-bg-hover',
    shortKey: 'bg-hover',
    label: 'Hover Surface',
    group: 'backgrounds',
    default: { dark: 'rgba(255, 255, 255, 0.06)', light: 'rgba(0, 0, 0, 0.04)' },
    usedFor: 'button/item hover states',
  },
  {
    key: '--color-bg-active',
    shortKey: 'bg-active',
    label: 'Active Surface',
    group: 'backgrounds',
    default: { dark: 'rgba(255, 255, 255, 0.10)', light: 'rgba(0, 0, 0, 0.08)' },
    usedFor: 'button/item active states',
  },

  // ---------------------------------------------------------------------
  // TEXT
  // ---------------------------------------------------------------------
  {
    key: '--color-text-primary',
    shortKey: 'text-primary',
    label: 'Primary Text',
    group: 'text',
    default: { dark: '#f0ebe1', light: '#1a1a1a' },
    usedFor: 'main body text; was --fg',
  },
  {
    key: '--color-text-secondary',
    shortKey: 'text-secondary',
    label: 'Secondary Text',
    group: 'text',
    default: { dark: '#d7d0c5', light: '#374151' },
    usedFor: 'popover gloss text, subheaders',
  },
  {
    key: '--color-text-muted',
    shortKey: 'text-muted',
    label: 'Muted Text',
    group: 'text',
    default: { dark: '#a8a099', light: '#666' },
    usedFor: 'hints, timestamps, example-en; was --muted',
  },
  {
    key: '--color-text-inverse',
    shortKey: 'text-inverse',
    label: 'Inverse Text',
    group: 'text',
    default: { dark: '#1a1816', light: '#fafaf7' },
    usedFor: 'text on accent/error backgrounds (was hardcoded "white")',
  },

  // ---------------------------------------------------------------------
  // BORDERS
  // ---------------------------------------------------------------------
  {
    key: '--color-border-default',
    shortKey: 'border-default',
    label: 'Default Border',
    group: 'borders',
    default: { dark: '#3a352f', light: '#e5e0d4' },
    usedFor: 'bubbles, buttons, inputs; was --border',
  },
  {
    key: '--color-border-subtle',
    shortKey: 'border-subtle',
    label: 'Subtle Border',
    group: 'borders',
    default: { dark: 'rgba(255, 255, 255, 0.08)', light: 'rgba(0, 0, 0, 0.06)' },
    usedFor: 'popover dividers, section separators',
  },
  {
    key: '--color-border-strong',
    shortKey: 'border-strong',
    label: 'Strong Border',
    group: 'borders',
    default: { dark: 'rgba(255, 255, 255, 0.20)', light: 'rgba(0, 0, 0, 0.15)' },
    usedFor: 'focus rings, emphasized outlines',
  },

  // ---------------------------------------------------------------------
  // STATUS
  // ---------------------------------------------------------------------
  {
    key: '--color-status-success-bg',
    shortKey: 'status-success-bg',
    label: 'Success Background',
    group: 'status',
    default: { dark: 'rgba(34, 139, 34, 0.15)', light: 'rgba(34, 139, 34, 0.08)' },
    usedFor: 'fc-correct, widget-correct highlight',
  },
  {
    key: '--color-status-success-fg',
    shortKey: 'status-success-fg',
    label: 'Success Text',
    group: 'status',
    default: { dark: '#4ade80', light: '#166534' },
    usedFor: 'correct-answer labels',
  },
  {
    key: '--color-status-error-bg',
    shortKey: 'status-error-bg',
    label: 'Error Background',
    group: 'status',
    default: { dark: 'rgba(185, 74, 58, 0.15)', light: 'rgba(185, 74, 58, 0.08)' },
    usedFor: 'fc-incorrect, widget error flash',
  },
  {
    key: '--color-status-error-fg',
    shortKey: 'status-error-fg',
    label: 'Error Text',
    group: 'status',
    default: { dark: '#fca5a5', light: '#b94a3a' },
    usedFor: '.error-text, auth error messages',
  },
  {
    key: '--color-status-error-surface',
    shortKey: 'status-error-surface',
    label: 'Error Surface (solid)',
    group: 'status',
    default: { dark: '#b94a3a', light: '#b94a3a' },
    usedFor: '.error div, .auth-error div (solid red banners)',
  },
  {
    key: '--color-status-warning',
    shortKey: 'status-warning',
    label: 'Warning',
    group: 'status',
    default: { dark: '#fbbf24', light: '#d97706' },
    usedFor: 'timer near-timeout, reminder badges',
  },

  // ---------------------------------------------------------------------
  // WIDGET — Word hover popover + misc widget chrome
  // ---------------------------------------------------------------------
  {
    key: '--color-widget-popover-bg',
    shortKey: 'widget-popover-bg',
    label: 'Popover Background',
    group: 'widget',
    default: { dark: '#2b2824', light: '#ffffff' },
    usedFor: 'word hover popover, future floating menus',
  },
  {
    key: '--color-widget-popover-fg',
    shortKey: 'widget-popover-fg',
    label: 'Popover Text',
    group: 'widget',
    default: { dark: '#f0ebe1', light: '#111' },
    usedFor: 'popover lemma and body text',
  },
  {
    key: '--color-widget-popover-shadow',
    shortKey: 'widget-popover-shadow',
    label: 'Popover Shadow',
    group: 'widget',
    default: { dark: '0 4px 18px rgba(0, 0, 0, 0.5)', light: '0 4px 18px rgba(0, 0, 0, 0.18)' },
    usedFor: 'popover drop shadow (full shadow string)',
  },
  {
    key: '--color-widget-token-hover-bg',
    shortKey: 'widget-token-hover-bg',
    label: 'Word Token Hover',
    group: 'widget',
    default: { dark: 'rgba(96, 165, 250, 0.15)', light: 'rgba(59, 130, 246, 0.08)' },
    usedFor: 'assistant-message word hover highlight',
  },
  {
    key: '--color-widget-ring-pulse',
    shortKey: 'widget-ring-pulse',
    label: 'Mic Pulse Ring',
    group: 'widget',
    default: { dark: 'rgba(185, 74, 58, 0.5)', light: 'rgba(185, 74, 58, 0.5)' },
    usedFor: 'mic-listening animation pulse',
  },

  // ---------------------------------------------------------------------
  // CEFR PILLS — one token per level, separate bg/fg
  // ---------------------------------------------------------------------
  {
    key: '--color-cefr-a1-bg',
    shortKey: 'cefr-a1-bg',
    label: 'A1 Background',
    group: 'cefr',
    default: { dark: 'rgba(34, 197, 94, 0.18)', light: 'rgba(34, 197, 94, 0.15)' },
  },
  {
    key: '--color-cefr-a1-fg',
    shortKey: 'cefr-a1-fg',
    label: 'A1 Text',
    group: 'cefr',
    default: { dark: '#4ade80', light: '#166534' },
  },
  {
    key: '--color-cefr-a2-bg',
    shortKey: 'cefr-a2-bg',
    label: 'A2 Background',
    group: 'cefr',
    default: { dark: 'rgba(34, 197, 94, 0.25)', light: 'rgba(34, 197, 94, 0.22)' },
  },
  {
    key: '--color-cefr-a2-fg',
    shortKey: 'cefr-a2-fg',
    label: 'A2 Text',
    group: 'cefr',
    default: { dark: '#4ade80', light: '#14532d' },
  },
  {
    key: '--color-cefr-b1-bg',
    shortKey: 'cefr-b1-bg',
    label: 'B1 Background',
    group: 'cefr',
    default: { dark: 'rgba(59, 130, 246, 0.18)', light: 'rgba(59, 130, 246, 0.15)' },
  },
  {
    key: '--color-cefr-b1-fg',
    shortKey: 'cefr-b1-fg',
    label: 'B1 Text',
    group: 'cefr',
    default: { dark: '#60a5fa', light: '#1e40af' },
  },
  {
    key: '--color-cefr-b2-bg',
    shortKey: 'cefr-b2-bg',
    label: 'B2 Background',
    group: 'cefr',
    default: { dark: 'rgba(59, 130, 246, 0.25)', light: 'rgba(59, 130, 246, 0.22)' },
  },
  {
    key: '--color-cefr-b2-fg',
    shortKey: 'cefr-b2-fg',
    label: 'B2 Text',
    group: 'cefr',
    default: { dark: '#60a5fa', light: '#1e3a8a' },
  },
  {
    key: '--color-cefr-c1-bg',
    shortKey: 'cefr-c1-bg',
    label: 'C1 Background',
    group: 'cefr',
    default: { dark: 'rgba(168, 85, 247, 0.20)', light: 'rgba(147, 51, 234, 0.15)' },
  },
  {
    key: '--color-cefr-c1-fg',
    shortKey: 'cefr-c1-fg',
    label: 'C1 Text',
    group: 'cefr',
    default: { dark: '#c084fc', light: '#6b21a8' },
  },
  {
    key: '--color-cefr-c2-bg',
    shortKey: 'cefr-c2-bg',
    label: 'C2 Background',
    group: 'cefr',
    default: { dark: 'rgba(168, 85, 247, 0.28)', light: 'rgba(147, 51, 234, 0.22)' },
  },
  {
    key: '--color-cefr-c2-fg',
    shortKey: 'cefr-c2-fg',
    label: 'C2 Text',
    group: 'cefr',
    default: { dark: '#c084fc', light: '#581c87' },
  },
]

export const THEME_GROUPS: Record<ThemeGroup, { label: string; description: string }> = {
  brand: {
    label: 'Brand',
    description: 'Iris identity colors — accent, signature',
  },
  backgrounds: {
    label: 'Backgrounds',
    description: 'Page, surface, bubble, and container backgrounds',
  },
  text: {
    label: 'Text',
    description: 'Foreground text colors',
  },
  borders: {
    label: 'Borders',
    description: 'Dividers, outlines, focus rings',
  },
  status: {
    label: 'Status',
    description: 'Success, error, warning states (widget answers, errors)',
  },
  widget: {
    label: 'Widgets',
    description: 'Word popover, mic ring, widget chrome',
  },
  cefr: {
    label: 'CEFR Levels',
    description: 'A1–C2 level pill colors (green/blue/purple spectrum)',
  },
}

/** Convert a CSS var name back to its short key. */
export function cssVarToShortKey(cssVar: string): string {
  return cssVar.replace(/^--color-/, '')
}

/** Convert a short key to its full CSS var name. */
export function shortKeyToCssVar(shortKey: string): string {
  return `--color-${shortKey}`
}

/** Get all tokens in a specific group. */
export function getTokensByGroup(group: ThemeGroup): ThemeToken[] {
  return THEME_TOKENS.filter((t) => t.group === group)
}

/**
 * Legacy aliases — mapping from the current ad-hoc CSS var names to the new
 * canonical tokens. When we migrate styles.css in a future pass, these
 * aliases can live in :root for backward compatibility, then be removed
 * after all references are updated.
 */
export const LEGACY_ALIASES: Record<string, string> = {
  '--bg': '--color-bg-page',
  '--fg': '--color-text-primary',
  '--muted': '--color-text-muted',
  '--accent': '--color-brand-accent',
  '--user-bg': '--color-bg-user-bubble',
  '--assistant-bg': '--color-bg-assistant-bubble',
  '--border': '--color-border-default',
  // Popover-specific vars added during M7 word hover work
  '--popover-bg': '--color-widget-popover-bg',
  '--popover-fg': '--color-widget-popover-fg',
  '--popover-muted': '--color-text-muted',
  '--popover-border': '--color-border-subtle',
  '--popover-divider': '--color-border-subtle',
  '--popover-gloss': '--color-text-secondary',
  '--popover-example-de': '--color-text-primary',
  '--popover-shadow': '--color-widget-popover-shadow',
  '--token-underline': '--color-border-subtle', // deprecated (underline removed)
  '--token-hover-bg': '--color-widget-token-hover-bg',
  '--token-hover-underline': '--color-border-strong', // deprecated
  '--cefr-default-bg': '--color-bg-hover',
  '--cefr-default-fg': '--color-text-secondary',
}
