# Task 6: Base MCP Tools Implementation

**Milestone**: M9 - Foundation + UX Design + OpenAPI  
**Status**: Pending  
**Estimated Hours**: 10  
**Dependencies**: Task 5 (D1 schema must exist)  

---

## Objective

Implement foundational MCP tools that enable early testing of gamification features via Claude conversations before UI exists. This enables the MCP-first development approach for M10-M14.

---

## Background

MCP-first approach means:
1. Backend APIs implemented first
2. MCP tools expose backend to Claude
3. Test features via conversation ("Can you check my progress?")
4. UI implementation happens last (M15)

This enables E2E testing without waiting for UI, allows backend/frontend parallel development, and validates game mechanics early.

---

## Scope

### Tools to Implement

**1. set_context**
- Sets user's current location and active character
- Enables Claude to track where user is in the game world
- Parameters: `user_id`, `location` (enum: berlin, bavaria, etc.), `character_id` (optional)
- Returns: confirmation + current context

**2. view_progress**
- Views user's current progress, XP, level, badges, active quests
- Most-used debugging tool during development
- Parameters: `user_id`, `detail_level` (enum: summary, full)
- Returns: progress summary or detailed breakdown

**3. debug_state**
- Admin/debug tool for inspecting full gamification state
- Shows all tables related to user
- Parameters: `user_id`, `tables` (optional array to filter)
- Returns: raw data from specified tables

### Integration Requirements

- Tools must integrate with existing MCP server architecture
- Use Cloudflare Workers D1 bindings for database access
- Return structured JSON matching OpenAPI response schemas
- Include error handling (user not found, database errors)
- Support both mock data (for early testing) and real DB queries

---

## Acceptance Criteria

- [ ] `set_context` tool callable from Claude conversation
- [ ] `set_context` stores context in session or database
- [ ] `view_progress` returns mock progress data initially
- [ ] `view_progress` matches OpenAPI schema from Task 1
- [ ] `debug_state` queries D1 and returns user's gamification data
- [ ] All tools have JSON schemas with parameter validation
- [ ] Tools integrated with existing MCP server
- [ ] Error responses match OpenAPI error schema (code, message, details)
- [ ] Tools callable via Claude Code MCP interface
- [ ] Documentation created for each tool with examples

---

## Implementation Steps

1. **Define tool schemas**
   ```typescript
   // server/mcp/tools/gamification.ts
   
   export const setContextTool = {
     name: 'set_context',
     description: 'Set user context (location, active character) for gamification tracking',
     inputSchema: {
       type: 'object',
       properties: {
         user_id: { type: 'string', description: 'User ID' },
         location: { 
           type: 'string', 
           enum: ['berlin', 'bavaria', 'hamburg', 'rhine', 'blackforest', 'saxony', 'austria', 'switzerland'],
           description: 'Current region'
         },
         character_id: { 
           type: 'string', 
           description: 'Active character (karl, mila, etc.)',
           optional: true
         }
       },
       required: ['user_id', 'location']
     }
   }
   
   export const viewProgressTool = {
     name: 'view_progress',
     description: 'View user gamification progress (XP, level, badges, quests)',
     inputSchema: {
       type: 'object',
       properties: {
         user_id: { type: 'string', description: 'User ID' },
         detail_level: {
           type: 'string',
           enum: ['summary', 'full'],
           description: 'Level of detail',
           default: 'summary'
         }
       },
       required: ['user_id']
     }
   }
   
   export const debugStateTool = {
     name: 'debug_state',
     description: 'Debug tool to inspect full gamification state for user',
     inputSchema: {
       type: 'object',
       properties: {
         user_id: { type: 'string', description: 'User ID' },
         tables: {
           type: 'array',
           items: { type: 'string' },
           description: 'Filter to specific tables',
           optional: true
         }
       },
       required: ['user_id']
     }
   }
   ```

2. **Implement set_context handler**
   ```typescript
   async function handleSetContext(params: { user_id: string, location: string, character_id?: string }, env: Env) {
     // For M9: Store in memory or simple KV
     // For M10+: Store in D1 user_context table or session
     
     const context = {
       user_id: params.user_id,
       location: params.location,
       character_id: params.character_id || null,
       updated_at: new Date().toISOString()
     }
     
     // TODO: persist to D1 or KV
     
     return {
       success: true,
       context,
       message: `Context set: ${params.location}${params.character_id ? ` with ${params.character_id}` : ''}`
     }
   }
   ```

3. **Implement view_progress handler (mock data initially)**
   ```typescript
   async function handleViewProgress(params: { user_id: string, detail_level?: string }, env: Env) {
     // M9: Return mock data matching OpenAPI schema
     // M10+: Query D1 for real data
     
     const mockData = {
       user_id: params.user_id,
       level: 5,
       xp_current: 2450,
       xp_to_next_level: 3000,
       badges: [
         { skill: 'flashcard', tier: 'bronze', progress: 45, threshold_next: 50 },
         { skill: 'dictation', tier: 'grey', progress: 8, threshold_next: 10 }
       ],
       active_quests: [
         { id: 'daily_5ex', name_en: 'Complete 5 exercises', progress: 3, target: 5 }
       ],
       points: {
         total_earned: 1250,
         current_balance: 850
       }
     }
     
     if (params.detail_level === 'full') {
       // Add mastery breakdown, completed quests, etc.
       mockData.mastery = {
         mastered: 127,
         learning: 43,
         reinforcement: 18
       }
     }
     
     return mockData
   }
   ```

4. **Implement debug_state handler (real D1 queries)**
   ```typescript
   async function handleDebugState(params: { user_id: string, tables?: string[] }, env: Env) {
     const userId = params.user_id
     const tables = params.tables || ['user_progress', 'user_quests', 'user_badges', 'user_points']
     
     const result: Record<string, any> = {}
     
     for (const table of tables) {
       try {
         const query = `SELECT * FROM ${table} WHERE user_id = ?`
         const { results } = await env.DB.prepare(query).bind(userId).all()
         result[table] = results
       } catch (error) {
         result[table] = { error: error.message }
       }
     }
     
     return {
       user_id: userId,
       tables: result,
       queried_at: new Date().toISOString()
     }
   }
   ```

5. **Register tools with MCP server**
   ```typescript
   // server/mcp/server.ts
   
   import { setContextTool, viewProgressTool, debugStateTool } from './tools/gamification'
   
   mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
     return {
       tools: [
         setContextTool,
         viewProgressTool,
         debugStateTool,
         // ... existing tools
       ]
     }
   })
   
   mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
     const { name, arguments: args } = request.params
     
     switch (name) {
       case 'set_context':
         return await handleSetContext(args, env)
       case 'view_progress':
         return await handleViewProgress(args, env)
       case 'debug_state':
         return await handleDebugState(args, env)
       // ... existing tools
       default:
         throw new Error(`Unknown tool: ${name}`)
     }
   })
   ```

6. **Add error handling**
   ```typescript
   async function handleViewProgress(params: { user_id: string, detail_level?: string }, env: Env) {
     try {
       // ... implementation
     } catch (error) {
       return {
         error: {
           code: 'INTERNAL_ERROR',
           message: 'Failed to fetch progress',
           details: { error: error.message }
         }
       }
     }
   }
   ```

7. **Write tool documentation**
   - Create `docs/mcp-tools-gamification.md`
   - Document each tool with purpose, parameters, examples
   - Include Claude conversation examples

8. **Test tools via Claude conversation**
   ```
   User: Can you check my progress?
   
   Claude: [calls view_progress(user_id="user123")]
   Response: { level: 5, xp_current: 2450, ... }
   
   Claude: You're level 5 with 2,450 XP. You're 550 XP away from level 6!
   You have a Bronze flashcard badge and you're 3/5 on today's quest.
   ```

---

## Testing

**Manual MCP tool testing:**
```bash
# Start MCP server
npm run dev:server

# Test set_context
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "method": "tools/call",
    "params": {
      "name": "set_context",
      "arguments": {
        "user_id": "user123",
        "location": "berlin",
        "character_id": "karl"
      }
    }
  }'

# Test view_progress
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "method": "tools/call",
    "params": {
      "name": "view_progress",
      "arguments": {
        "user_id": "user123",
        "detail_level": "full"
      }
    }
  }'

# Test debug_state
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "method": "tools/call",
    "params": {
      "name": "debug_state",
      "arguments": {
        "user_id": "user123",
        "tables": ["user_progress", "user_badges"]
      }
    }
  }'
```

**Claude conversation testing:**
```
User: Set my location to Berlin with Karl

Claude: [calls set_context]
Done! You're now in Berlin with Karl.

User: What's my progress?

Claude: [calls view_progress]
You're level 5 with 2,450 XP. You have Bronze in flashcards (45/50 toward Silver)
and Grey in dictation (8/10 toward Bronze). You're 3/5 on today's quest.
```

---

## Design References

- **Spec**: API endpoints (OpenAPI tasks define response schemas)
- **MCP Protocol**: https://modelcontextprotocol.io/docs
- **Existing MCP**: `server/mcp/` directory (talk_to_character, visit_location patterns)

---

## Key Design Decisions

**Q: Should tools query real DB or use mock data in M9?**  
A: view_progress uses mock data initially (DB empty in M9). debug_state queries real DB to verify schema works. M10 switches view_progress to real queries.

**Q: Where to store context (location, active character)?**  
A: Options: (1) in-memory session, (2) D1 user_context table, (3) Durable Object. Start with in-memory for M9, upgrade to D1 in M10.

**Q: Should debug_state be admin-only?**  
A: Yes, but no auth in M9. M10+ adds permission check (only admin users can call).

**Q: Pagination for debug_state?**  
A: Not in M9 (tables will be small). Add `limit` parameter in M10+ if needed.

---

## Notes

- These tools enable "conversational testing" during development
- Mock data validates tool structure before backend fully implemented
- debug_state is critical for troubleshooting during M10-M14
- Tools provide foundation for future gameplay MCP tools (talk_to_character, visit_location, play_minigame)
- Response schemas must match OpenAPI exactly (enables code generation later)
