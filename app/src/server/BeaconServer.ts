import { AbstractTallyConsumer } from "./consumer/AbstractTallyConsumer";
import { AedesNetworkTallyConsumer } from "./consumer/networkConsumer/AedesNetworkTallyConsumer";
import { TallyState } from "./types/TallyState";
import { AbstractTallyProducer, ProducerTallyState } from "./producer/AbstractTallyProducer";
import { AtemNetClientTallyProducer } from "./producer/networkProducer/AtemNetClientTallyProducer";


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

    private tallyProducer: AbstractTallyProducer;
    private tallyConsumer: AbstractTallyConsumer;

    private config: BeaconServerConfig;

    private lightState: TallyState = {
        alert: [],
        program: [],
        preview: []
    };

    constructor(config: BeaconServerConfig) {
        this.config = { ...defaultConfig, ...config };

        this.tallyProducer = new AtemNetClientTallyProducer({
            name: "ATEM1",
            parent: this.config.name,
            host: "127.0.0.1"
        });

        this.tallyConsumer = new AedesNetworkTallyConsumer({
            name: "AEDES",
            parent: this.config.name,
            keep_alive_ms: 5000 // TODO: Make a mode to prevent network congestion with low or no keep alive?
        });

        this.tallyProducer.on('tally_update', (tallydata: ProducerTallyState) => {
        
            this.lightState = {
                alert: [],
                program: tallydata.program,
                preview: tallydata.preview
            }
        
            this.tallyConsumer.consumeTally(this.lightState);
        });

        // TODO Add set tally off / alert (setting) on switcher disconnect!

        this.tallyConsumer.on('subscribe', () => {
            this.tallyConsumer.consumeTally(this.lightState);
        });
    }
    
    async init() {

        await this.tallyConsumer.init();
        await this.tallyProducer.init();
    }
    
}