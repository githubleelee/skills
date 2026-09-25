# Skills

Three lightweight Pi skills for planning and executing work:

| Skill | Purpose |
| --- | --- |
| `to-brief` | Turn a discussion into a reviewed, actionable plan. |
| `to-tasks` | Split a plan into verifiable tasks with typed dependencies and a validated execution frontier. |
| `run-tasks` | Execute the task graph, coordinate parallel work, verify results, and report progress. |

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
