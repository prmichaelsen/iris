import Database from 'better-sqlite3'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const MIGRATIONS_DIR = join(process.cwd(), 'migrations')

// Wraps better-sqlite3 in a D1-compatible interface for testing.
// Only implements the subset of D1Database that our tools actually use.
export function createTestDb(): D1Database {
  const db = new Database(':memory:')
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  // Apply schema migrations (skip seed migrations — too large)
  const schemaMigrations = [
    '0001_initial.sql',
    '0002_user_target_lang.sql',
    '0003_curriculum_schema.sql',
    '0006_vocab_gloss.sql',
    '0007_vocab_distractors.sql',
  ]
  for (const file of schemaMigrations) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf-8')
    db.exec(sql)
  }

  return wrapAsD1(db)
}

export function seedTestVocab(d1: D1Database, db: Database.Database) {
  // Insert test vocab items with known articles and glosses
  const items = [
    { lemma: 'Abfahrt', display: 'die Abfahrt', article: 'die', pos: 'noun', cefr: 'A1', gloss: 'departure' },
    { lemma: 'Mann', display: 'der Mann', article: 'der', pos: 'noun', cefr: 'A1', gloss: 'man' },
    { lemma: 'Kind', display: 'das Kind', article: 'das', pos: 'noun', cefr: 'A1', gloss: 'child' },
    { lemma: 'Schule', display: 'die Schule', article: 'die', pos: 'noun', cefr: 'A1', gloss: 'school' },
    { lemma: 'Arbeit', display: 'die Arbeit', article: 'die', pos: 'noun', cefr: 'A1', gloss: 'work' },
    { lemma: 'Haus', display: 'das Haus', article: 'das', pos: 'noun', cefr: 'A1', gloss: 'house' },
    { lemma: 'Buch', display: 'das Buch', article: 'das', pos: 'noun', cefr: 'A1', gloss: 'book' },
    { lemma: 'Frau', display: 'die Frau', article: 'die', pos: 'noun', cefr: 'A1', gloss: 'woman' },
    { lemma: 'Auto', display: 'das Auto', article: 'das', pos: 'noun', cefr: 'A1', gloss: 'car' },
    { lemma: 'Freund', display: 'der Freund', article: 'der', pos: 'noun', cefr: 'A1', gloss: 'friend' },
    { lemma: 'aber', display: 'aber', article: null, pos: null, cefr: 'A1', gloss: 'but' },
    { lemma: 'gehen', display: 'gehen', article: null, pos: 'verb', cefr: 'A1', gloss: 'to go' },
  ]

  const stmt = db.prepare(
    `INSERT INTO vocab_items (language, lemma, display, article, pos, cefr_level, source, gloss_en, created_at)
     VALUES ('deu', ?, ?, ?, ?, ?, 'goethe', ?, strftime('%s','now'))`,
  )
  for (const it of items) {
    stmt.run(it.lemma, it.display, it.article, it.pos, it.cefr, it.gloss)
  }

  // Add example sentences for fill-blank testing
  const exStmt = db.prepare(
    `INSERT INTO vocab_examples (vocab_item_id, sentence_de, sentence_en, source)
     SELECT id, ?, ?, 'goethe' FROM vocab_items WHERE lemma = ? AND language = 'deu'`,
  )
  exStmt.run('Vor der Abfahrt rufe ich an.', 'Before departure, I will call.', 'Abfahrt')
  exStmt.run('Der Mann ist nett.', 'The man is nice.', 'Mann')
  exStmt.run('Das Kind spielt.', 'The child is playing.', 'Kind')
  exStmt.run('Die Schule beginnt um acht.', 'School starts at eight.', 'Schule')

  // Add distractors for flashcard-matching testing
  const dStmt = db.prepare(
    `INSERT INTO vocab_distractors (vocab_item_id, distractor_en)
     SELECT id, ? FROM vocab_items WHERE lemma = ? AND language = 'deu'`,
  )
  dStmt.run('arrival', 'Abfahrt')
  dStmt.run('entrance', 'Abfahrt')
  dStmt.run('delay', 'Abfahrt')

  // Add a test user
  db.exec(`INSERT INTO users (id, email, password_hash, created_at) VALUES ('test-user', 'test@test.com', 'hash', 0)`)
}

// Returns the underlying better-sqlite3 instance for direct seeding
export function getRawDb(d1: D1Database): Database.Database {
  return (d1 as any)._raw
}

function wrapAsD1(db: Database.Database): D1Database {
  const d1: any = {
    _raw: db,
    prepare(sql: string) {
      return new D1Statement(db, sql)
    },
    batch(statements: any[]) {
      return db.transaction(() => {
        return statements.map((s) => s._run())
      })()
    },
    exec(sql: string) {
      db.exec(sql)
      return { count: 0, duration: 0 }
    },
  }
  return d1 as D1Database
}

class D1Statement {
  private db: Database.Database
  private sql: string
  private params: any[] = []

  constructor(db: Database.Database, sql: string) {
    this.db = db
    this.sql = sql
  }

  bind(...params: any[]) {
    this.params = params
    return this
  }

  async first<T = any>(col?: string): Promise<T | null> {
    const row = this.db.prepare(this.sql).get(...this.params) as any
    if (!row) return null
    if (col) return row[col]
    return row as T
  }

  async all<T = any>(): Promise<{ results: T[] }> {
    const rows = this.db.prepare(this.sql).all(...this.params) as T[]
    return { results: rows }
  }

  async run() {
    const info = this.db.prepare(this.sql).run(...this.params)
    return { success: true, meta: { changes: info.changes } }
  }

  // Used by batch()
  _run() {
    return this.run()
  }
}
