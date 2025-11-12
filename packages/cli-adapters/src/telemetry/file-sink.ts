import path from "node:path";
import { promises as fsp } from "node:fs";
import type { TelemetryEvent, TelemetrySink } from "@kb-labs/core-cli";
import { CliError, CLI_ERROR_CODES } from "@kb-labs/core-cli";

export function createFileTelemetrySink(fileOrDir: string): TelemetrySink {
  // if dir passed, we write into <dir>/cli-telemetry.jsonl
  const target = fileOrDir.endsWith(".jsonl")
    ? fileOrDir
    : path.join(fileOrDir, "cli-telemetry.jsonl");
  return {
    async emit(ev: TelemetryEvent) {
      try {
        const line = JSON.stringify(ev) + "\n";
        await fsp.mkdir(path.dirname(target), { recursive: true });
        await fsp.appendFile(target, line, "utf8");
      } catch (e) {
        throw new CliError(
          CLI_ERROR_CODES.E_TELEMETRY_EMIT,
          `Failed to emit telemetry to ${target}`,
          e,
        );
      }
    },
  };
}
