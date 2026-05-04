# Run External Research

Sovryn supports safe external research flows that build custom tools, provision
approved packages, run Node Alpha validation, and produce corpus-ready evidence.

Fixture-backed public beta demo:

```bash
npm run demo:public-beta
```

Single external run:

```bash
node dist/cli.js external-research run energy-record-auditor --profile container-netoff --fixture-install --json
```

Real-source campaign:

```bash
node dist/cli.js external-research campaign real-sources --domains 3 --json
```

Safety boundaries:

- no hazardous or exploitative goals,
- no raw logs in public packages,
- no secrets or local absolute paths in public output,
- no legal patentability or freedom-to-operate claims,
- no silent fallback from container profiles to host execution.
