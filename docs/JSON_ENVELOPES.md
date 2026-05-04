# JSON Envelopes

Every command with `--json` returns the same envelope shape:

```json
{
  "ok": true,
  "command": "mission.spawn",
  "version": "3.0.0-alpha.13",
  "timestamp": "2026-05-03T00:00:00.000Z",
  "data": {},
  "warnings": [],
  "errors": [],
  "artifactRefs": []
}
```

Error objects use:

```json
{
  "code": "POLICY_BLOCKED",
  "message": "Finalize blocked by policy.",
  "details": {}
}
```

Human output may change. JSON envelopes are the machine contract.
