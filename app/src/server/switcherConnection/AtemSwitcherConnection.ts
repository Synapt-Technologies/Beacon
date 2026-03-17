import { SwitcherConnection, SwitcherConfig } from "./SwitcherConnection.ts";
// import { Atem, AtemState } from "atem-connection";

interface AtemSwitcherConfig extends SwitcherConfig {
    me: number;
}

export class AtemSwitcherConnection implements SwitcherConnection {
    setConfig(config: AtemSwitcherConfig): void {
    
    }
    connect(): Promise<void> {
        return Promise.resolve();
    }
    disconnect(): Promise<void> {
        return Promise.resolve();
    }
    isConnected(): boolean {
        return true;
    }
    getSwitcherState(): any {
        return {};
    }
}