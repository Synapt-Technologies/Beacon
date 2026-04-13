import { AbstractConsumer, type ConsumerConfig } from "../AbstractConsumer";
import { ConnectionType, DeviceTallyState, GlobalDeviceTools, type DeviceAddress, type DeviceAlertState, type DeviceAlertTarget, type DeviceId, type TallyDevice } from "../../types/ConsumerStates";
import { HardwareVersion } from "../../../types/SystemInfo";
import { Chip, Line } from 'node-libgpiod';

// TODO: check if this is the right GPIO library. Was rpi-gpio before, but it's not updated.

export interface GpioConsumerConfig extends ConsumerConfig {
    // Pin mappings TBD
    // TODO move hw discovery to another class.
}

export interface GpioConsumerInfo {
    version: HardwareVersion
}

export interface GpioTallyPins {
    program: number,
    preview: number,
}

interface GpioTallyOutput {
    program: Line,
    preview: Line,
}


const DEFAULT_PINOUT: Record<HardwareVersion, Array<GpioTallyPins>> = {
    [HardwareVersion.UNKNOWN]: [],
    [HardwareVersion.V2]: [           // Board pin numbers:
        { program:  2, preview: 22 }, // 3,  15
        { program:  3, preview: 23 }, // 5,  16
        { program:  4, preview: 24 }, // 7,  18
        { program: 14, preview: 10 }, // 8,  19
        { program: 15, preview:  9 }, // 10, 21
        { program: 17, preview: 25 }, // 11, 22
        { program: 18, preview: 11 }, // 12, 23
        { program: 27, preview:  8 }, // 13, 24
        // { program: 22, preview:  7 }, // 15, 26
        // { program: 23, preview:  5 }, // 16, 29
    ],
    [HardwareVersion.V3]: [],
    
}

// TODO MOVE ACTUAL HARDWARE CODE TO ANOTHER LIB? OR SOME SORT OF FACTORY TO PARSE HW VERSION?
// TODO: HardwareBus.ts? or HardwareConsumer that uses a factory to get the right outputs?
export class RpiGpioHardwareConsumer extends AbstractConsumer {

    protected readonly conType = "GPIO";

    protected info: GpioConsumerInfo = { // TODO add to abstract?
        version: HardwareVersion.UNKNOWN,
    }
    
    protected gpioMap: Map<DeviceId, GpioTallyOutput> = new Map();

    public static readonly DefaultConfig: Required<GpioConsumerConfig> = {
        ...AbstractConsumer.DefaultConfig,
        id: "gpio",
        name: "Hardware Consumer",
    };

    protected getDefaultConfig(): Required<GpioConsumerConfig> {
        return RpiGpioHardwareConsumer.DefaultConfig;
    }

    constructor(config: GpioConsumerConfig) {
        super(config);
    }

    async init(): Promise<void> {
        this.info.version = this.getHardwareVersion();

        if (this.info.version == HardwareVersion.UNKNOWN)
            this.logger.error(`Failed to initialize GPIO. UNKOWN hardware!`);

        const pinMap = DEFAULT_PINOUT[this.info.version];

        try {

            let chip;
            try {
                chip = new Chip(4); 
            } catch {
                chip = new Chip(0);
            }

            for (let i = 0; i < pinMap.length; i++) {
                
                const devIndx: DeviceAddress = { 
                    consumer: this.config.id, 
                    device: String(i)
                };
                
                const pins = pinMap[i];

                const programLine = new Line(chip, pins.program);
                const previewLine = new Line(chip, pins.preview);

                // Request the lines as outputs
                programLine.requestOutputMode();
                previewLine.requestOutputMode();

                const gpioPins: GpioTallyOutput = {
                    program: programLine,
                    preview: previewLine
                };

                this.gpioMap.set(GlobalDeviceTools.create(devIndx.consumer, devIndx.device), gpioPins);

                const storedDevice = this.devices.get(GlobalDeviceTools.create(devIndx.consumer, devIndx.device));

                if(!storedDevice){

                    const newDevice: TallyDevice = {
                        id: devIndx,
                        name: {
                            short: `OUT ${i+1}`,
                            long: `Local ${i+1}`
                        },
                        connection: ConnectionType.HARDWARE,
                        patch: new Array(),
                        state: DeviceTallyState.NONE,
                    }

                    this._addDevice(newDevice)
                }

            }

            //TODO: Delete other devices?

            this.logger.info('Initialised GPIO running on version:', this.info.version);

        } catch (e) {
            this.logger.error("Failed initialising GPIO. Error:", e);

        }
    }

    destroy(): void {}

    protected getHardwareVersion(): HardwareVersion {
        return HardwareVersion.V2;
    }

    
    protected sendTallyDevice(device: TallyDevice): void {

        if (this.gpioMap.size <= 0){
            this.logger.warn("Discarding Tally: Attempted to send with an empty GPIO map. Probably not initialised.");
            return;
        }

        const devAddr = GlobalDeviceTools.create(device.id.consumer, device.id.device);
        const outputs = this.gpioMap.get(devAddr);

        if (!outputs){
            this.logger.error("Attempted to send tally to device with an unknown or invalid GPIO! Device:", device);
            return;
        }

        try {

            switch(device.state){
                case DeviceTallyState.PROGRAM:
                    outputs.preview.setValue(0);
                    outputs.program.setValue(1);
                    break;
                case DeviceTallyState.PREVIEW:
                    outputs.preview.setValue(1);
                    outputs.program.setValue(0);
                    break;
                case DeviceTallyState.DANGER: // TODO: Maybe different state? No PWM though, not sure if possible.
                case DeviceTallyState.WARNING:
                    outputs.preview.setValue(1);
                    outputs.program.setValue(1);
                    break;
                default:
                    outputs.preview.setValue(0);
                    outputs.program.setValue(0);
            }

            this.logger.debug(`Set Tally GPIO for device:`, device);

        } catch (e) {
            this.logger.error("Failed sending tally to device:", devAddr, "Error:", e);
        }
       
    }

    setDeviceAlert(address: DeviceAddress, type: DeviceAlertState, target: DeviceAlertTarget): void {

        this.logger.debug(`Set Alert GPIO for address:`, address);
        this.logger.warn(`Atempted alert. Alert is not yet implemented!`);

    }
}