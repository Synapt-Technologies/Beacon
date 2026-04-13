
export enum HardwareVersion {
    UNKNOWN,
    V2,
    V3
}


export const HARDWARE_VERSION_STRING: Record<HardwareVersion, string> = {
    [HardwareVersion.UNKNOWN]: "Unkown Hardware",
    [HardwareVersion.V2]: "Beacon v2",
    [HardwareVersion.V3]: "Beacon v3",
}

export interface SystemInfo {
    name?: string;
    hardware?: HardwareVersion;
}