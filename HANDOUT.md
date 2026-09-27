# Session 3 · Lab handout

You're the new maintainers of JobTrail. Two rounds. Guided Track = follow the
numbered steps. Challenge Track = the extra tasks at the end of each round.

Before you start (Node.js 22.12 or newer; Node 24 LTS works too):

```bash
npm install
npm test          # on main, expect 3 failing tests: those are Round 2's tickets
```

If npm suggests `npm audit fix`, skip it for today: it changes files and gets
in the way of the lab.

Never used git on this laptop? Tell it who you are once, or your first commit
will fail:

```bash
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

Every command in this handout goes on its own line, so it works the same on
Windows, macOS and Linux. On Windows, if PowerShell says *running scripts is
disabled on this system* when you type `npm`, use Git Bash or Command Prompt
instead, or run this once in PowerShell:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

---

## Round 1 · One task, three tools, stopwatch running (25 min)

**The task (same every time):**

> Add a `GET /api/stats` endpoint that returns how many applications are in
> each stage, for example `{"applied": 2, "screening": 2, ...}`, with every
> stage listed even when its count is 0. Add one test in
> `tests/api/stats.test.js`.

You'll do this task three times, once with each of three tools. Pick any three
you have:

| Tool | Examples |
|---|---|
| Inline completion | Copilot or Cursor suggestions as you type |
| Chat | claude.ai or ChatGPT in the browser, copy-paste |
| In-editor agent | Cursor agent, Copilot agent mode, Claude Code in VS Code |
| Terminal agent | Claude Code in the terminal |

### Each attempt

1. Start a clean branch from the starting point. Change `chat` to the tool's
   name each time, one word, no spaces (`r1-inline`, `r1-chat`, `r1-editor`,
   `r1-terminal`):

   ```bash
   git switch -c r1-chat round-1-start
   ```

2. **Start your stopwatch.**
3. Get the task done using only that tool.
4. Stop the clock when this passes:

   ```bash
   npx vitest run tests/api/stats.test.js
   ```

5. Save the attempt **before** you start the next one:

   ```bash
   git add -A
   git commit -m "round 1: chat"
   ```

6. Fill in your row below, then go back to step 1 with the next tool.

### Worksheet

| Tool | Time to green | How many prompts or fixes? | Every stage listed, even at 0? | Use it for this again? |
|---|---|---|---|---|
| | | | | |
| | | | | |
| | | | | |

**Debrief question:** Which tool won, and would it still win for a task ten
times smaller? Ten times bigger?

### Challenge Track

- Do the task a fourth time **by hand**, no AI. Where did you beat the tools?
- Find a task in this repo that is genuinely faster by hand than with any tool.
  Time it to prove it.

---

## Round 2 · Three bugs in an app you didn't write (40 min)

```bash
git switch main
```

Open `TICKETS.md`. Three bugs, each with a failing test. Your job: fix them,
and be able to explain why each fix is right.

Work through them **in order: #101, #102, #103.** Fixing one can reveal the
next.

### Step 0 · Map the repo (5 min)

Ask your agent:

> Give me a map of this repository: what each folder is for, how a request
> travels from the URL to the page, and where the data comes from.
> Don't change any files.

Then **check one claim it made** by opening the file yourself.

### For each ticket

1. **Save first**, so git can undo anything that goes wrong:

   ```bash
   git add -A
   git commit -m "before #101"
   ```

   If it says *nothing to commit*, that's fine: you're already saved.
2. **Reproduce it.** Run only that ticket's test:

   ```bash
   npx vitest run -t "#101"
   ```

3. **Read the error.** In JavaScript the message comes **first**: the line
   that starts with `TypeError`, `ReferenceError` or similar says *what* went
   wrong. The `at ...` lines under it say *where*, newest first. Find the first
   `at` line that points into `src/` or `scripts/` (`src\` on Windows):
   that's where to start looking. For #101 the error is printed under
   `stderr`, above the failed test. For #102 it's printed right after
   "The digest crashed".
4. **Ask the agent to explain the bug. Don't let it change anything yet.**
   Write its first answer in the worksheet.
5. **Verify the explanation.** An explanation is a hypothesis, not a fact.
   Check one thing it claims: open the file, log a value, look at the page.
6. **Fix it.** You or the agent. Keep the change small.
7. **Run everything.** `npm test`, then `npm run lint`.
8. **Explain the fix in your own words** in the worksheet. If you can't explain
   it, it doesn't count.

### Worksheet

| Ticket | Agent's first explanation | Right or wrong? How did you check? | Your fix (file + one line) | In your own words: what broke and why your fix works |
|---|---|---|---|---|
| #101 | | | | |
| #102 | | | | |
| #103 | | | | |

### Stuck?

Ask your instructor for a hint card. Try steps 3 to 5 first.

### Challenge Track

- Use `git log -p` or `git blame` to find the exact commit that introduced
  each bug.
- Each ticket's test can be passed by a *wrong* fix too. Pick one ticket and
  write a second test that only the right fix passes.
- `CLAUDE.md` is nearly empty. Add the rule that would have stopped one of
  these bugs.
