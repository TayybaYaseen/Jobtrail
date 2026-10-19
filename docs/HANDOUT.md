# Session 4 · Lab handout

Today you decide what JobTrail becomes, and write it down so precisely that
an agent could build it. You leave with a `specs/` folder and an
`AGENTS.md` in your JobTrail repo.

## Setup (2 min)

Unzip this kit next to your JobTrail folder, then copy two things in:

```bash
cp -r session4-spec-kit/specs jobtrail/
cp session4-spec-kit/AGENTS.md jobtrail/
```

On Windows Command Prompt, use these two lines instead (or drag the files
across in your file manager):

```
xcopy /E /I session4-spec-kit\specs jobtrail\specs
copy session4-spec-kit\AGENTS.md jobtrail\
```

Then open your `jobtrail` folder and replace everything in `CLAUDE.md` with
this one line. Your repo has a `CLAUDE.md`, so that's the file Claude Code
reads; this line makes it pull in your new `AGENTS.md`:

```
@AGENTS.md
```

---

## Step 1 · Scope v1 together (25 min, whole class)

Your instructor leads this. Keep `MVP_CUT.md` open.

1. **Read** `docs/WISHLIST.md` in your repo. Two minutes, silently.
2. **Vote.** Three votes each, on the requests you'd ship first.
3. **Cut.** As a class, score the top requests in `MVP_CUT.md` and apply the
   five rules. Write a verdict on every row, including "never".
4. **Brief.** Fill in `specs/00-product-brief.md` together, on the screen.
5. **Flows.** Map the Demo Day flow together in `specs/01-user-flows.md`,
   with every screen state.
6. **Get the class copy.** Your instructor posts the finished brief, flow and
   `MVP_CUT.md` in the class chat. Save the first two over
   `specs/00-product-brief.md` and `specs/01-user-flows.md`, and save
   `MVP_CUT.md` into `specs/` too.

When step 1 ends, everyone has the same brief and flow. That's the class spec.

---

## Step 2 · Fork it and make it yours (35 min, on your own)

Now the spec becomes yours. Two choices first:

- **Keep JobTrail as it is**, or **point it at a different audience** (an
  internship tracker for students, a freelance-gig tracker, a scholarship
  tracker). Same code, different brief. Edit the brief's first two sections
  if you change it.
- **Stack:** stay on Node + Express + EJS unless you have a strong reason.
  Your repo already runs on it, and the agent knows it well. If you change
  stack, say so and why in the brief.

Then write:

1. **The AI feature spec**, from `specs/features/_TEMPLATE.md`. Fill in the
   "what done means" section properly: it's the hardest part and the most
   important. For the eval rows, use one real job post you'd apply to and your
   own CV as the inputs. (15 min)
2. **Two to four more feature specs** for your other v1 features. Look at
   `EXAMPLE-salary-range.md` for the level of detail. (10 min)
3. **`AGENTS.md`**: fill in the gaps, and add one convention you learned the
   hard way in Session 3. (5 min)
4. **The agent-readiness check, then commit.** Both below. (5 min)

Not finished at 30 minutes? Run the check and commit anyway. A committed
draft beats a perfect spec that only exists on your screen.

### The agent-readiness check

Before you commit, give each spec to your agent with this prompt:

> Read specs/00-product-brief.md and specs/features/<file>. Don't write any
> code. List everything that's ambiguous, every acceptance criterion you
> couldn't write a test for, and every decision you'd have to guess. Number
> them.

Fix what it finds. Ignore anything that asks for more than v1.

### Save it

```bash
git add specs AGENTS.md CLAUDE.md
git commit -m "Session 4: specs for v1"
```

### Checklist

- [ ] The brief has a "what v1 doesn't do" table with reasons.
- [ ] At least one flow lists empty, loading, error and success for every screen.
- [ ] Three to five feature specs, one of them the AI feature.
- [ ] Every acceptance criterion is a Given / When / Then you could test.
- [ ] Every spec has an "Out of scope" list.
- [ ] The AI spec says what's always true, gives at least five eval examples,
      and says what happens when the AI fails.
- [ ] `CLAUDE.md` is one line: `@AGENTS.md`.

### Challenge Track

- Swap specs with a neighbour. Can you write the first failing test for their
  F1 from the spec alone, without asking them anything? Each question you
  have to ask is a gap in their spec.
- Add a sixth row to your AI spec's eval table that you expect the AI to get
  wrong. What should it do instead?
