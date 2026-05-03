import { FileStore } from "../../adapters/file-store/file-store.js";
import { PostgresStore } from "../../adapters/postgres-store/postgres-store.js";
import type { SovrynConfig } from "../config.js";
import type { Store } from "./types.js";

export function createStore(root: string, config?: SovrynConfig): Store {
  if (config?.storage.driver === "postgres")
    return new PostgresStore(root, config);
  return new FileStore(root);
}
