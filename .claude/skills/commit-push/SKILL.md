---
name: commit-push
description: Commit the last changes and push to GitHub. Usage: /commit-push [message]. If no message provided, generates a commit message from the diff.
tools: Bash
---

# Commit and Push

Commit the last changes and push to GitHub.

## Usage

```
/commit-push [message]
```

## Steps

1. Check git status to see what files have changed:
   ```bash
   cd /Users/sorin.dinu/Work/projects/products && git status --short
   ```

2. If there are no changes (nothing to commit), report: "No changes to commit."

3. Run `git diff` (staged + unstaged) to understand what changed:
   ```bash
   cd /Users/sorin.dinu/Work/projects/products && git diff HEAD
   ```

4. Stage all changes:
   ```bash
   cd /Users/sorin.dinu/Work/projects/products && git add -A
   ```

5. Determine the commit message:
   - If `$ARGUMENTS` is provided, use it as the commit message.
   - If `$ARGUMENTS` is empty, generate a concise commit message based on the diff — summarise what changed and why (1-2 sentences, imperative mood, no "Update files" fallback).

6. Create the commit:
   ```bash
   cd /Users/sorin.dinu/Work/projects/products && git commit -m "$COMMIT_MESSAGE"
   ```

7. Verify the current branch is `develop`. If not, abort and tell the user to switch to `develop` first:
   ```bash
   cd /Users/sorin.dinu/Work/projects/products && git branch --show-current
   ```

8. Push to GitHub:
   ```bash
   cd /Users/sorin.dinu/Work/projects/products && git push origin develop
   ```

9. Report success with the commit hash and branch, or surface any error from git.
