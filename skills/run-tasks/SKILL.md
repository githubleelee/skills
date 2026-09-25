---
name: run-tasks
description: Execute a reviewed task list across its dependency frontier, coordinate parallel work, verify outcomes, and report progress.
disable-model-invocation: true
---

# Run Tasks

Carry a `to-tasks` Markdown file through its dependency graph, with the main agent coordinating each wave.

1. **Preview and authorize.** Read the task file and relevant brief. From this skill's directory, run `node ../to-tasks/scripts/check-tasks.mjs <absolute-task-file>`; use `--stdin` to check a revised draft before saving. Resolve checker errors with the user, then present the scope, initial ready tasks and simultaneous-start groups, proposed parallel work, shared-resource risks, and verification approach. Get one approval for this run, including status and `Blocker` updates within the agreed scope. Ask for decisions on scope changes or consequential external actions.

2. **Execute the frontier.** Resume unblocked `in progress` tasks and select `not started` tasks from the checker's ready set and simultaneous-start groups. Assign each task once per wave. Start a simultaneous SS group in one validated status update. Run independent work in parallel through available agents or tools when write scopes and resources can be separated; sequence conflicting work. Give each executor its task outcome and `Done when` criterion. The main agent coordinates integration and owns updates to the task file. Validate and save each status update, then recalculate the frontier.

3. **Verify and handle impediments.** Verify each task against its `Done when` criterion with task-appropriate evidence. Check completion dependencies before marking it `done`; revisit work awaiting an FF or SF predecessor. Record an execution impediment as `Blocker: <reason>` alongside its current status, validate the update, report it to the user immediately, and continue unaffected tasks. Revisit and clear blockers when their causes resolve. After parallel work, integrate changes and run the relevant shared checks.

4. **Report each wave.** Tell the user what finished, verification evidence, impediments, and the new ready frontier; continue without waiting for a reply within the approved scope. When the graph is complete, verify the overall goal and report the result. If overall verification fails, reopen the affected tasks with concrete blockers. When no executable work remains, report remaining tasks, blockers, and decisions needed. Leave Git commit decisions to the user or project policy.
