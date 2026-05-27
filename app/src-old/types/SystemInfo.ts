
export enum HardwareVersion {
    UNKNOWN,
    DOCKER,
    V2,
    V3
}


export const HARDWARE_VERSION_STRING: Record<HardwareVersion, string> = {
    [HardwareVersion.UNKNOWN]: "Unknown Hardware",
    [HardwareVersion.DOCKER]: "Docker Image",
    [HardwareVersion.V2]: "Beacon v2",
    [HardwareVersion.V3]: "Beacon v3",
}

export interface SystemInfo {
    name?: string;
    hardware?: HardwareVersion;
    firmware?: string
}