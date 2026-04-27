/**
 * Study List Injector
 *
 * Injects the user's active study list into the system prompt with
 * instructions for Iris to (a) occasionally weave these words into
 * replies, and (b) render them as "lemma (gloss)" inline whenever used.
 *
 * Composition: top 20 by priority + 20 random from most-recent 50 + 10
 * random tail (rank 21+), deduped.
 */

import type { PromptInjector, PromptInjectorContext, PromptInjectorResult } from '../types'
import { composeStudyListInjection } from '../../tools/study-list'

export class StudyListInjector implements PromptInjector {
  readonly id = 'study-list'
  readonly name = 'Study List'
  readonly description = "Injects the user's study list words and inline-gloss rule"
  readonly enabledByDefault = true

  canInject(context: PromptInjectorContext): boolean {
    return !!context.db && !!context.userId
  }

  async inject(context: PromptInjectorContext): Promise<PromptInjectorResult | null> {
    const { db, userId } = context
    if (!db || !userId) return null

    const words = await composeStudyListInjection({ DB: db } as any, userId)
    if (words.length === 0) return null

    // Format as a compact table Claude can scan quickly.
    const lines = words
      .sort((a, b) => b.priority - a.priority)
      .map((w) => `  - ${w.lemma}${w.gloss ? ` — ${w.gloss}` : ''}`)
      .join('\n')

    const content = `## Study List (user's practice words)

The user is actively studying these words. Two rules apply:

1. **Inline gloss format (mandatory):** Whenever you use one of these words in a reply, immediately follow it with the English gloss in parentheses — e.g., "gerade (already)". This applies to every occurrence, not just the first. Do NOT translate the whole sentence — just annotate the study word.

2. **Natural weaving (encouraged):** When natural, weave 1–2 of these words into your reply without drilling or listing them. Don't force it; use them only where they'd fit conversationally.

After you deliberately use a study word, call the \`study_list\` tool with action="mark_used" and the word so the system tracks engagement. Skip mark_used for words you didn't intentionally pick from this list.

If the user asks what one of these words means, call \`study_list\` action="mark_clarified" for that word (signals they still need practice).

Active words (${words.length}):
${lines}`

    return {
      content,
      priority: 0.75, // after character identity, before quest-specific content
      title: 'Study List',
      required: false,
    }
  }
}
