# Milestone 9: Foundation + UX Design + OpenAPI

**Status**: Planned  
**Duration**: 2 weeks  
**Dependencies**: M4 (Interactive Widgets) completion  
**Estimated Effort**: ~60 hours  

---

## Overview

Establish the foundational infrastructure for the gamification system before building vertical character slices. This milestone focuses on three critical areas:

1. **OpenAPI 3.0+ Specification** - Define formal API contract for all gamification endpoints
2. **UX Pattern Design** - Create comprehensive UX patterns document for progress, badges, map, collections, and character UI
3. **Core D1 Schema** - Extend database with gamification tables
4. **Base MCP Tools** - Implement foundational MCP tools for progress tracking and context management

This milestone frontloads design decisions and API contracts to prevent rework during implementation phases. UX patterns guide all future UI work but do not block development.

---

## Goals

- **Primary**: Define OpenAPI spec covering all 40+ gamification endpoints from spec
- **Primary**: Document UX patterns for all major UI surfaces (progress page, badges, map, collections, character interactions)
- **Primary**: Implement core D1 schema extensions (progress, quests, badges, points, mastery)
- **Primary**: Build base MCP tools (set_context, view_progress, debug_state)
- **Secondary**: Create visual design system document (badge tiers, chrome effects, color palettes)
- **Secondary**: Establish testing strategy for gamification features

---

## Scope

### In Scope

**OpenAPI Specification:**
- All progress tracking endpoints (XP, levels, mastery)
- Quest system endpoints (available, active, progress, completion)
- Badge system endpoints (progression, unlocks, tiers)
- Point economy endpoints (earn, spend, balance)
- Map/region endpoints (unlock, completion, subquests)
- Character relationship endpoints (visit, conversation, grading)
- Foto collection endpoints (unlock, gallery)
- Pen pal endpoints (unlock, letters, send/read)
- Collectible endpoints (gifts, collections)
- Request/response schemas with validation rules
- Error code definitions
- Authentication requirements

**UX Patterns Document:**
- Progress page layout and interactions
- Badge display and unlock animations
- Map navigation and region selection
- Quest list and tracking UI
- Character interaction flows (before/during/after conversations)
- Foto gallery and unlock notifications
- Pen pal letter interface
- Collection browser patterns
- Help system UI during conversations
- Mastery visualization (graphs, word lists)

**D1 Schema Extensions:**
- `user_progress` table
- `user_quests` table
- `quests` table
- `user_badges` table
- `user_points` table
- `point_transactions` table
- `vocab_mastery` table with multi-signal tracking
- Database migration scripts
- Indexes for performance

**Base MCP Tools:**
- `set_context` - Set user's current location/character context
- `view_progress` - View user progress, XP, level, badges
- `debug_state` - Debug tool for inspecting gamification state
- Tool schemas with parameter validation
- Integration with existing Cloudflare Workers architecture

**Visual Design System:**
- Badge tier specifications (star-in-circle with chrome finishes)
- Color palettes for tiers (Grey → Bronze → Silver → Gold → Diamond → Platinum)
- CSS/SVG specifications for chrome effects
- Animation guidelines for unlocks
- Typography and spacing standards

### Out of Scope

- UI implementation (deferred to M15)
- Character-specific implementations (deferred to M10-M14)
- Photo generation pipeline (deferred to M12)
- Pen pal letter generation (deferred to M13)
- Loot box system (deferred to M15)
- Chat buddy system (deferred to M15)

---

## Tasks

1. **Task 1: OpenAPI Specification - Core Progress & Quests** (8h)
   - Define schemas for UserProgress, Quest, UserQuest, Badge, UserBadge
   - Document progress, quest, and badge endpoints
   - Request/response validation rules
   - Error codes

2. **Task 2: OpenAPI Specification - Points, Map, Characters** (8h)
   - Define schemas for Points, Region, Character, CharacterInteraction
   - Document point economy, map, and character endpoints
   - Voice unlock dual-path specifications
   - Regional progression rules

3. **Task 3: OpenAPI Specification - Pen Pals & Collections** (6h)
   - Define schemas for PenPal, Letter, Collectible, Foto
   - Document pen pal, collectible, and foto endpoints
   - Letter frequency rules
   - Collection metadata structures

4. **Task 4: UX Patterns Document** (10h)
   - Progress page wireframes and interactions
   - Badge unlock animation specifications
   - Map navigation patterns
   - Character conversation flows (help system, post-conversation analysis)
   - Foto gallery and pen pal letter UI
   - Mastery visualization patterns
   - Notification patterns

5. **Task 5: D1 Schema Design & Migration** (8h)
   - Write SQL schema for core gamification tables
   - Create migration scripts for D1
   - Define indexes for performance
   - Document schema relationships
   - Test migrations on local D1 instance

6. **Task 6: Base MCP Tools Implementation** (10h)
   - Implement `set_context` tool (location/character tracking)
   - Implement `view_progress` tool (XP, level, badges, quests)
   - Implement `debug_state` tool (inspect gamification state)
   - Write tool schemas and parameter validation
   - Integration tests with existing MCP server

7. **Task 7: Visual Design System Document** (6h)
   - Badge tier visual specifications (SVG templates)
   - Chrome effect CSS/SVG implementations
   - Color palette definitions
   - Animation timing and easing curves
   - Typography scale and weights
   - Spacing/sizing standards

8. **Task 8: Testing Strategy & Documentation** (4h)
   - Define testing approach for gamification features
   - Document test case structure from spec
   - E2E test scenarios for vertical slices
   - Integration test requirements
   - Update README with M9 completion notes

---

## Success Criteria

- [ ] OpenAPI specification covers all 40+ endpoints from gamification spec
- [ ] OpenAPI spec passes validation with `openapi-generator` tooling
- [ ] UX patterns document provides clear guidance for all major surfaces
- [ ] D1 schema migrations run successfully on local instance
- [ ] All core gamification tables created with proper indexes
- [ ] Base MCP tools callable from Claude conversation
- [ ] `view_progress` returns mock data demonstrating structure
- [ ] Visual design system includes SVG badge templates for all 6 tiers
- [ ] Testing strategy documented with example test cases
- [ ] All artifacts committed to git

---

## Dependencies

**Requires:**
- M4 (Interactive Widgets) completion - widget system establishes drill completion hooks

**Enables:**
- M10 (Berlin Vertical Slice) - Karl + Mila E2E implementation
- M11-M14 (Regional Vertical Slices) - Other character implementations
- M15 (Polish + UI Implementation) - Frontend implementation of UX patterns

---

## Design References

- **Spec**: `agent/specs/local.gamification-engagement-system.md`
- **Design**: `agent/design/local.gamification-engagement-system.md`
- **Widget System**: `agent/design/local.widget-system.md` (drill completion integration)

---

## Technical Notes

### OpenAPI Strategy

The spec defines 40+ new endpoints. Manual implementation risks:
- Type drift between client/server
- Missing validation logic
- Inconsistent error handling
- Lack of documentation

OpenAPI provides:
- Single source of truth for API contract
- Auto-generated TypeScript types
- Built-in request/response validation
- Auto-generated API documentation
- Spec-driven test generation

**Adoption Path:**
- M9: Define complete OpenAPI spec
- M10: Generate TypeScript client/server stubs
- M10+: Use generated handlers for all new endpoints
- Future: Migrate existing ad-hoc endpoints to OpenAPI

### MCP-First Approach

Backend features must be testable via MCP tools before UI exists:

```
User (via Claude conversation):
> Can you check my progress?

Claude (calls MCP tool):
view_progress(user_id="user123")

Response:
{
  "level": 5,
  "xp_current": 2450,
  "xp_to_next_level": 3000,
  "badges": [
    {"skill": "flashcard", "tier": "bronze", "progress": 45},
    {"skill": "dictation", "tier": "grey", "progress": 8}
  ],
  "active_quests": [
    {"name": "Complete 5 exercises", "progress": 3}
  ]
}

Claude: "You're level 5 with 2,450 XP. You have a Bronze flashcard 
badge and you're 3/5 on today's quest!"
```

This enables:
- Early E2E testing without UI
- Backend development parallel to UX design
- Claude-driven gamification interactions
- Rapid prototyping of game mechanics

### UX Design Upfront, UI Implementation Later

M9 defines UX patterns (flows, layouts, interactions) but doesn't implement UI components. This:
- Prevents blocking backend development on UI decisions
- Allows UX iteration without code changes
- Provides clear specifications for M15 implementation
- Ensures consistent patterns across all features

**UX Patterns vs UI Implementation:**
- UX Pattern: "Badge unlock shows 5-second full-screen animation with tier-appropriate shimmer, then shrinks to badge collection"
- UI Implementation: React component with Framer Motion animations, SVG filters for chrome effects

---

## Risk Assessment

**Low Risk:**
- OpenAPI specification creation (well-defined requirements from spec)
- D1 schema design (straightforward relational model)
- UX pattern documentation (reference existing apps for inspiration)

**Medium Risk:**
- OpenAPI tool integration with Cloudflare Workers (may require custom adapters)
- MCP tool performance with large progress datasets (pagination strategy needed)
- Badge SVG chrome effects (CSS filters vs SVG gradients tradeoffs)

**Mitigation:**
- Prototype OpenAPI generator with simple endpoint first
- Design `view_progress` with pagination from start
- Create multiple badge mockups to validate visual approach

---

## Timeline

**Week 1:**
- Days 1-2: OpenAPI specification (Tasks 1-3)
- Days 3-4: UX patterns document (Task 4)
- Day 5: D1 schema design (Task 5, start)

**Week 2:**
- Day 1: D1 schema migrations (Task 5, complete)
- Days 2-3: Base MCP tools (Task 6)
- Day 4: Visual design system (Task 7)
- Day 5: Testing strategy + documentation (Task 8)

---

## Next Steps After M9

Once M9 completes:
1. Review OpenAPI spec with stakeholders
2. Generate TypeScript client/server code
3. Begin M10 (Berlin Vertical Slice - Karl + Mila)
4. Implement full Karl conversation flow E2E using MCP tools
5. Test Karl's relationship progression without UI
6. Validate gamification mechanics before scaling to other characters
