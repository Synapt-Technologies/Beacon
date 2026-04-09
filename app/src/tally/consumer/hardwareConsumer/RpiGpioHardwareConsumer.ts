import { AbstractConsumer, type ConsumerConfig } from "../AbstractConsumer";
import { ConnectionType, DeviceTallyState, GlobalDeviceTools, type DeviceAddress, type DeviceAlertState, type DeviceAlertTarget, type DeviceId, type TallyDevice } from "../../types/ConsumerStates";
import { Gpio } from "onoff";
import { HardwareVersion } from "../../../types/SystemInfo";

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
    program: Gpio,
    preview: Gpio,
}


const DEFAULT_PINOUT: Record<HardwareVersion, Array<GpioTallyPins>> = {
    [HardwareVersion.UNKNOWN]: [],
    [HardwareVersion.V2]: [
        { program:  3, preview: 15 },
        { program:  5, preview: 16 },
        { program:  7, preview: 18 },
        { program:  8, preview: 19 },
        { program: 10, preview: 21 },
        { program: 11, preview: 22 },
        { program: 12, preview: 23 },
        { program: 13, preview: 24 },
    ],
    
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

    init(): void {
        this.info.version = this.getHardwareVersion();

        if (this.info.version == HardwareVersion.UNKNOWN)
            this.logger.error(`Failed to initialize GPIO. UNKOWN hardware!`);

        const pinMap = DEFAULT_PINOUT[this.info.version];

        try {

            for (let i = 0; i < pinMap.length; i++) {


                const devIndx: DeviceAddress = { // Todo: Helper function?
                    consumer: this.config.id, 
                    device: String(i)
                };
                const storedDevice = this.devices.get(GlobalDeviceTools.create(devIndx.consumer, devIndx.device));

                if(!storedDevice){

                    const newDevice: TallyDevice = {
                        id: devIndx,
                        name: {
                            short: "1",
                            long: "Output 1"
                        },
                        connection: ConnectionType.HARDWARE,
                        patch: new Array(),
                        state: DeviceTallyState.NONE,
                    }

                    this._addDevice(newDevice)
                }

                const pins = pinMap[i];

                const gpioPins: GpioTallyOutput = {
                    program:  new Gpio(pins.program, 'out'),
                    preview:  new Gpio(pins.preview, 'out'),
                }

                this.gpioMap.set(GlobalDeviceTools.create(devIndx.consumer, devIndx.device), gpioPins);
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
                    outputs.preview.write(0);
                    outputs.program.write(1);
                    break;
                case DeviceTallyState.PREVIEW:
                    outputs.preview.write(1);
                    outputs.program.write(0);
                    break;
                case DeviceTallyState.DANGER: // TODO: Maybe different state? No PWM though, not sure if possible.
                case DeviceTallyState.WARNING:
                    outputs.preview.write(1);
                    outputs.program.write(1);
                    break;
                default:
                    outputs.preview.write(0);
                    outputs.program.write(0);
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