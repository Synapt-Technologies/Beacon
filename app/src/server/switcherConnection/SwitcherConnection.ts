
export interface SwitcherConfig {
    name: string;
    host: string;
}

export interface SwitcherTallyState {
    program: Array<number>;
    preview: Array<number>;
}

export interface SwitcherInfo {
    name: string;
}

export interface SwitcherConnection {
    setConfig(config: SwitcherConfig): void;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
    getSwitcherState(): any;
}