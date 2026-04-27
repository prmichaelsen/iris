# Task 7: Visual Design System Document

**Milestone**: M9 - Foundation + UX Design + OpenAPI  
**Status**: Pending  
**Estimated Hours**: 6  
**Dependencies**: None (can run parallel)  

---

## Objective

Create visual design system document with badge specifications, color palettes, chrome effects, animations, and typography standards for gamification UI.

---

## Scope

### Visual Elements to Specify

1. **Badge Tier System** (R4)
   - Star-in-circle design across all 6 tiers
   - Chrome finish specifications per tier
   - SVG templates
   - CSS/SVG filter techniques

2. **Color Palettes**
   - Tier colors (Grey → Platinum)
   - XP bar colors
   - Quest category colors
   - Temperature indicators (🔥🔥🔥 → 💤)
   - Mastery status colors

3. **Animation Guidelines**
   - Badge unlock sequence
   - XP bar fill timing
   - Level-up celebration
   - Notification patterns

4. **Typography**
   - Font families (German vs English)
   - Heading scale
   - Body text sizes
   - Monospace for code/stats

5. **Spacing & Sizing**
   - Badge sizes (32px, 64px, 128px)
   - Component spacing
   - Card layouts
   - Responsive breakpoints

---

## Deliverable Format

Create `agent/design/visual-system.gamification.md` with:

### 1. Badge Tier Specifications

```markdown
## Badge Visual System

### Design Principle
All badges share unified design: **star inside circle** (star slightly darker than circle) with tier-specific chrome finish.

### Tier Specifications

| Tier | Chrome Finish | Circle Color | Star Color | Visual Effect | Context |
|---|---|---|---|---|---|
| Grey | Matte grey metal | `#8B8B8B` | `#6B6B6B` | Flat, beginner-friendly | 10 completions |
| Bronze | Brushed bronze | `#CD7F32` | `#8B5A2B` | Warm metallic sheen | 50 completions |
| Silver | Polished silver | `#C0C0C0` | `#A0A0A0` | Mirror-like reflection | 100 completions |
| Gold | Polished gold | `#FFD700` | `#DAA520` | Rich, luxurious glow | 500 completions |
| Diamond | Crystalline faceted | `#B9F2FF` | `#87CEEB` | Prismatic sparkle | 1000 completions |
| Platinum | Brushed platinum | `#E5E4E2` | `#C5C4C2` | Subtle iridescence | Ultimate tier |

### SVG Template

[Include SVG code for star-in-circle with CSS classes for chrome effects]

### CSS Chrome Effects

[Include CSS filters, gradients, drop-shadows for each tier]
```

### 2. Color System

```markdown
## Color Palettes

### Tier Colors
- Grey: `#8B8B8B`
- Bronze: `#CD7F32`
- Silver: `#C0C0C0`
- Gold: `#FFD700`
- Diamond: `#B9F2FF`
- Platinum: `#E5E4E2`

### UI Colors
- XP Bar Fill: `#4CAF50` (green progress)
- XP Bar Background: `#E0E0E0` (grey)
- Quest Active: `#2196F3` (blue)
- Quest Complete: `#4CAF50` (green)
- Error/Warning: `#F44336` (red)

### Temperature Indicators
- Hot (🔥🔥🔥): `#FF5722` (deep orange)
- Warm (🔥🔥): `#FF9800` (orange)
- Cool (🔥): `#FFC107` (amber)
- Dormant (💤): `#9E9E9E` (grey)

### Mastery Status
- Mastered (🌟): `#FFD700` (gold)
- Learning (📈): `#2196F3` (blue)
- Reinforcement (🔄): `#FF9800` (orange)
```

### 3. Animation Specifications

```markdown
## Animations

### Badge Unlock Sequence (5 seconds total)
1. **Materialize** (0-1s): Badge fades in with tier-appropriate shimmer
2. **Full-screen** (1-3s): Badge scales to 128px center screen, rotates 360°
3. **Celebration** (3-4s): Confetti/sparkles matching tier color
4. **Shrink** (4-5s): Badge scales down, moves to collection grid

Easing: `cubic-bezier(0.4, 0.0, 0.2, 1)` (Material Design standard)

### XP Bar Fill
- Duration: 500ms
- Easing: `ease-out`
- Overflow animation: bar fills 100%, pauses 200ms, resets to overflow amount

### Level-Up Celebration
- Duration: 2s
- Full-screen overlay
- Confetti effect
- Sound effect (optional)
- New level number animated in
```

### 4. Typography Scale

```markdown
## Typography

### Font Families
- **UI Text**: Inter, system-ui, sans-serif
- **German Text**: 'Noto Sans', sans-serif (better ß, ä, ö, ü support)
- **Monospace**: 'Roboto Mono', monospace (stats, XP numbers)

### Scale
- **Display**: 48px / 3rem (level-up announcements)
- **H1**: 32px / 2rem (page titles)
- **H2**: 24px / 1.5rem (section headers)
- **H3**: 20px / 1.25rem (card titles)
- **Body**: 16px / 1rem
- **Small**: 14px / 0.875rem (captions, metadata)
- **Tiny**: 12px / 0.75rem (fine print)

### Weights
- Light: 300
- Regular: 400
- Medium: 500
- Semibold: 600
- Bold: 700
```

### 5. Spacing & Layout

```markdown
## Spacing

### Badge Sizes
- **Small**: 32px (inline with text, quest lists)
- **Medium**: 64px (badge collection grid, profile page)
- **Large**: 128px (unlock animations, achievement notifications)

### Component Spacing
- **xs**: 4px
- **sm**: 8px
- **md**: 16px
- **lg**: 24px
- **xl**: 32px
- **2xl**: 48px

### Card Layouts
- Padding: 16px (mobile), 24px (desktop)
- Border radius: 8px
- Shadow: `0 2px 8px rgba(0,0,0,0.1)`

### Responsive Breakpoints
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px
```

---

## Acceptance Criteria

- [ ] Badge tier specifications include all 6 tiers with exact colors
- [ ] SVG template for star-in-circle badge provided
- [ ] CSS chrome effects specified for each tier (matte, brushed, polished, crystalline)
- [ ] Color palette defined for all UI elements
- [ ] Animation timing and easing curves specified
- [ ] Typography scale defined with font families
- [ ] Spacing system documented
- [ ] Responsive breakpoints specified
- [ ] Accessibility notes included (WCAG AA contrast ratios)
- [ ] Examples or mockups included for key components

---

## Implementation Steps

1. **Create badge SVG templates**
   - Design star-in-circle base shape
   - Export as SVG with CSS class hooks
   - Test across Chrome, Firefox, Safari

2. **Define chrome effect techniques**
   - CSS filters for matte/brushed finishes
   - SVG gradients for polished effects
   - Composite filters for crystalline diamond effect
   - Test performance on mobile devices

3. **Create color palette**
   - Extract tier colors from spec
   - Define semantic colors (success, error, warning)
   - Test contrast ratios (WCAG AA)

4. **Specify animation sequences**
   - Badge unlock keyframes
   - XP bar fill animation
   - Level-up celebration
   - Document timing and easing

5. **Define typography scale**
   - Select font families
   - Test German characters (ß, ä, ö, ü)
   - Define heading/body sizes
   - Document weights

6. **Create spacing system**
   - Define spacing scale (4px, 8px, 16px, etc.)
   - Document badge sizes
   - Specify card layouts

7. **Add accessibility notes**
   - Check color contrast ratios
   - Document screen reader labels
   - Note keyboard navigation requirements

8. **Create examples**
   - Badge tier comparison image
   - Animation storyboards
   - Component layout mockups

---

## Design References

- **Spec**: R4 (Badge Tier Progression visual design)
- **Spec**: "Visual Design" section (badge specifications table)
- **Material Design**: Animation guidelines
- **Apple Human Interface Guidelines**: iOS design patterns

---

## Key Design Decisions

**Q: CSS filters vs SVG gradients for chrome effects?**  
A: Hybrid approach. Matte/brushed use CSS filters (blur, brightness). Polished use SVG radial gradients. Crystalline diamond uses composite (gradient + blur + brightness).

**Q: Should badge unlock animation block UI?**  
A: Yes for 5 seconds (full-screen modal). Creates moment of celebration. User can tap to skip after 2 seconds.

**Q: Font stack for German text?**  
A: 'Noto Sans' has excellent German character support. Fallback to system-ui. Avoid fonts with poor ß rendering.

**Q: Should tier colors be exact hex or allow variation?**  
A: Exact hex from spec for consistency. Dark mode uses same hues with adjusted lightness.

---

## Notes

- Star must be slightly darker than circle (same hue, lower lightness)
- Chrome effects are decorative, not information-bearing (accessibility)
- Animation timing should feel premium (not rushed, not sluggish)
- Badge SVG must scale without pixelation (vector format)
- Test chrome effects on low-end mobile devices (avoid expensive filters)
- Consider dark mode variants for all colors
