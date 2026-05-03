import type { NodeCapability } from "./node-types.js";

export const NODE_ALPHA_CAPABILITIES: NodeCapability[] = [
  "workspace:create",
  "command:run",
  "logs:stream",
  "artifacts:collect",
  "packages:install",
  "repos:clone",
  "build:test",
  "environment:inspect",
  "capability:request",
];
