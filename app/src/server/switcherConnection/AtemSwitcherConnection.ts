import { SwitcherConnection, SwitcherConfig, SwitcherInfo, SwitcherTallyState } from "./SwitcherConnection.ts";
import { Atem, AtemState } from "atem-connection";

interface AtemSwitcherConfig extends SwitcherConfig {
    me: number;
}

interface AtemSwitcherInfo extends SwitcherInfo {
    model: string;
    state: AtemState;
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