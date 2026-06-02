import type { DisplayName } from "./common.schema";

export const CommonTools = {
  areDisplayNamesEqual(a: DisplayName, b: DisplayName): boolean {
    return a.long === b.long && a.short === b.short;
  }
} as const;