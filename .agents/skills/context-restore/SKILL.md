---
name: context-restore
description: "Restore a saved session context. Lists available sessions from .context/sessions/, reads the selected one to understand previous work state (decisions, remaining work, failed approaches), checks current git state, and resumes from where the session was saved. Use when returning to a task after a context switch."
---

# /context-restore — Restore Session

Resume work from a previously saved context.

## Process

### 1. List Available Sessions
```bash
ls .context/sessions/
```

### 2. Read the Session File
Read the selected session file to understand:
- What was being worked on
- What decisions were made
- What is remaining
- Any failed approaches

### 3. Check Git State
```bash
git branch --show-current
git status --short
```

### 4. Resume
Continue from where the session was saved.

## Output
Summary of restored context: branch, work in progress, decisions made, next steps.
