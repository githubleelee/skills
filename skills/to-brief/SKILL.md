---
name: to-brief
description: Turn the current discussion into an actionable lightweight plan, review it with the user, and save it in the project.
disable-model-invocation: true
---

# To Brief

Synthesize the current discussion into a concise plan the user can act on.

1. **Gather context.** Identify the goal, agreed decisions, constraints, and relevant project facts. Inspect project materials when the plan depends on them. Ask about choices that materially change the approach; mark other uncertainties as assumptions or open questions.
2. **Draft for review.** Present the plan in the user's language. Adapt its structure to the task: state the desired outcome, ordered actions, useful completion checks, and relevant boundaries or uncertainties. Propose a save path. Revise the draft with the user until they approve both its content and destination.
3. **Save.** Follow the project's existing plan-document convention; otherwise use `docs/plans/<topic>.md` with a short, readable filename. Ask for a location when the project is unclear. If the destination exists, read it and agree with the user on how to update it. Save the approved plan and report its path.
