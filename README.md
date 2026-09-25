# Skills

[简体中文](README.zh-CN.md)

Three explicitly invoked Pi skills that take work from a discussion to a plan, a task graph, and execution.

## The skills

### `to-brief` — shape the plan

Turns the current conversation into a concise, actionable plan. It checks relevant project facts, clarifies decisions that would change the approach, and presents a draft for review. After approval, it saves the plan using the project's convention or `docs/plans/<topic>.md`.

### `to-tasks` — map the work

Breaks a discussion or plan into independently verifiable tasks in one Markdown file. Each task has an outcome, a completion check, a status, and typed FS/SS/FF/SF dependencies. Its checker detects infeasible event cycles and reports tasks that can start individually or together. The reviewed list follows the project's convention or goes to `docs/tasks/<topic>.md`.

### `run-tasks` — deliver the work

Takes a reviewed task list through its dependency graph. After one execution preview and approval, the main agent coordinates ready work, runs independent tasks in parallel where practical, verifies each `Done when` criterion, and updates progress. It reports after each wave and immediately reports blockers while continuing unaffected work.

## Install

```bash
pi install git:github.com/githubleelee/skills
```

Run `/reload` in an existing Pi session. All three skills are invoked explicitly:

```text
/skill:to-brief <topic>
/skill:to-tasks <discussion or plan path>
/skill:run-tasks <task file path>
```

You can also copy the directories under `skills/` to `~/.pi/agent/skills/` for a manual installation.

## Task checker

`to-tasks` includes a dependency and status checker. It accepts a Markdown task file or a draft on standard input:

```bash
node skills/to-tasks/scripts/check-tasks.mjs docs/tasks/example.md
node skills/to-tasks/scripts/check-tasks.mjs --stdin < docs/tasks/example.md
```

The checker recognizes FS, SS, FF, and SF relationships, reports infeasible event cycles and status conflicts, and lists individually ready tasks and simultaneous-start groups. It uses only Node.js built-in modules.

Run its tests with:

```bash
node --test skills/to-tasks/scripts/check-tasks.test.mjs
```

## License

MIT — see [LICENSE](LICENSE).
