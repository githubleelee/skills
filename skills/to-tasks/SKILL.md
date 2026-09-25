---
name: to-tasks
description: Split a discussion or plan into verifiable tasks with typed dependencies, review the breakdown, and maintain one project task file.
disable-model-invocation: true
---

# To Tasks

Turn the current discussion or a supplied plan into an execution-ready task list.

1. **Understand the work.** Read supplied references and inspect relevant project material when the breakdown depends on it. Identify the desired outcome, agreed constraints, and evidenced progress. Ask about choices that materially change the breakdown; mark other uncertainties. Split work into independently manageable tasks with observable results and completion checks.

2. **Draft the task file.** Give each task a stable `#NN` identifier, observable outcome, completion check, status, and typed predecessor edges. Use this Markdown structure; write task titles, outcomes, and completion checks in the user's language:

   ```md
   ## #01 Task title
   Status: not started
   Outcome: What this task delivers
   Done when: How to tell it is done
   Dependencies: none

   ## #02 Next task
   Status: not started
   Outcome: Next deliverable
   Done when: Observable check
   Dependencies: #01 [FS]
   ```

   Statuses are `not started / in progress / done`. Write every dependency as `#NN [FS|SS|FF|SF]`: predecessor finish/start → this task start/finish. Use evidenced status; initialize the rest as `not started`. Record execution impediments with an optional `Blocker: <reason>` field; clear it when resolved.

3. **Validate each draft and update.** From this skill's directory, feed the complete Markdown to `node scripts/check-tasks.mjs --stdin`; the script also accepts an absolute saved file path. Use its event-level cycle checks, status checks, blocker list, individually ready tasks, and simultaneous-start groups as the source for the **ready-to-start frontier**. Resolve reported conflicts with the user and recheck the revised draft. Run the checker on every status change, including completion.

4. **Review and save.** Present the validated draft, frontier, and proposed path in the user's language. Revise until the user approves its content and destination. Follow the project's task-document convention, or use `docs/tasks/<topic>.md` with a short, readable filename; ask for a location when the project is unclear. Read an existing destination and agree on its update. Save the approved list in one file and report its path.

For later updates, read the task file, keep existing identifiers stable, assign new identifiers to added tasks, validate the proposed changes, and review them with the user before saving. An approved `run-tasks` preview authorizes status and blocker updates throughout that run; report each wave as it progresses.
