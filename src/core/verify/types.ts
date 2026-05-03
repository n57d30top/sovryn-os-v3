export type VerifyCommandResult = {
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  passed: boolean;
};

export type VerifyResult = {
  commands: string[];
  results: VerifyCommandResult[];
  passed: boolean;
  reason: "NO_VERIFY_COMMANDS" | null;
};
