# Survivor Yield Comparison

| Comparator                           | Reviewable survivor tasks | Independent tasks | Decision                                               |
| ------------------------------------ | ------------------------: | ----------------: | ------------------------------------------------------ |
| Reject-all                           |                         0 |                 0 | Not useful for finding reviewable candidates.          |
| Receipt-first second-survivor method |                         7 |                 7 | Retains a bounded public-replay survivor set.          |
| Source-family-only evidence          |                         0 |                 0 | Blocked by task-receipt-first and public replay gates. |

This comparison supports bounded triage utility, not a discovery-scored Fund by itself.
