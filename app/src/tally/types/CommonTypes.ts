

export interface DisplayName {
    long: string;
    short?: string;
}

export enum ConnectionState {
    DISABLED = "Disabled",
    OFFLINE = "Offline",
    ONLINE = "Online",
    ERROR = "Error"
}
