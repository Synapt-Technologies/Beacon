import { AedesEventServer } from "./eventServer/AedesEventServer";
import { EventServer, LightState } from "./eventServer/EventServer";
import { AtemSwitcherConnection } from "./switcherConnection/AtemSwitcherConnection";
import { SwitcherConnection, SwitcherTallyState } from "./switcherConnection/switcherConnection";


export interface BeaconServerConfig {
    name: string;
}

const defaultConfig: BeaconServerConfig = {
    name: "Beacon Server"
};


// TODO: Multithreaded?
// TODO: Multiple switcher connections?
// TODO: Multiple event servers?
export class BeaconServer {

    private switcherConnection: SwitcherConnection;
    private eventServer: EventServer;

    private config: BeaconServerConfig;

    private lightState: LightState = {
        alert: [],
        program: [],
        preview: []
    };

    constructor(config: BeaconServerConfig) {
        this.config = { ...defaultConfig, ...config };

        this.switcherConnection = new AtemSwitcherConnection({
            name: this.config.name+"::SWTCH::ATEM",
            host: "127.0.0.1"
        });

        this.eventServer = new AedesEventServer({
            name: this.config.name+"::EVENT::AEDES",
            port: 1883,
            serve_http: true,
            serve_ws: true
        });

        this.switcherConnection.on('tally_update', (tallydata: SwitcherTallyState) => {
        
            this.lightState = {
                alert: [],
                program: tallydata.program,
                preview: tallydata.preview
            }
        
            this.eventServer.broadcastTally(this.lightState);
        });

        this.eventServer.on('subscribe', () => {
            this.eventServer.broadcastTally(this.lightState);
        });
        
        setInterval(() => {
            this.eventServer.broadcastTally(this.lightState);
        }, 2000);
    }
    
    init() {

        this.eventServer.init();
        this.switcherConnection.connect();
    }
    
}