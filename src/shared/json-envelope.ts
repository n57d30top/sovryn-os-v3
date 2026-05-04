import { nowIso } from "./time.js";
import { toAppError } from "./errors.js";

export const SOVRYN_VERSION = "3.0.0-alpha.14";

export type JsonError = {
  code: string;
  message: string;
  details: Record<string, unknown> | null;
};

export type JsonEnvelope<T extends object | null = object | null> = {
  ok: boolean;
  command: string;
  version: string;
  timestamp: string;
  data: T;
  warnings: string[];
  errors: JsonError[];
  artifactRefs: string[];
};

export function okEnvelope<T extends object | null>(
  command: string,
  data: T,
  options: { warnings?: string[]; artifactRefs?: string[] } = {},
): JsonEnvelope<T> {
  return {
    ok: true,
    command,
    version: SOVRYN_VERSION,
    timestamp: nowIso(),
    data,
    warnings: options.warnings ?? [],
    errors: [],
    artifactRefs: options.artifactRefs ?? [],
  };
}

export function errorEnvelope(
  command: string,
  error: unknown,
): JsonEnvelope<null> {
  const appError = toAppError(error);
  return {
    ok: false,
    command,
    version: SOVRYN_VERSION,
    timestamp: nowIso(),
    data: null,
    warnings: [],
    errors: [
      {
        code: appError.code,
        message: appError.message,
        details: appError.details,
      },
    ],
    artifactRefs: [],
  };
}
