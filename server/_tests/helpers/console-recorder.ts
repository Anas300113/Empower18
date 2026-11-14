/**
 * QA-owned console recorder for "no sensitive tokens in logs" assertions.
 */
import { afterEach, vi } from "vitest";

export type ConsoleRecorder = {
  lines: string[];
  /** Start recording console.log/warn/error. Restores originals on afterEach. */
  start: () => void;
};

export function recordConsole(): ConsoleRecorder {
  const lines: string[] = [];

  const stringify = (value: unknown): string => {
    if (typeof value === "string") return value;
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  };

  const record = (level: string) => {
    return (...args: unknown[]) => {
      lines.push(`${level}: ${args.map(stringify).join(" ")}`);
    };
  };

  return {
    lines,
    start() {
      vi.spyOn(console, "log").mockImplementation(record("log"));
      vi.spyOn(console, "warn").mockImplementation(record("warn"));
      vi.spyOn(console, "error").mockImplementation(record("error"));
      afterEach(() => {
        vi.restoreAllMocks();
      });
    },
  };
}
