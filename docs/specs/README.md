# specs/

The plan your agent builds from. Everything in Sessions 5 to 7 starts here:
Session 5 turns each acceptance criterion into a failing test and each spec
into tickets, Session 6 turns the flows into screens, Session 7 hands the
specs to an agent.

| File | What it is |
|---|---|
| `00-product-brief.md` | One page: who it's for, what v1 does and doesn't, the stack |
| `01-user-flows.md` | Two or three journeys, step by step, with every screen state |
| `features/F1-*.md` … | One file per v1 feature, from `features/_TEMPLATE.md` |
| `features/EXAMPLE-salary-range.md` | A finished example. Not part of v1; delete it when you're done |

Name feature files `F1-accounts.md`, `F2-…` and so on. Number them in the
order they'd have to be built: a feature that needs another comes after it.
