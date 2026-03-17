
export interface SwitcherConfig {
    name: string;
    type: string;
    host: string;
}

export interface SwitcherConnection {
    setConfig(config: SwitcherConfig): void;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
    getSwitcherState(): any;
}