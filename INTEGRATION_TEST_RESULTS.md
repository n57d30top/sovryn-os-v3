# Integration Test Results

## Verification Matrix

| Command                                                                                  | Result             | Notes                                                                                                            |
| ---------------------------------------------------------------------------------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `npm run build`                                                                          | passed             | TypeScript build completed.                                                                                      |
| `npm test`                                                                               | passed             | 8,594 tests passed, 0 failed.                                                                                    |
| `npm run format:check`                                                                   | passed             | Prettier reported all matched files formatted.                                                                   |
| `git diff --check`                                                                       | passed             | No whitespace errors.                                                                                            |
| `graphify update .`                                                                      | passed             | Graph updated to 4,254 nodes, 14,380 edges, 46 communities.                                                      |
| `discover-daemon audit --json`                                                           | passed             | `passed: true`; local status remains pre-existing `FUND_FOUND`.                                                  |
| `os closure-audit --json`                                                                | skipped for safety | Existing Fund/closure reconciliation state is not clear; running it could imply capability-state reconciliation. |
| `corpus publish-audit --target-repo /Users/sovryn/Desktop/sovryn-open-inventions --json` | passed             | Target repo clean, allowed remote, no findings.                                                                  |
| `corpus site audit --target-repo /Users/sovryn/Desktop/sovryn-open-inventions --json`    | passed             | 613 indexed/site results, all gates passed.                                                                      |
| `launch v1-rc-check --target-repo /Users/sovryn/Desktop/sovryn-open-inventions --json`   | passed             | `readinessLabel: v1_rc_ready`; all automated RC gates passed.                                                    |

## Preliminary Local Checks

- `npm run build`: passed after code changes.
- `node --test dist/tests/discovery-daemon.test.js`: passed before executor
  caching, 591/591 tests.
- `node --test --test-name-pattern "MechanismPlan|silent search cycle consumes" dist/tests/discovery-daemon.test.js`:
  passed after executor caching, 3/3 selected tests.

## Closure Audit Skip Rationale

`os closure-audit --json` was explicitly conditional on Fund reconciliation
state being clear. It is not clear in this workspace: daemon artifacts contain a
pre-existing Fund state while the prior cartography records stale OS closure
accounting. The command was not run to avoid any accidental capability-state
reconciliation or implied improvement.
