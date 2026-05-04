# Public Beta Demo Script

1. Install and build:

   ```bash
   npm install
   npm run build
   ```

2. Run the public beta check:

   ```bash
   node dist/cli.js public-beta check --json
   ```

3. Run the one-command demo:

   ```bash
   npm run demo:public-beta
   ```

4. Inspect:

   ```bash
   cat .sovryn/public-beta/PUBLIC_BETA_READINESS.md
   cat .sovryn/public-beta/PUBLIC_BETA_DEMO_REPORT.md
   ```

The expected result is a dry-run-only corpus publication proof with no real
GitHub push, no raw logs, no secrets, no local absolute paths in public beta
reports, and no legal patentability or freedom-to-operate claims.
