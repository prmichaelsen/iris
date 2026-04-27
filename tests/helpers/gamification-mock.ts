import Database from 'better-sqlite3'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const GAMIFICATION_MIGRATION = join(
  process.cwd(),
  'db/migrations/001_initial_gamification.sql',
)
const CORE_MIGRATION = join(process.cwd(), 'migrations/0001_initial.sql')

// Create an in-memory D1-compatible DB with the gamification schema applied.
// Minimal core `users` table is also created so foreign-keyable refs work.
export function createGamificationDb(): D1Database {
  const db = new Database(':memory:')
  db.pragma('journal_mode = WAL')
  // Foreign keys OFF — some gamification tables reference user_progress but
  // tests insert into a more minimal fixture; enforcing FKs is noisy.
  db.pragma('foreign_keys = OFF')

  // Apply gamification migration
  const sql = readFileSync(GAMIFICATION_MIGRATION, 'utf-8')
  db.exec(sql)

  // Minimal users table for auth references (not strictly required)
  try {
    const coreSql = readFileSync(CORE_MIGRATION, 'utf-8')
    // Only create users table to avoid conflicts
    const usersMatch = coreSql.match(/CREATE TABLE IF NOT EXISTS users[\s\S]*?;/)
    if (usersMatch) db.exec(usersMatch[0])
  } catch {
    // ignore
  }

  return wrapAsD1(db)
}

export function getRawDb(d1: D1Database): Database.Database {
  return (d1 as any)._raw
}

// Seed the 8 regions, 8 characters (one per region), and a user_progress row.
export function seedGamification(d1: D1Database, userId = 'test-user') {
  const db = getRawDb(d1)

  // User progress row
  db.prepare(
    `INSERT OR IGNORE INTO user_progress (user_id, level, xp_current, xp_to_next_level) VALUES (?, 1, 0, 100)`,
  ).run(userId)

  // 8 regions with order_index 0..7 (Berlin first)
  const regions = [
    { id: 'region_berlin', name: 'Berlin', voice: 'berlin_voice', order: 0, cost: 0, bonus: 0 },
    { id: 'region_bavaria', name: 'Bayern', voice: 'bavaria_voice', order: 1, cost: 50, bonus: 0 },
    { id: 'region_hamburg', name: 'Hamburg', voice: 'hamburg_voice', order: 2, cost: 50, bonus: 0 },
    { id: 'region_rhine_valley', name: 'Rhine', voice: 'rhine_voice', order: 3, cost: 50, bonus: 0 },
    { id: 'region_black_forest', name: 'BlackForest', voice: 'bf_voice', order: 4, cost: 50, bonus: 0 },
    { id: 'region_saxony', name: 'Saxony', voice: 'saxony_voice', order: 5, cost: 50, bonus: 0 },
    { id: 'region_austria', name: 'Austria', voice: 'at_voice', order: 6, cost: 100, bonus: 1 },
    { id: 'region_switzerland', name: 'Switzerland', voice: 'ch_voice', order: 7, cost: 100, bonus: 1 },
  ]

  const regStmt = db.prepare(
    `INSERT INTO regions (id, name_de, name_en, order_index, description_de, description_en, voice_unlock, point_cost, is_bonus)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
  for (const r of regions) {
    regStmt.run(r.id, r.name, r.name, r.order, `desc_de_${r.name}`, `desc_en_${r.name}`, r.voice, r.cost, r.bonus)
  }

  // One character per region (quest_id = character_id)
  const chars = regions.map((r) => ({
    id: `char_${r.id.replace('region_', '')}`,
    name: `Char_${r.name}`,
    age: 30,
    region_id: r.id,
    personality: `Personality of ${r.name}`,
    specialty: `Specialty of ${r.name}`,
    weights: JSON.stringify({ vocabulary: 0.4, grammar: 0.3, cultural_awareness: 0.3 }),
  }))

  const charStmt = db.prepare(
    `INSERT INTO characters (id, name, age, region_id, personality_description, specialty, grading_weights)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
  for (const c of chars) {
    charStmt.run(c.id, c.name, c.age, c.region_id, c.personality, c.specialty, c.weights)
  }

  // Berlin is unlocked by default (starting region)
  db.prepare(
    `INSERT INTO user_regions (user_id, region_id, unlocked_at, subquests_total) VALUES (?, 'region_berlin', datetime('now'), 1)`,
  ).run(userId)
}

// Unlock an additional region for the test user
export function unlockRegion(d1: D1Database, userId: string, regionId: string, completed = false) {
  const db = getRawDb(d1)
  db.prepare(
    `INSERT OR REPLACE INTO user_regions (user_id, region_id, unlocked_at, completed, subquests_completed, subquests_total)
     VALUES (?, ?, datetime('now'), ?, ?, 1)`,
  ).run(userId, regionId, completed ? 1 : 0, completed ? 1 : 0)
}

function wrapAsD1(db: Database.Database): D1Database {
  const d1: any = {
    _raw: db,
    prepare(sql: string) {
      return new D1Statement(db, sql)
    },
    batch(statements: any[]) {
      return db.transaction(() => statements.map((s) => s._run()))()
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

  _run() {
    return this.run()
  }
}

// Build a minimal ToolContext for invoking tool.execute directly
export function makeCtx(d1: D1Database, userId = 'test-user'): any {
  return {
    env: { DB: d1 } as any,
    userId,
    server: null as any,
    send: () => {},
    targetLang: { code: 'deu', name: 'German', english: 'German' },
    turnWidgetBlocks: [],
    pendingWidget: { widgetId: null, resolve: null, reject: null, timer: null, correctMap: new Map() },
  }
}
