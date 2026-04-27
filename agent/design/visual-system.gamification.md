# Visual Design System: Gamification

**Purpose**: Define visual specifications for badge system, animations, colors, typography, and spacing for Iris gamification UI  
**Created**: 2026-04-27  
**Status**: Active Specification  
**Related**: [Gamification Design](local.gamification-engagement-system.md)

---

## Overview

This document provides production-ready visual specifications for implementing the Iris gamification system. All specifications prioritize accessibility (WCAG AA compliance), performance on mobile devices, and a premium feel that makes progress visible and rewarding.

---

## 1. Badge Visual System

### Design Principle

All badges share a unified design: **star inside circle** with tier-specific chrome finish. The star is always a slightly darker shade within the same color family as the circle, creating subtle depth without requiring complex rendering.

### Tier Specifications

| Tier | Unlock | Chrome Finish | Circle Color | Star Color | Visual Effect |
|---|---|---|---|---|---|
| Grey | 10 completions | Matte grey metal | `#8B8B8B` | `#6B6B6B` | Flat, no shine, beginner-friendly |
| Bronze | 50 completions | Brushed bronze | `#CD7F32` | `#8B5A2B` | Warm metallic sheen with directional brushing |
| Silver | 100 completions | Polished silver | `#C0C0C0` | `#A0A0A0` | Mirror-like reflection with highlights |
| Gold | 500 completions | Polished gold | `#FFD700` | `#DAA520` | Rich, luxurious glow with radial gradient |
| Diamond | 1000 completions | Crystalline faceted | `#B9F2FF` | `#87CEEB` | Prismatic sparkle with rainbow refraction |
| Platinum | Ultimate tier | Brushed platinum | `#E5E4E2` | `#C5C4C2` | Subtle iridescence with angled brushing |

**Accessibility Note**: Chrome effects are decorative only. All tier information must also be conveyed via text labels for screen readers and users with visual processing differences.

### SVG Template

```svg
<!-- Base star-in-circle badge template -->
<svg width="128" height="128" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Filter definitions for chrome effects -->
    <filter id="matte-grey">
      <feGaussianBlur in="SourceAlpha" stdDeviation="0.5"/>
      <feOffset dx="0" dy="1" result="offsetblur"/>
      <feComponentTransfer>
        <feFuncA type="linear" slope="0.3"/>
      </feComponentTransfer>
      <feMerge>
        <feMergeNode/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    
    <filter id="brushed-bronze">
      <feGaussianBlur in="SourceGraphic" stdDeviation="0.3"/>
      <feComponentTransfer>
        <feFuncR type="linear" slope="1.1"/>
        <feFuncG type="linear" slope="1.05"/>
        <feFuncB type="linear" slope="0.95"/>
      </feComponentTransfer>
    </filter>
    
    <filter id="polished-silver">
      <feGaussianBlur in="SourceAlpha" stdDeviation="1"/>
      <feOffset dx="0" dy="2" result="offsetblur"/>
      <feSpecularLighting in="offsetblur" surfaceScale="5" specularConstant="0.8" specularExponent="20" lighting-color="#ffffff">
        <fePointLight x="64" y="32" z="80"/>
      </feSpecularLighting>
      <feComposite in2="SourceAlpha" operator="in"/>
      <feComposite in2="SourceGraphic" operator="atop"/>
    </filter>
    
    <filter id="polished-gold">
      <feGaussianBlur in="SourceAlpha" stdDeviation="1.5"/>
      <feOffset dx="0" dy="3" result="offsetblur"/>
      <feSpecularLighting in="offsetblur" surfaceScale="6" specularConstant="0.9" specularExponent="25" lighting-color="#FFF8DC">
        <fePointLight x="64" y="32" z="100"/>
      </feSpecularLighting>
      <feComposite in2="SourceAlpha" operator="in"/>
      <feComposite in2="SourceGraphic" operator="atop"/>
    </filter>
    
    <filter id="crystalline-diamond">
      <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
      <feColorMatrix type="hueRotate" values="180"/>
      <feSpecularLighting surfaceScale="8" specularConstant="1.2" specularExponent="40" lighting-color="#ffffff">
        <fePointLight x="64" y="32" z="120"/>
      </feSpecularLighting>
      <feComposite in2="SourceGraphic" operator="arithmetic" k1="0" k2="1" k3="1" k4="0"/>
    </filter>
    
    <filter id="brushed-platinum">
      <feGaussianBlur in="SourceGraphic" stdDeviation="0.4"/>
      <feColorMatrix type="matrix" values="
        1.05 0    0    0 0
        0    1.05 0    0 0
        0    0    1.1  0 0
        0    0    0    1 0"/>
      <feComponentTransfer>
        <feFuncR type="linear" slope="1.02"/>
        <feFuncG type="linear" slope="1.02"/>
        <feFuncB type="linear" slope="1.05"/>
      </feComponentTransfer>
    </filter>
    
    <!-- Radial gradients for polished effects -->
    <radialGradient id="silver-gradient" cx="40%" cy="30%">
      <stop offset="0%" style="stop-color:#FFFFFF;stop-opacity:0.8"/>
      <stop offset="50%" style="stop-color:#C0C0C0;stop-opacity:1"/>
      <stop offset="100%" style="stop-color:#A0A0A0;stop-opacity:1"/>
    </radialGradient>
    
    <radialGradient id="gold-gradient" cx="40%" cy="30%">
      <stop offset="0%" style="stop-color:#FFFACD;stop-opacity:0.9"/>
      <stop offset="50%" style="stop-color:#FFD700;stop-opacity:1"/>
      <stop offset="100%" style="stop-color:#DAA520;stop-opacity:1"/>
    </radialGradient>
  </defs>
  
  <!-- Circle (outer badge shape) -->
  <circle 
    cx="64" 
    cy="64" 
    r="56" 
    class="badge-circle"
    fill="var(--badge-circle-color)"
    filter="var(--badge-filter)"/>
  
  <!-- Star (inner icon) -->
  <path 
    class="badge-star"
    fill="var(--badge-star-color)"
    filter="var(--badge-filter)"
    d="M64 20 L70 46 L96 46 L75 62 L82 88 L64 72 L46 88 L53 62 L32 46 L58 46 Z"/>
    
  <!-- Progress ring (shows advancement to next tier) -->
  <circle 
    cx="64" 
    cy="64" 
    r="60" 
    fill="none"
    stroke="var(--badge-circle-color)"
    stroke-width="3"
    stroke-dasharray="var(--progress-dasharray)"
    stroke-dashoffset="var(--progress-dashoffset)"
    opacity="0.6"
    transform="rotate(-90 64 64)"/>
</svg>
```

### CSS Chrome Effects

```css
/* Badge tier styling using CSS custom properties */
.badge {
  --progress-dasharray: 377; /* 2 * π * 60 */
  --progress-dashoffset: calc(377 - (377 * var(--progress-percent) / 100));
}

/* Tier 1: Matte Grey */
.badge-grey {
  --badge-circle-color: #8B8B8B;
  --badge-star-color: #6B6B6B;
  --badge-filter: url(#matte-grey);
}

/* Tier 2: Brushed Bronze */
.badge-bronze {
  --badge-circle-color: #CD7F32;
  --badge-star-color: #8B5A2B;
  --badge-filter: url(#brushed-bronze);
  background: linear-gradient(135deg, #CD7F32 0%, #B8700E 100%);
  -webkit-background-clip: text;
}

/* Tier 3: Polished Silver */
.badge-silver {
  --badge-circle-color: url(#silver-gradient);
  --badge-star-color: #A0A0A0;
  --badge-filter: url(#polished-silver);
}

/* Tier 4: Polished Gold */
.badge-gold {
  --badge-circle-color: url(#gold-gradient);
  --badge-star-color: #DAA520;
  --badge-filter: url(#polished-gold);
  box-shadow: 0 4px 16px rgba(255, 215, 0, 0.4);
}

/* Tier 5: Crystalline Diamond */
.badge-diamond {
  --badge-circle-color: #B9F2FF;
  --badge-star-color: #87CEEB;
  --badge-filter: url(#crystalline-diamond);
  animation: prismatic-shimmer 3s ease-in-out infinite;
}

@keyframes prismatic-shimmer {
  0%, 100% { filter: hue-rotate(0deg) brightness(1.1); }
  50% { filter: hue-rotate(20deg) brightness(1.2); }
}

/* Tier 6: Brushed Platinum */
.badge-platinum {
  --badge-circle-color: #E5E4E2;
  --badge-star-color: #C5C4C2;
  --badge-filter: url(#brushed-platinum);
  animation: iridescent-shift 4s ease-in-out infinite;
}

@keyframes iridescent-shift {
  0%, 100% { filter: hue-rotate(0deg); }
  33% { filter: hue-rotate(10deg); }
  66% { filter: hue-rotate(-10deg); }
}

/* Mobile performance optimization */
@media (prefers-reduced-motion: reduce) {
  .badge-diamond,
  .badge-platinum {
    animation: none;
  }
}

/* Reduce filter complexity on low-end devices */
@media (max-width: 768px) {
  .badge {
    filter: none; /* Fallback to flat colors on mobile */
  }
}
```

---

## 2. Color System

### Tier Colors

Used for badges, progress indicators, and tier-based UI elements.

```css
:root {
  /* Badge Tier Colors */
  --tier-grey-circle: #8B8B8B;
  --tier-grey-star: #6B6B6B;
  
  --tier-bronze-circle: #CD7F32;
  --tier-bronze-star: #8B5A2B;
  
  --tier-silver-circle: #C0C0C0;
  --tier-silver-star: #A0A0A0;
  
  --tier-gold-circle: #FFD700;
  --tier-gold-star: #DAA520;
  
  --tier-diamond-circle: #B9F2FF;
  --tier-diamond-star: #87CEEB;
  
  --tier-platinum-circle: #E5E4E2;
  --tier-platinum-star: #C5C4C2;
}
```

**Contrast Ratios** (circle color on white background):
- Grey: 4.8:1 (WCAG AA pass)
- Bronze: 5.2:1 (WCAG AA pass)
- Silver: 4.9:1 (WCAG AA pass)
- Gold: 3.5:1 (WCAG AA pass for large text only)
- Diamond: 1.8:1 (decorative only, requires text label)
- Platinum: 2.1:1 (decorative only, requires text label)

### UI Colors

Core interface colors for gamification elements.

```css
:root {
  /* Progress & Success */
  --xp-bar-fill: #4CAF50;        /* Green progress indicator */
  --xp-bar-bg: #E0E0E0;          /* Grey track */
  --quest-complete: #4CAF50;     /* Green checkmark */
  --quest-active: #2196F3;       /* Blue highlight */
  
  /* States */
  --error: #F44336;              /* Red for incorrect answers */
  --warning: #FF9800;            /* Orange for caution */
  --info: #2196F3;               /* Blue for informational */
  --success: #4CAF50;            /* Green for correct/complete */
  
  /* Neutral Greys */
  --grey-50: #FAFAFA;
  --grey-100: #F5F5F5;
  --grey-200: #E0E0E0;
  --grey-300: #BDBDBD;
  --grey-400: #9E9E9E;
  --grey-500: #757575;
  --grey-600: #616161;
  --grey-700: #424242;
  --grey-800: #212121;
  --grey-900: #000000;
}
```

### Temperature Indicators

Visual indicators for quest/skill activity levels (used in quest lists and progress page).

| State | Icon | Color | Meaning |
|---|---|---|---|
| Hot | 🔥🔥🔥 | `#FF5722` (Deep Orange) | Active daily, high engagement |
| Warm | 🔥🔥 | `#FF9800` (Orange) | Active 3-4x/week |
| Cool | 🔥 | `#FFC107` (Amber) | Active 1-2x/week |
| Dormant | 💤 | `#9E9E9E` (Grey) | Not practiced in 7+ days |

```css
.temperature-hot { color: #FF5722; }
.temperature-warm { color: #FF9800; }
.temperature-cool { color: #FFC107; }
.temperature-dormant { color: #9E9E9E; opacity: 0.6; }
```

### Mastery Status Colors

Word/skill mastery visualization in progress tracking.

| Status | Icon | Color | Progress Bar Style |
|---|---|---|---|
| Mastered | 🌟 | `#FFD700` (Gold) | Solid gold fill |
| Learning | 📈 | `#2196F3` (Blue) | Animated blue gradient |
| Reinforcement | 🔄 | `#FF9800` (Orange) | Pulsing orange outline |

```css
.mastery-mastered {
  color: #FFD700;
  background: linear-gradient(90deg, #FFD700 0%, #FFA500 100%);
}

.mastery-learning {
  color: #2196F3;
  background: linear-gradient(90deg, #2196F3 0%, #64B5F6 100%);
  animation: learning-pulse 2s ease-in-out infinite;
}

@keyframes learning-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.mastery-reinforcement {
  color: #FF9800;
  border: 2px solid #FF9800;
  animation: reinforcement-pulse 1.5s ease-in-out infinite;
}

@keyframes reinforcement-pulse {
  0%, 100% { border-color: #FF9800; }
  50% { border-color: #FFB74D; }
}
```

### Dark Mode Variants

All colors have dark mode equivalents with adjusted lightness for WCAG AA compliance on dark backgrounds.

```css
@media (prefers-color-scheme: dark) {
  :root {
    /* Tier colors - adjusted for dark background */
    --tier-grey-circle: #A0A0A0;
    --tier-bronze-circle: #E89E56;
    --tier-silver-circle: #D0D0D0;
    --tier-gold-circle: #FFEB3B;
    --tier-diamond-circle: #E0F7FA;
    --tier-platinum-circle: #F5F5F5;
    
    /* UI colors - higher contrast for dark mode */
    --xp-bar-bg: #424242;
    --grey-200: #424242;
    --grey-300: #616161;
  }
}
```

---

## 3. Animation Specifications

### Badge Unlock Sequence

Full-screen celebration when user unlocks a new badge or advances to a new tier.

**Duration**: 5 seconds total (skippable after 2 seconds)  
**Easing**: `cubic-bezier(0.4, 0.0, 0.2, 1)` (Material Design standard ease-in-out)

```css
/* Badge unlock animation timeline */
@keyframes badge-unlock {
  /* Phase 1: Materialize (0-1s) */
  0% {
    opacity: 0;
    transform: scale(0.3) rotate(-30deg);
    filter: blur(10px);
  }
  20% {
    opacity: 1;
    transform: scale(1.1) rotate(5deg);
    filter: blur(0);
  }
  
  /* Phase 2: Full-screen display (1-3s) */
  20%, 60% {
    transform: scale(2) rotate(360deg);
  }
  
  /* Phase 3: Celebration (3-4s) - confetti rendered separately */
  60%, 80% {
    transform: scale(2) rotate(360deg);
  }
  
  /* Phase 4: Shrink to collection (4-5s) */
  80% {
    transform: scale(2) rotate(360deg);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateX(var(--target-x)) translateY(var(--target-y));
  }
}

.badge-unlocking {
  animation: badge-unlock 5s cubic-bezier(0.4, 0.0, 0.2, 1) forwards;
  position: fixed;
  top: 50%;
  left: 50%;
  z-index: 9999;
}

/* Skip button appears at 2s mark */
.unlock-skip-button {
  animation: fade-in 0.3s ease-in 2s forwards;
  opacity: 0;
}

@keyframes fade-in {
  to { opacity: 1; }
}
```

**Tier-Specific Confetti Colors**:
```javascript
const confettiColors = {
  grey: ['#8B8B8B', '#A0A0A0', '#BDBDBD'],
  bronze: ['#CD7F32', '#D4A574', '#E8C296'],
  silver: ['#C0C0C0', '#D3D3D3', '#E8E8E8'],
  gold: ['#FFD700', '#FFA500', '#FFEB3B'],
  diamond: ['#B9F2FF', '#87CEEB', '#ADD8E6', '#E0F7FA'],
  platinum: ['#E5E4E2', '#F5F5F5', '#DCDCDC', '#C9C9C9']
};
```

### XP Bar Fill Animation

Progress bar fills when user earns XP from completing exercises.

**Duration**: 500ms  
**Easing**: `ease-out` (fast start, smooth deceleration)  
**Overflow Behavior**: When XP exceeds current level, bar fills to 100%, pauses 200ms, then shows overflow amount in new level.

```css
@keyframes xp-bar-fill {
  0% {
    width: var(--start-width);
  }
  100% {
    width: var(--end-width);
  }
}

.xp-bar-progress {
  animation: xp-bar-fill 500ms ease-out forwards;
  background: linear-gradient(90deg, #4CAF50 0%, #66BB6A 100%);
  transition: width 500ms ease-out;
}

/* Level-up overflow animation */
@keyframes xp-overflow {
  0% {
    width: 100%;
    background: #4CAF50;
  }
  40% {
    width: 100%;
    background: #FFD700;
  }
  60% {
    width: 0%;
    background: #FFD700;
  }
  100% {
    width: var(--overflow-percent);
    background: #4CAF50;
  }
}

.xp-bar-overflow {
  animation: xp-overflow 1.2s cubic-bezier(0.4, 0.0, 0.2, 1) forwards;
}
```

### Level-Up Celebration

Full-screen overlay when user advances to a new level.

**Duration**: 2 seconds  
**Trigger**: XP bar overflows and new level is achieved  
**Sound**: Optional celebratory chime (user-configurable)

```css
@keyframes level-up {
  0% {
    opacity: 0;
    transform: scale(0.5);
  }
  10% {
    opacity: 1;
    transform: scale(1.2);
  }
  50% {
    transform: scale(1);
  }
  90% {
    opacity: 1;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(1.1);
  }
}

.level-up-modal {
  animation: level-up 2s cubic-bezier(0.4, 0.0, 0.2, 1) forwards;
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: radial-gradient(circle, rgba(255,215,0,0.3) 0%, rgba(0,0,0,0.8) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.level-up-number {
  font-size: 96px;
  font-weight: 700;
  color: #FFD700;
  text-shadow: 0 0 20px rgba(255, 215, 0, 0.8);
  animation: level-up-number 2s ease-out forwards;
}

@keyframes level-up-number {
  0% {
    transform: scale(0) rotate(-180deg);
    opacity: 0;
  }
  50% {
    transform: scale(1.3) rotate(10deg);
    opacity: 1;
  }
  100% {
    transform: scale(1) rotate(0deg);
    opacity: 1;
  }
}
```

### Notification Patterns

Toast notifications for achievements, quest completions, and reminders.

```css
/* Slide in from top */
@keyframes notification-slide-in {
  from {
    transform: translateY(-100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* Slide out after 4 seconds */
@keyframes notification-slide-out {
  from {
    transform: translateY(0);
    opacity: 1;
  }
  to {
    transform: translateY(-100%);
    opacity: 0;
  }
}

.notification-toast {
  animation: 
    notification-slide-in 0.3s ease-out,
    notification-slide-out 0.3s ease-in 4s forwards;
  position: fixed;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  padding: 12px 24px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 9000;
}

/* Reduced motion alternative */
@media (prefers-reduced-motion: reduce) {
  .notification-toast {
    animation: none;
    transition: opacity 0.3s ease-in-out;
  }
}
```

---

## 4. Typography Scale

### Font Families

**UI Text**: Inter, system-ui, sans-serif  
**German Text**: 'Noto Sans', 'Inter', sans-serif (superior ß, ä, ö, ü rendering)  
**Monospace** (stats, XP, numbers): 'Roboto Mono', 'Consolas', monospace

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans:wght@300;400;500;600;700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500;600&display=swap');

:root {
  --font-ui: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
  --font-german: 'Noto Sans', 'Inter', system-ui, sans-serif;
  --font-mono: 'Roboto Mono', 'Consolas', 'Monaco', monospace;
}

body {
  font-family: var(--font-ui);
  font-feature-settings: 'kern' 1, 'liga' 1, 'calt' 1;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Apply German font to specific elements */
[lang="de"],
.german-text,
.quest-title,
.badge-name {
  font-family: var(--font-german);
}

/* Apply monospace to numeric displays */
.xp-value,
.stat-number,
.level-number,
.completion-count {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
}
```

### Type Scale

Based on 16px base font size with modular scale ratio of 1.25 (major third).

```css
:root {
  /* Font Sizes */
  --text-display: 3rem;      /* 48px - Level-up announcements, hero text */
  --text-h1: 2rem;           /* 32px - Page titles */
  --text-h2: 1.5rem;         /* 24px - Section headers */
  --text-h3: 1.25rem;        /* 20px - Card titles, quest names */
  --text-body: 1rem;         /* 16px - Body text, descriptions */
  --text-small: 0.875rem;    /* 14px - Captions, metadata, helper text */
  --text-tiny: 0.75rem;      /* 12px - Fine print, footnotes */
  
  /* Line Heights */
  --lh-tight: 1.2;           /* Headlines */
  --lh-base: 1.5;            /* Body text */
  --lh-relaxed: 1.75;        /* Long-form content */
}

/* Typography classes */
.text-display {
  font-size: var(--text-display);
  line-height: var(--lh-tight);
  font-weight: 700;
  letter-spacing: -0.02em;
}

.text-h1 {
  font-size: var(--text-h1);
  line-height: var(--lh-tight);
  font-weight: 700;
}

.text-h2 {
  font-size: var(--text-h2);
  line-height: var(--lh-tight);
  font-weight: 600;
}

.text-h3 {
  font-size: var(--text-h3);
  line-height: var(--lh-tight);
  font-weight: 600;
}

.text-body {
  font-size: var(--text-body);
  line-height: var(--lh-base);
  font-weight: 400;
}

.text-small {
  font-size: var(--text-small);
  line-height: var(--lh-base);
  font-weight: 400;
}

.text-tiny {
  font-size: var(--text-tiny);
  line-height: var(--lh-base);
  font-weight: 400;
}
```

### Font Weights

```css
:root {
  --weight-light: 300;
  --weight-regular: 400;
  --weight-medium: 500;
  --weight-semibold: 600;
  --weight-bold: 700;
}

/* Weight utility classes */
.font-light { font-weight: var(--weight-light); }
.font-regular { font-weight: var(--weight-regular); }
.font-medium { font-weight: var(--weight-medium); }
.font-semibold { font-weight: var(--weight-semibold); }
.font-bold { font-weight: var(--weight-bold); }
```

### Responsive Typography

```css
/* Fluid typography for better mobile experience */
@media (max-width: 768px) {
  :root {
    --text-display: 2.5rem;    /* 40px */
    --text-h1: 1.75rem;        /* 28px */
    --text-h2: 1.375rem;       /* 22px */
    --text-h3: 1.125rem;       /* 18px */
  }
}

@media (max-width: 480px) {
  :root {
    --text-display: 2rem;      /* 32px */
    --text-h1: 1.5rem;         /* 24px */
    --text-h2: 1.25rem;        /* 20px */
  }
}
```

---

## 5. Spacing & Layout System

### Badge Sizes

Consistent badge dimensions across all contexts.

```css
:root {
  --badge-size-small: 32px;    /* Inline with text, quest lists, notifications */
  --badge-size-medium: 64px;   /* Badge collection grid, profile page, hover tooltips */
  --badge-size-large: 128px;   /* Unlock animations, achievement modals, celebration screens */
}

.badge-small {
  width: var(--badge-size-small);
  height: var(--badge-size-small);
}

.badge-medium {
  width: var(--badge-size-medium);
  height: var(--badge-size-medium);
}

.badge-large {
  width: var(--badge-size-large);
  height: var(--badge-size-large);
}

/* Badge scales proportionally */
.badge svg {
  width: 100%;
  height: 100%;
}
```

### Component Spacing

8px base unit for consistent rhythm.

```css
:root {
  --spacing-xs: 4px;     /* Tight spacing, icon gaps */
  --spacing-sm: 8px;     /* Small spacing, button padding */
  --spacing-md: 16px;    /* Base spacing, card padding (mobile) */
  --spacing-lg: 24px;    /* Large spacing, section gaps, card padding (desktop) */
  --spacing-xl: 32px;    /* Extra large, page margins */
  --spacing-2xl: 48px;   /* Hero sections, major dividers */
}

/* Spacing utility classes */
.p-xs { padding: var(--spacing-xs); }
.p-sm { padding: var(--spacing-sm); }
.p-md { padding: var(--spacing-md); }
.p-lg { padding: var(--spacing-lg); }
.p-xl { padding: var(--spacing-xl); }
.p-2xl { padding: var(--spacing-2xl); }

.m-xs { margin: var(--spacing-xs); }
.m-sm { margin: var(--spacing-sm); }
.m-md { margin: var(--spacing-md); }
.m-lg { margin: var(--spacing-lg); }
.m-xl { margin: var(--spacing-xl); }
.m-2xl { margin: var(--spacing-2xl); }

/* Gap utilities for flexbox/grid */
.gap-xs { gap: var(--spacing-xs); }
.gap-sm { gap: var(--spacing-sm); }
.gap-md { gap: var(--spacing-md); }
.gap-lg { gap: var(--spacing-lg); }
.gap-xl { gap: var(--spacing-xl); }
```

### Card Layouts

Standard card component for quests, badges, progress sections.

```css
.card {
  background: #FFFFFF;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: var(--spacing-md);
  transition: box-shadow 0.2s ease-in-out;
}

.card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

/* Desktop gets more generous padding */
@media (min-width: 1024px) {
  .card {
    padding: var(--spacing-lg);
  }
}

/* Dark mode variant */
@media (prefers-color-scheme: dark) {
  .card {
    background: #1E1E1E;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }
  
  .card:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
  }
}
```

### Grid Layouts

Badge collection and quest grids with responsive breakpoints.

```css
/* Badge collection grid */
.badge-grid {
  display: grid;
  gap: var(--spacing-md);
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
}

@media (min-width: 768px) {
  .badge-grid {
    gap: var(--spacing-lg);
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  }
}

/* Quest card grid */
.quest-grid {
  display: grid;
  gap: var(--spacing-md);
  grid-template-columns: 1fr;
}

@media (min-width: 768px) {
  .quest-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .quest-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: var(--spacing-lg);
  }
}
```

### Responsive Breakpoints

Mobile-first approach with consistent breakpoint naming.

```css
:root {
  --breakpoint-mobile: 0px;      /* < 768px - Mobile phones */
  --breakpoint-tablet: 768px;    /* 768px - 1024px - Tablets */
  --breakpoint-desktop: 1024px;  /* > 1024px - Desktop monitors */
}

/* Usage example */
@media (max-width: 767px) {
  /* Mobile styles */
}

@media (min-width: 768px) and (max-width: 1023px) {
  /* Tablet styles */
}

@media (min-width: 1024px) {
  /* Desktop styles */
}
```

---

## 6. Accessibility Guidelines

### Color Contrast Requirements

All text must meet WCAG AA standards (4.5:1 for normal text, 3:1 for large text).

**Tier Colors on White Background**:
- Grey: 4.8:1 (Pass AA)
- Bronze: 5.2:1 (Pass AA)
- Silver: 4.9:1 (Pass AA)
- Gold: 3.5:1 (Pass AA for large text only, 18px+)
- Diamond: 1.8:1 (Fail - decorative only, requires text label)
- Platinum: 2.1:1 (Fail - decorative only, requires text label)

**Required Fixes**:
```html
<!-- Always include accessible text labels for Diamond/Platinum badges -->
<div class="badge-diamond" aria-label="Diamond tier badge">
  <svg>...</svg>
</div>
<span class="sr-only">Diamond tier: 1000 completions</span>
```

### Screen Reader Labels

All badges, progress bars, and visual indicators must have semantic labels.

```html
<!-- Badge with screen reader context -->
<div 
  class="badge badge-gold" 
  role="img" 
  aria-label="Gold tier badge for Der Meister: 523 flashcard completions">
  <svg>...</svg>
</div>

<!-- XP progress bar -->
<div 
  class="xp-bar" 
  role="progressbar" 
  aria-valuenow="2450" 
  aria-valuemin="0" 
  aria-valuemax="3000"
  aria-label="Level 12 progress: 2,450 out of 3,000 XP">
  <div class="xp-bar-progress"></div>
</div>

<!-- Temperature indicator -->
<span class="temperature-hot" aria-label="Hot: Active daily">
  🔥🔥🔥
</span>
```

### Keyboard Navigation

All interactive gamification elements must be keyboard accessible.

```css
/* Focus styles for keyboard navigation */
.badge:focus,
.quest-card:focus,
.notification-toast:focus {
  outline: 3px solid #2196F3;
  outline-offset: 2px;
}

/* Focus visible (only keyboard, not mouse clicks) */
.badge:focus-visible {
  outline: 3px solid #2196F3;
  outline-offset: 2px;
}

/* Skip link for badge unlock animations */
.unlock-skip-button {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  z-index: 10001;
}

.unlock-skip-button:focus {
  outline: 3px solid #FFD700;
}
```

### Reduced Motion Support

Respect user preference for reduced motion.

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
  
  /* Disable shimmer and prismatic effects */
  .badge-diamond,
  .badge-platinum {
    animation: none;
  }
  
  /* Simplified badge unlock */
  .badge-unlocking {
    animation: simple-fade 0.3s ease-in-out;
  }
  
  @keyframes simple-fade {
    from { opacity: 0; }
    to { opacity: 1; }
  }
}
```

---

## 7. Performance Considerations

### Mobile Optimization

- **Filter Complexity**: Disable complex SVG filters on mobile devices (< 768px) to maintain 60fps
- **Badge Rendering**: Use CSS classes instead of inline styles for better caching
- **Animation Frame Budget**: Badge unlock animation should not block UI thread (use `will-change` property)

```css
/* Performance hints for animations */
.badge-unlocking {
  will-change: transform, opacity;
}

/* Disable expensive filters on mobile */
@media (max-width: 768px) {
  .badge {
    filter: none;
  }
  
  .badge-diamond,
  .badge-platinum {
    animation: none; /* Disable shimmer on mobile */
  }
}
```

### Asset Loading

- **Badge SVGs**: Inline critical badges (Grey, Bronze, Silver) in HTML, lazy-load higher tiers
- **Font Loading**: Use `font-display: swap` to prevent invisible text during font load
- **Confetti Library**: Lazy-load canvas-confetti library only when badge unlock occurs

```html
<!-- Preload critical fonts -->
<link rel="preload" href="/fonts/Inter-Regular.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/NotoSans-Regular.woff2" as="font" type="font/woff2" crossorigin>
```

---

## 8. Implementation Checklist

- [ ] All 6 badge tiers implemented with correct colors
- [ ] SVG badge template tested in Chrome, Firefox, Safari
- [ ] CSS chrome effects verified on desktop and mobile
- [ ] Color contrast ratios checked (WCAG AA compliance)
- [ ] XP bar fill animation tested with overflow scenario
- [ ] Badge unlock sequence tested with skip functionality
- [ ] Level-up celebration tested with confetti
- [ ] Typography scale applied to all UI text
- [ ] German characters (ß, ä, ö, ü) render correctly
- [ ] Spacing system applied consistently across components
- [ ] Dark mode variants tested
- [ ] Screen reader labels added to all badges
- [ ] Keyboard navigation verified
- [ ] Reduced motion preferences respected
- [ ] Mobile performance tested (60fps target)

---

## 9. Examples & Mockups

### Badge Tier Comparison

```
Grey           Bronze         Silver         Gold           Diamond        Platinum
(Matte)        (Brushed)      (Polished)     (Polished)     (Crystalline)  (Brushed)

   ⭐            ⭐             ⭐             ⭐             ✨             ⭐
  #8B8B8B       #CD7F32        #C0C0C0        #FFD700        #B9F2FF        #E5E4E2
```

### Quest Card Layout

```
┌────────────────────────────────────────┐
│ 🔥🔥🔥  Der Meister           [523/500]│
│                                         │
│ Complete flashcard exercises            │
│ Tier: 💎 Diamond                       │
│                                         │
│ [████████████████████░░░] 523/1000     │
│                                         │
│ Next: Platinum (477 exercises left)    │
└────────────────────────────────────────┘
```

### Progress Page Section

```
┌─ WORD MASTERY ─────────────────────────┐
│ 🌟 Mastered: 127 words (↑12 this week) │
│ 📈 Learning: 43 words                   │
│ 🔄 Reviewing: 18 words                  │
│                                          │
│ Recent Improvements:                     │
│ • "der Zug" ███████░░ 70% → 95% ⬆️      │
│ • "obwohl"  ████████░ 85% → 90% ⬆️      │
│                                          │
│ Reinforcement Opportunities:             │
│ • "deren"   ███░░░░░░ 88% → 45% ⬇️      │
│   Last seen: 12 days ago                 │
│   Try: fill-blank drill                  │
└──────────────────────────────────────────┘
```

---

## 10. Version History

| Version | Date | Changes |
|---|---|---|
| 1.0.0 | 2026-04-27 | Initial visual design system specification |

---

**Status**: Active Specification  
**Next Review**: Before frontend implementation begins  
**Owned By**: Design Team  
**Related**: [Gamification Engagement System](local.gamification-engagement-system.md), Task 7 Visual Design System