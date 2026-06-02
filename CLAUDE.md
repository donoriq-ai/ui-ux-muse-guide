# CLAUDE.md

See [`AGENTS.md`](./AGENTS.md) at the repository root. It is the single source of truth for
all AI coding agents on this project; everything that applies to Cursor, Codex, or any
other agent applies to Claude Code too.

## Claude Code-specific notes

- If a task is a repeatable procedure (e.g. "encode a new rule", "add a new document type",
  "scaffold a new endpoint matching `mockApi.ts`"), prefer writing it as a `SKILL.md` under
  `.claude/skills/` rather than expanding `AGENTS.md`. Keep `AGENTS.md` general; put
  procedures in skills.
- All non-negotiable constraints in `AGENTS.md` apply unchanged.
