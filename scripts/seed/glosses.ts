// Populate gloss_en for all vocab items using Claude Haiku.
// Run: npx tsx scripts/seed/glosses.ts
// Requires: ANTHROPIC_API_KEY in env (from .zshrc)
// Updates ALL rows for each lemma (handles duplicates across CEFR levels).

import Anthropic from '@anthropic-ai/sdk'
import { execSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'

const BATCH_SIZE = 80
const client = new Anthropic()

function d1Query(sql: string): any[] {
  const escaped = sql.replace(/"/g, '\\"')
  const raw = execSync(
    `npx wrangler d1 execute iris --remote --command "${escaped}" --json`,
    { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 },
  )
  return JSON.parse(raw)[0]?.results ?? []
}

function d1File(path: string): void {
  execSync(`npx wrangler d1 execute iris --remote --file ${path}`, {
    encoding: 'utf-8',
    maxBuffer: 10 * 1024 * 1024,
  })
}

async function main() {
  const rows = d1Query(
    `SELECT DISTINCT lemma, article FROM vocab_items WHERE gloss_en IS NULL AND language = 'deu' ORDER BY lemma`,
  ) as { lemma: string; article: string | null }[]

  console.error(`${rows.length} unique lemmas need glosses`)
  if (rows.length === 0) return

  let totalUpdated = 0

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE)
    const wordList = batch
      .map((r) => `${r.article ? r.article + ' ' : ''}${r.lemma}`)
      .join('\n')

    console.error(
      `Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(rows.length / BATCH_SIZE)}: ${batch.length} words`,
    )

    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `For each German word below, provide a short English gloss (1-3 words, like a dictionary entry).
Format: one line per word, exactly "WORD|GLOSS". No extra text, no numbering.

Examples:
der Gruß|greeting
kaufen|to buy
aber|but
schnell|fast

Words:
${wordList}`,
        },
      ],
    })

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')

    const updates: string[] = []
    for (const line of text.split('\n')) {
      const pipeIdx = line.indexOf('|')
      if (pipeIdx === -1) continue
      const wordPart = line.slice(0, pipeIdx).trim()
      const gloss = line.slice(pipeIdx + 1).trim()
      if (!gloss) continue

      let lemma = wordPart
      for (const art of ['der ', 'die ', 'das ']) {
        if (lemma.toLowerCase().startsWith(art)) {
          lemma = lemma.slice(art.length)
          break
        }
      }

      const eg = gloss.replace(/'/g, "''")
      const el = lemma.replace(/'/g, "''")
      updates.push(
        `UPDATE vocab_items SET gloss_en = '${eg}' WHERE lemma = '${el}' AND language = 'deu' AND gloss_en IS NULL;`,
      )
    }

    if (updates.length > 0) {
      const tmpFile = `/tmp/iris_glosses_batch_${i}.sql`
      writeFileSync(tmpFile, updates.join('\n'))
      d1File(tmpFile)
      totalUpdated += updates.length
      console.error(`  → ${updates.length} glosses written`)
    }

    if (i + BATCH_SIZE < rows.length) {
      await new Promise((r) => setTimeout(r, 500))
    }
  }

  const remaining = d1Query(
    `SELECT COUNT(*) AS c FROM vocab_items WHERE gloss_en IS NULL AND language = 'deu'`,
  ) as { c: number }[]
  console.error(
    `\nDone. ${totalUpdated} glosses written. ${remaining[0]?.c ?? '?'} still missing.`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
