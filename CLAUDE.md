# Tinker — Claude Code Standing Instructions

## Project
Fantasy basketball companion app. Linear workspace: Tinker. Ticket prefix: TKR.

## Linear Update Protocol (MANDATORY)

You MUST update Linear at every significant action. No exceptions.

### When to update Linear
| Event | Action |
|---|---|
| Starting a ticket | Move status → In Progress |
| Created a new file | Comment on ticket: file name + purpose |
| Completed a feature or function | Comment: what was built, key decisions made |
| Hit a blocker or error | Comment: error description + what you tried |
| Made a git commit | Comment: commit hash + summary |
| Ticket work complete | Move status → In Review, comment with summary of all changes |
| Discovered a bug or missing spec | Create a new ticket or comment on existing one |

### Comment format (keep it tight)
**[Action] [file or feature]**
- What: one sentence
- Why: one sentence if non-obvious
- Next: what comes after this (if known)

### How to find the right ticket
Always check Linear at session start: search by ticket number (e.g. TKR-3) or current status = Ready/In Progress.

## Token Efficiency Rules
- Never dump full file contents into responses unless asked
- Work one ticket at a time
- If a ticket is ambiguous, comment the question on the Linear ticket and stop — do not guess
- Read the ticket description fully before writing any code
