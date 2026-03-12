---
name: speckit-taskstoissues
description: Convert tasks from tasks.md into GitHub issues. Use after task breakdown
  to track work items in GitHub project management.
compatibility: Requires spec-kit project structure with .specify/ directory
metadata:
  author: github-spec-kit
  source: templates/commands/taskstoissues.md
---

# Speckit Taskstoissues Skill

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

1. Run the prerequisite script from repo root and parse FEATURE_DIR and AVAILABLE_DOCS list.
   - Bash: `bash .specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks`
   - PowerShell: `powershell -ExecutionPolicy Bypass -File .specify/scripts/powershell/check-prerequisites.ps1 -Json -RequireTasks -IncludeTasks`
   - All paths must be absolute. For single quotes in args like "I'm Groot", use escape syntax: e.g 'I'\''m Groot' (or double-quote if possible: "I'm Groot").
1. Derive the path to **tasks** as `FEATURE_DIR/tasks.md`.
1. Get the Git remote by running:

```bash
git config --get remote.origin.url
```

> [!CAUTION]
> ONLY PROCEED TO NEXT STEPS IF THE REMOTE IS A GITHUB URL

1. For each task in the list, use the GitHub MCP server to create a new issue in the repository that is representative of the Git remote.

> [!CAUTION]
> UNDER NO CIRCUMSTANCES EVER CREATE ISSUES IN REPOSITORIES THAT DO NOT MATCH THE REMOTE URL
