
export enum HardwareVersion {
    V2,
    UNKNOWN
}


export interface SystemInfo {
    name?: string;
    version?: HardwareVersion;
}