---
name: context-save
description: "Save session context for eclick One. Captures current git state (branch, status, recent commits), decisions made, remaining work, failed approaches, and TODOs. Saves to .context/sessions/. Optionally commits the session file. Use before context switches, at the end of a session, or when switching to a different task."
---

# /context-save — Save Session

Save the current working context including git state, decisions made, and remaining work.

## Process

### 1. Gather State
```bash
git branch --show-current
git status --short
git log --oneline -5
```

### 2. Capture Decisions
- What are you working on?
- What decisions have been made?
- What is remaining?
- Any failed approaches tried?
- Any TODO notes for next session?

### 3. Save
Write to `.context/sessions/session-<date>-<branch>.md`.

### 4. Commit (optional)
```bash
git add .context/sessions/
git commit -m "chore: save session context"
```

## Output
Path to saved context file and summary of what was saved.
