# Demo Script

1. Install and build Sovryn:

   ```bash
   npm install
   npm run build
   ```

2. Initialize a clean repository:

   ```bash
   node dist/cli.js init --json
   ```

3. Run the beta demo:

   ```bash
   node dist/cli.js beta demo --json
   ```

4. Check readiness:

   ```bash
   node dist/cli.js beta check --json
   ```

5. Package curated public evidence:

   ```bash
   node dist/cli.js beta package --json
   ```

6. Review `.sovryn/beta/package/`.

No command performs real GitHub publication. Sovryn does not file legal patents
or provide legal patentability opinions.
