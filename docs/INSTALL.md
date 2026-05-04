# Install

Sovryn OS v3 requires Node.js 22 or newer.

```bash
npm install
npm run build
node dist/cli.js --help
```

For local research work, initialize a project repository:

```bash
node dist/cli.js init
```

For the public beta proof path:

```bash
npm run demo:public-beta
```

Docker or Podman improves worker assurance for `container-netoff`, but the
public beta check records availability honestly. It does not silently fall back
from container profiles to host execution.
