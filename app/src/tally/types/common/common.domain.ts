export interface DisplayName {
  long: string;
  short?: string;
}

// TODO: Add CONNECTING state?
export enum ConnectionState {
  DISABLED = "Disabled",
  OFFLINE = "Offline",
  ONLINE = "Online",
  ERROR = "Error",
  FAILED = "Failed",
}

export enum TallyState {
  NONE = 0,
  DANGER = 4, // Light redish
  INFO = 8, // bLUE
  WARNING = 12, // Yellow
  LIGHT = 14, // White
  PREVIEW = 16,
  PROGRAM = 20,
}
