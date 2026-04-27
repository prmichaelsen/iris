# Custom Theme Editor — Design (Reference)

> **Source**: Copied from `memorycloud.chat` at `agent/design/local.custom-theme-editor.md` on 2026-04-27.
> This is a **reference document** for Iris — not yet adopted. Use as a template when specing Iris's own token/theming system (relevant to gamification theme-prize unlocks, spec R24 loot boxes).
> Firestore persistence details will need adapting to Iris's D1 backend; otherwise the token catalog and CSS-var approach transfers directly.
> Related source files on memorycloud.chat: `src/lib/theme-variables.ts`, `src/lib/theme-presets.ts`, `src/lib/theme-persistence.ts`, `src/lib/theme-yaml.ts`.

---

**Concept**: Full CSS variable editor at `/settings/theme` with live preview, presets, saved themes, and Firestore persistence
**Created**: 2026-03-16
**Status**: Design Specification

---

## ASCII Mockups

### /settings (updated Appearance section)

```
┌─────────────────────────────────────────────────┐
│ Settings                                        │
│                                                 │
│ 🔍 Search settings...                           │
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ Profile                                     │ │
│ │ Email: patrick@example.com                  │ │
│ │ Display Name: [Patrick            ]         │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ Appearance                                  │ │
│ │ Theme and display preferences               │ │
│ │                                             │ │
│ │  ┌──────────┐  ┌──────────┐                 │ │
│ │  │ 🌙 Dark  │  │ ☀️ Light │                 │ │
│ │  └──────────┘  └──────────┘                 │ │
│ │                                             │ │
│ │  Active: Midnight (custom)                  │ │
│ │  [Customize Theme →]                        │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ Notifications ...                           │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### /settings/theme (full page editor)

```
┌─────────────────────────────────────────────────────────────────────┐
│ ← Back to Settings              Theme Editor              [Save]   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Theme Name: [My Custom Theme     ]                                 │
│                                                                     │
│  ┌─ Presets ───────────────────────────────────────────────────┐    │
│  │ [Dark]  [Light]  [Midnight]  [Ocean]  [Sunset]  [+ New]    │    │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌─ Brand Colors ──────────────────────────────────── ▼ ──────┐    │
│  │                                                             │    │
│  │  Primary       [■ #7C3AED] [🎨]                             │    │
│  │  Secondary     [■ #2563EB] [🎨]                             │    │
│  │  Accent        [■ #06B6D4] [🎨]                             │    │
│  │  Success       [■ #22C55E] [🎨]                             │    │
│  │  Warning       [■ #F59E0B] [🎨]                             │    │
│  │  Danger        [■ #EF4444] [🎨]                             │    │
│  │  Info          [■ #3B82F6] [🎨]                             │    │
│  │                                                             │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  ┌─ Background Colors ─────────────────────────────── ▼ ──────┐    │
│  │                                                             │    │
│  │  Page          [■ #0F172A] [🎨]                             │    │
│  │  Card          [■ #1E293B] [🎨]                             │    │
│  │  Sidebar       [■ #0F172A] [🎨]                             │    │
│  │  Elevated      [■ #334155] [🎨]                             │    │
│  │  Hover         [■ #334155] [🎨]                             │    │
│  │  Active        [■ #475569] [🎨]                             │    │
│  │  Input         [■ #1E293B] [🎨]                             │    │
│  │                                                             │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  ┌─ Text Colors ───────────────────────────────────── ▼ ──────┐    │
│  │                                                             │    │
│  │  Primary       [■ #F8FAFC] [🎨]                             │    │
│  │  Secondary     [■ #94A3B8] [🎨]                             │    │
│  │  Muted         [■ #64748B] [🎨]                             │    │
│  │  Inverse       [■ #0F172A] [🎨]                             │    │
│  │                                                             │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  ┌─ Border Colors ─────────────────────────────────── ▼ ──────┐    │
│  │                                                             │    │
│  │  Default       [■ #334155] [🎨]                             │    │
│  │  Subtle        [■ #1E293B] [🎨]                             │    │
│  │  Strong        [■ #475569] [🎨]                             │    │
│  │                                                             │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  ┌─ Saved Themes ─────────────────────────────────────────────┐    │
│  │                                                             │    │
│  │  My Custom Theme        [Load] [Delete]                     │    │
│  │  Neon Purple            [Load] [Delete]                     │    │
│  │  Corporate Blue         [Load] [Delete]                     │    │
│  │                                                             │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Color Picker Popover (on 🎨 click)

```
                    ┌──────────────────────┐
                    │  ┌────────────────┐  │
                    │  │                │  │
                    │  │  Hue/Sat grid  │  │
                    │  │  (react-       │  │
                    │  │   colorful)    │  │
                    │  │                │  │
                    │  └────────────────┘  │
                    │  ┌────────────────┐  │
                    │  │  Hue slider    │  │
                    │  └────────────────┘  │
                    │                      │
                    │  ■ #7C3AED           │
                    │  [#7C3AED         ]  │
                    │                      │
                    └──────────────────────┘
```

### Live Preview (side panel on desktop, bottom sheet on mobile)

```
┌─ Theme Editor ──────────────┬─ Live Preview ────────────────────┐
│                              │                                   │
│  (variable editor from       │  ┌─ Header ────────────────────┐ │
│   above, scrollable)         │  │  Memory Cloud    🔔  👤     │ │
│                              │  ├─────────────────────────────┤ │
│                              │  │  💬 Chat                    │ │
│                              │  │  🧠 Memories                │ │
│                              │  ├─────────────────────────────┤ │
│                              │  │  You:                       │ │
│                              │  │  Hello, how are you?        │ │
│                              │  │                             │ │
│                              │  │  Agent:                     │ │
│                              │  │  I'm doing well! How can    │ │
│                              │  │  I help you today?          │ │
│                              │  │                             │ │
│                              │  │  [Type a message...]        │ │
│                              │  └─────────────────────────────┘ │
│                              │                                   │
│  [Save Theme]                │  Preview updates live as you      │
│  [Export YAML] [Import YAML] │  change colors above.             │
└──────────────────────────────┴───────────────────────────────────┘
```

### Export YAML (click "Export YAML")

Copies theme YAML to clipboard, shows toast "Theme copied to clipboard".

```
name: Neon Purple
base: dark
variables:
  brand-primary: "#818CF8"
  brand-accent: "#C084FC"
  bg-page: "#020617"
  bg-card: "#0F172A"
  bg-elevated: "#1E293B"
  text-primary: "#F0ABFC"
  border-default: "#4C1D95"
```

Only overridden variables are included (sparse). Recipients paste this into Import.

### Import YAML (click "Import YAML")

```
┌──────────────────────────────────────────────────┐
│  Import Theme                              [X]   │
│                                                  │
│  Paste theme YAML below:                         │
│  ┌──────────────────────────────────────────┐    │
│  │ name: Neon Purple                        │    │
│  │ base: dark                               │    │
│  │ variables:                               │    │
│  │   brand-primary: "#818CF8"               │    │
│  │   brand-accent: "#C084FC"                │    │
│  │   bg-page: "#020617"                     │    │
│  │   ...                                    │    │
│  │                                          │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│  ⚠ This will replace your current editor state.  │
│                                                  │
│          [Cancel]    [Import & Apply]             │
└──────────────────────────────────────────────────┘
```

On "Import & Apply": parse YAML, validate variable keys, apply to editor state + live preview. User can then [Save Theme] to persist.

---

## Implementation

### CSS Variable Map

All 24 variables exposed, grouped into 4 collapsible sections:

```typescript
const THEME_VARIABLES = {
  brand: [
    { key: '--color-brand-primary', label: 'Primary', default: { dark: '#7C3AED', light: '#7C3AED' } },
    { key: '--color-brand-secondary', label: 'Secondary', default: { dark: '#2563EB', light: '#2563EB' } },
    { key: '--color-brand-accent', label: 'Accent', default: { dark: '#06B6D4', light: '#06B6D4' } },
    { key: '--color-brand-success', label: 'Success', default: { dark: '#22C55E', light: '#22C55E' } },
    { key: '--color-brand-warning', label: 'Warning', default: { dark: '#F59E0B', light: '#F59E0B' } },
    { key: '--color-brand-danger', label: 'Danger', default: { dark: '#EF4444', light: '#EF4444' } },
    { key: '--color-brand-info', label: 'Info', default: { dark: '#3B82F6', light: '#3B82F6' } },
  ],
  backgrounds: [
    { key: '--color-bg-page', label: 'Page', default: { dark: '#0F172A', light: '#FFFFFF' } },
    { key: '--color-bg-card', label: 'Card', default: { dark: '#1E293B', light: '#FFFFFF' } },
    { key: '--color-bg-sidebar', label: 'Sidebar', default: { dark: '#0F172A', light: '#F8FAFC' } },
    { key: '--color-bg-elevated', label: 'Elevated', default: { dark: '#334155', light: '#F1F5F9' } },
    { key: '--color-bg-hover', label: 'Hover', default: { dark: '#334155', light: '#F1F5F9' } },
    { key: '--color-bg-active', label: 'Active', default: { dark: '#475569', light: '#E2E8F0' } },
    { key: '--color-bg-input', label: 'Input', default: { dark: '#1E293B', light: '#FFFFFF' } },
  ],
  text: [
    { key: '--color-text-primary', label: 'Primary', default: { dark: '#F8FAFC', light: '#0F172A' } },
    { key: '--color-text-secondary', label: 'Secondary', default: { dark: '#94A3B8', light: '#475569' } },
    { key: '--color-text-muted', label: 'Muted', default: { dark: '#64748B', light: '#94A3B8' } },
    { key: '--color-text-inverse', label: 'Inverse', default: { dark: '#0F172A', light: '#F8FAFC' } },
  ],
  borders: [
    { key: '--color-border-default', label: 'Default', default: { dark: '#334155', light: '#E2E8F0' } },
    { key: '--color-border-subtle', label: 'Subtle', default: { dark: '#1E293B', light: '#F1F5F9' } },
    { key: '--color-border-strong', label: 'Strong', default: { dark: '#475569', light: '#CBD5E1' } },
  ],
}
```

### Preset Themes

```typescript
const PRESET_THEMES: Record<string, Record<string, string>> = {
  dark: { /* default dark values */ },
  light: { /* default light values */ },
  midnight: {
    '--color-bg-page': '#020617',
    '--color-bg-card': '#0F172A',
    '--color-brand-primary': '#818CF8',
    // ... deeper, more saturated dark
  },
  ocean: {
    '--color-brand-primary': '#0EA5E9',
    '--color-brand-accent': '#06B6D4',
    '--color-bg-page': '#0C1222',
    // ... blue-tinted palette
  },
  sunset: {
    '--color-brand-primary': '#F97316',
    '--color-brand-accent': '#EAB308',
    '--color-bg-page': '#1C1213',
    // ... warm orange/amber tones
  },
}
```

### Theme Import/Export

**YAML format** (human-readable, easy to share in chat/forums/GitHub):

```yaml
name: Neon Purple
base: dark
variables:
  brand-primary: "#818CF8"
  brand-accent: "#C084FC"
  bg-page: "#020617"
```

- Variable keys use short names (`brand-primary`) not full CSS var names (`--color-brand-primary`)
- `base` is required — determines which defaults to use for unset variables
- `name` is required — used as the theme name when imported
- Only overridden variables are exported (sparse)

**Export**: Serialize current editor state to YAML string, copy to clipboard via `navigator.clipboard.writeText()`, show 1.5s toast.

**Import**: Modal with `<textarea>`, parse with `yaml` npm package (or lightweight parser), validate keys against `THEME_VARIABLES`, reject unknown keys with inline error, apply valid variables to editor state.

**Validation**:
- All variable keys must exist in `THEME_VARIABLES`
- All values must be valid hex colors (`#` + 3/6/8 hex chars)
- `base` must be `'dark'` or `'light'`
- `name` must be non-empty string

**File**: `src/lib/theme-yaml.ts` — `exportThemeYaml(theme)` and `parseThemeYaml(yaml)` functions

### Persistence

- **Firestore**: Extend `UserPreferences.display` with:
  ```typescript
  theme: {
    active_theme: string           // 'dark' | 'light' | 'midnight' | custom-uuid
    custom_themes: Record<string, {
      name: string
      base: 'dark' | 'light'       // which base to derive unset variables from
      variables: Record<string, string>  // only overridden variables
    }>
  }
  ```
- **Cookie**: `remember_theme_vars` — compact JSON of active theme's variable overrides, read during SSR to avoid flash
- **localStorage**: `remember_theme` — kept for backward compat, stores the base theme name

### SSR (No Flash)

1. Root `beforeLoad` reads `remember_theme_vars` cookie
2. If cookie has overrides, inject them as `style` attribute on `<html>`:
   ```html
   <html style="--color-brand-primary:#818CF8;--color-bg-page:#020617;...">
   ```
3. On client hydration, ThemingProvider reads the same cookie and applies
4. On theme save: write to Firestore + set cookie + update localStorage

### Color Picker

- **Library**: `react-colorful` (1.8 KB gzip)
- **Widget**: `HexColorPicker` + `HexColorInput` in a popover
- **Trigger**: Click the 🎨 icon next to any variable row
- **Live update**: On color change, immediately set the CSS variable on `document.documentElement.style`

### Files to Create

```
src/routes/settings/theme.tsx          — Full page theme editor
src/components/settings/
  ThemeVariableRow.tsx                 — Single variable row (swatch + hex + picker trigger)
  ThemeVariableGroup.tsx               — Collapsible group of variable rows
  ThemePresetBar.tsx                   — Preset theme selector bar
  ThemeSavedList.tsx                   — Saved custom themes list
  ThemeLivePreview.tsx                 — Preview panel with mock UI
  ColorPickerPopover.tsx               — react-colorful in a popover
  ThemeImportModal.tsx                 — Paste YAML textarea + validate + apply
src/lib/theme-persistence.ts           — Cookie/Firestore read/write helpers
src/lib/theme-yaml.ts                  — exportThemeYaml() / parseThemeYaml()
```

### Files to Modify

```
src/routes/settings/index.tsx          — Add "Customize Theme →" link to Appearance section
src/routes/__root.tsx                  — Read theme cookie in beforeLoad, inject CSS vars
src/lib/theming.tsx                    — Accept custom variable overrides in ThemingProvider
```

---

## Key Design Decisions

### Architecture

| Decision | Choice | Rationale |
|---|---|---|
| Color picker | react-colorful | 1.8 KB, modern hooks, hex input support |
| Variable storage | Sparse overrides only | Only store changed variables — unset ones inherit from base theme |
| SSR no-flash | Cookie with CSS vars | Avoids Firestore read on every page load |
| Cross-app sharing | Shared Firestore preferences doc | Both apps read same `UserPreferences.display.theme` |
| Live preview | Inline CSS variable updates on documentElement | Instant, no re-render needed for color changes |
| Theme sharing | YAML import/export via clipboard | Human-readable, easy to paste in chat/forums, no file upload needed |
| Export format | Sparse YAML (overrides only) | Keeps exports small, base theme handles defaults |

---

**Status**: Design Specification
**Related**: [clarification-3-custom-theme-editor.md](../clarifications/clarification-3-custom-theme-editor.md), [local.color-system.md](local.color-system.md)
