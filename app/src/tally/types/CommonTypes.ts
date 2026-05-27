

export interface DisplayName {
    long: string;
    short?: string;
}

// TODO: Add CONNECTING (and even DISCONNECTING?) states?
export enum ConnectionState {
    DISABLED = "Disabled",
    OFFLINE = "Offline",
    ONLINE = "Online",
    ERROR = "Error"
}

export type WithRequired<T, K extends keyof T> = Partial<T> & Required<Pick<T, K>>;
