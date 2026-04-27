// Generate English word-level glosses for vocab items using Claude.
// Run: ANTHROPIC_API_KEY=... npx tsx scripts/seed/glosses.ts
// Writes directly to remote D1 via wrangler.

import Anthropic from '@anthropic-ai/sdk'
import { execSync } from 'node:child_process'

const BATCH_SIZE = 80
const client = new Anthropic()

async function main() {
  // Fetch all vocab items without glosses
  const raw = execSync(
    `npx wrangler d1 execute iris --remote --command "SELECT id, lemma, article, cefr_level FROM vocab_items WHERE gloss_en IS NULL ORDER BY cefr_level, lemma" --json`,
    { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 },
  )
  const parsed = JSON.parse(raw)
  const rows: { id: number; lemma: string; article: string | null; cefr_level: string }[] =
    parsed[0]?.results ?? []

  console.error(`${rows.length} words need glosses`)
  if (rows.length === 0) return

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE)
    const wordList = batch
      .map((r) => `${r.id}|${r.article ? r.article + ' ' : ''}${r.lemma}`)
      .join('\n')

    console.error(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} words (${i}–${i + batch.length - 1})`)

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `For each German word below, provide a SHORT English gloss (1-3 words max, like a dictionary entry). Format: one line per word, "ID|gloss". No articles, no explanations, just the core meaning.

Examples:
123|greeting
456|departure
789|to work

Words:
${wordList}`,
        },
      ],
    })

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')

    // Parse response and build SQL
    const updates: string[] = []
    for (const line of text.split('\n')) {
      const match = line.match(/^(\d+)\|(.+)$/)
      if (!match) continue
      const id = match[1]
      const gloss = match[2].trim().replace(/'/g, "''")
      updates.push(`UPDATE vocab_items SET gloss_en = '${gloss}' WHERE id = ${id};`)
    }

    if (updates.length > 0) {
      const sql = updates.join('\n')
      const tmpFile = `/tmp/glosses_batch_${i}.sql`
      require('node:fs').writeFileSync(tmpFile, sql)
      execSync(`npx wrangler d1 execute iris --remote --file ${tmpFile}`, {
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024,
      })
      console.error(`  → Updated ${updates.length} glosses`)
    }

    // Small delay between batches
    if (i + BATCH_SIZE < rows.length) await new Promise((r) => setTimeout(r, 1000))
  }

  console.error('Done!')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
