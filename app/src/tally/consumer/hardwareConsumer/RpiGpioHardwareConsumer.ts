import { AbstractConsumer, ConsumerStatus, type ConsumerConfig, type ConsumerInfo } from "../AbstractConsumer";
import { ConnectionType, DeviceAlertAction, DeviceTallyState, DeviceAddressDto, type TallyDevice, type DeviceKey, type DeviceTallyBundle, type DeviceAlertBundle } from "../../types/DeviceTypes";
import { HARDWARE_VERSION_STRING, HardwareVersion } from "../../../types/SystemInfo";
import type { Gpio } from 'pigpio';

// TODO: check if this is the right GPIO library. Was rpi-gpio before, but it's not updated.

export interface GpioConsumerConfig extends ConsumerConfig {
    // Pin mappings TBD
    // TODO move hw discovery to another class.
}

export interface GpioConsumerInfo extends ConsumerInfo {
    version: HardwareVersion;
}

export interface GpioTallyPins {
    program: number,
    preview: number,
}

interface GpioTallyOutput {
    program: Gpio,
    preview: Gpio,
}

interface DeviceAlertRuntime {
    type: DeviceAlertAction,
    token: symbol,
    intervalHandle: NodeJS.Timeout,
    timeoutHandle: NodeJS.Timeout | null,
}

interface AlertPatternConfig {
    speedMs: number,
    pattern: Array<DeviceTallyState | null>,
}

const ALERT_PATTERNS: Record<DeviceAlertAction, AlertPatternConfig | null> = {
    [DeviceAlertAction.IDENT]: {
        speedMs: 400,
        pattern: [
            DeviceTallyState.PREVIEW,
            DeviceTallyState.PROGRAM,
        ],
    },
    [DeviceAlertAction.INFO]: {
        speedMs: 300,
        pattern: [
            DeviceTallyState.PREVIEW,
            null,
            null,
            null,
        ],
    },
    [DeviceAlertAction.NORMAL]: {
        speedMs: 400,
        pattern: [
            DeviceTallyState.WARNING,
            null,
        ],
    },
    [DeviceAlertAction.PRIO]: {
        speedMs: 150,
        pattern: [
            DeviceTallyState.PROGRAM,
            DeviceTallyState.WARNING,
        ],
    },
    [DeviceAlertAction.CLEAR]: null,
};


const DEFAULT_PINOUT: Record<Extract<HardwareVersion, HardwareVersion.V2>, Array<GpioTallyPins>> = {
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
    
}

// TODO MOVE ACTUAL HARDWARE CODE TO ANOTHER LIB? OR SOME SORT OF FACTORY TO PARSE HW VERSION?
// TODO: HardwareBus.ts? or HardwareConsumer that uses a factory to get the right outputs?
export class RpiGpioHardwareConsumer extends AbstractConsumer {
    
    protected readonly conType = "GPIO";
    
    protected info: GpioConsumerInfo = {
        status: ConsumerStatus.OFFLINE,
        device_count: 0,
        version: HardwareVersion.UNKNOWN,
    }
    
    protected gpioMap: Map<DeviceKey, GpioTallyOutput> = new Map();
    
    protected stateCache: Map<DeviceKey, DeviceTallyState> = new Map();
    protected tallyCache: Map<DeviceKey, DeviceTallyState> = new Map();
    
    protected activeAlerts: Map<DeviceKey, DeviceAlertRuntime> = new Map();
    
    public static readonly DefaultConfig: Required<GpioConsumerConfig> = {
        ...AbstractConsumer.DefaultConfig,
        id: "gpio",
        name: "Hardware Consumer",
    };
    
    protected getDefaultConfig(): Required<GpioConsumerConfig> {
        return RpiGpioHardwareConsumer.DefaultConfig;
    }
    
    constructor(config: Partial<GpioConsumerConfig>) {
        super(config);
    }
    
    async init(): Promise<void> {
        this.info.version = this.config.system_info.hardware;
        
        if (!(this.info.version in DEFAULT_PINOUT)) {
            this.info.status = ConsumerStatus.ERROR;
            return this.logger.fatal(`Unsupported hardware version for GPIO Consumer: ${HARDWARE_VERSION_STRING[this.info.version]}. Only Beacon v2 is supported at this time.`);
        }

        const pinMap = DEFAULT_PINOUT[this.info.version as keyof typeof DEFAULT_PINOUT];
        
        try {
            const pigpio = await import('pigpio');
            const Gpio = pigpio.default.Gpio;
            
            for (let i = 0; i < pinMap.length; i++) {
                
                const address = new DeviceAddressDto(this.config.id, String(i));

                const pins = pinMap[i];
                
                const gpioPins: GpioTallyOutput = {
                    program: new Gpio(pins.program, { mode: Gpio.OUTPUT }),
                    preview: new Gpio(pins.preview, { mode: Gpio.OUTPUT }),
                };
                
                this.gpioMap.set(address.toKey(), gpioPins);

                const storedDevice = this.devices.get(address.toKey());

                if(!storedDevice){
                    
                    const newDevice: TallyDevice = {
                        id: address,
                        name: {
                            short: `OUT ${i+1}`,
                            long: `Local ${i+1}`
                        },
                        connection: ConnectionType.LOCAL,
                        patch: new Array(),
                    }
                    
                    this._addDevice(newDevice)
                }
                
            }

            this.info.status = ConsumerStatus.ONLINE;
            this.logger.info('Initialised GPIO running on version:', this.info.version);

        } catch (e) {
            this.info.status = ConsumerStatus.ERROR;
            this.logger.error("Failed initialising GPIO. Error:", e);
            // this.info.status = HardwareStatus.ERROR; // TODO
        }
    }
    
    async destroy(): Promise<void> {
        this.activeAlerts.forEach((_runtime, key) => {
            this.clearDeviceAlert(key, false);
        });
        
        this.gpioMap.forEach((output) => {
            output.program.digitalWrite(0);
            output.preview.digitalWrite(0);
        });
        
        try {
            const pigpio = await import('pigpio');
            
            if (pigpio.default && pigpio.default.terminate) {
                pigpio.default.terminate();
                this.info.status = ConsumerStatus.OFFLINE;
                this.logger.info("GPIO Consumer destroyed and pins reset.");
            }
            else {
                this.logger.warn("Could not destroy PIGPIO");
            }
            
        } catch (e) {
            this.logger.error("Failed to terminate pigpio:", e);
        }
        
    }

    sendDeviceState(bundle: DeviceTallyBundle): void {

        const address = DeviceAddressDto.from(bundle.id).toKey();
        this.tallyCache.set(address, bundle.state);

        if (!this.gpioMap.has(address)) {
            this.logger.warn(`Discarding Tally: Unknown device ID ${bundle.id}.`);
            return;
        }

        if (this.activeAlerts.has(address)) {
            this.logger.debug(`Skipping GPIO tally write for alerting device:`, bundle.id);
            return;
        }

        this._setGpio(address, bundle.state);        
        
    }
    
    private _setGpio(address: DeviceKey, state: DeviceTallyState): void {
        
        const output = this.gpioMap.get(address);
        
        if (!output){
            this.logger.error("Attempted to send tally to device with an unknown or invalid GPIO! Device:", address);
            return;
        }

        if (this.stateCache.get(address) === state) {
            this.logger.debug(`Skipping GPIO write for device (state unchanged):`, address);
            return;
        }

        try {
            
            switch(state){
                case DeviceTallyState.PROGRAM:
                output.program.digitalWrite(1);
                output.preview.digitalWrite(0);
                break;
                case DeviceTallyState.PREVIEW:
                output.program.digitalWrite(0);
                output.preview.digitalWrite(1);
                break;
                case DeviceTallyState.DANGER: // TODO: Maybe different state? No PWM though, not sure if possible.
                case DeviceTallyState.WARNING:
                output.program.digitalWrite(1);
                output.preview.digitalWrite(1);
                break;
                default:
                output.program.digitalWrite(0);
                output.preview.digitalWrite(0);
            }
        }
        catch (e){
            this.logger.error("Failed to write GPIO state for device:", address, "State:", state, "Error:", e);
            return;
        }
        
        this.stateCache.set(address, state);
        
        this.logger.debug(`Set GPIO for state ${state}:`, output);
    }

    sendDeviceAlert(bundle: DeviceAlertBundle): void {

    // setDeviceAlert(address: DeviceAddress, type: DeviceAlertAction, target: DeviceAlertTarget, time: number): void {
        
        const address = DeviceAddressDto.from(bundle.id).toKey();
        const device = this.devices.get(address);

        if (!device) {
            this.logger.warn(`Attempted to set alert for unknown device:`, address);
            return;
        }
        
        if (bundle.action === DeviceAlertAction.CLEAR) {
            this.clearDeviceAlert(address, true);
            this.logger.debug(`Cleared alert for device:`, address);
            return;
        }
        
        const alertConfig = ALERT_PATTERNS[bundle.action];
        
        if (!alertConfig) {
            this.logger.warn(`Unsupported alert type for GPIO: ${bundle.action}`);
            return;
        }
        
        this.clearDeviceAlert(address, false);
        
        const alertToken = Symbol("gpio-alert");
        let stepIndex = 0;
        const tick = () => {
            const runtime = this.activeAlerts.get(address);
            
            // Ignore stale timer callbacks from a previous alert lifecycle.
            if (!runtime || runtime.token !== alertToken) {
                return;
            }
            
            const patternValue = alertConfig.pattern[stepIndex];
            const currentDeviceState = this.tallyCache.get(address) ?? DeviceTallyState.NONE;
            const state = patternValue === null ? currentDeviceState : patternValue;
            this._setGpio(address, state);
            stepIndex = (stepIndex + 1) % alertConfig.pattern.length;
        };
        
        const intervalHandle = setInterval(tick, alertConfig.speedMs);
        const timeoutHandle = bundle.timeout > 0
        ? setTimeout(() => {
            const runtime = this.activeAlerts.get(address);
            if (!runtime || runtime.token !== alertToken) {
                return;
            }
            this.clearDeviceAlert(address, true);
            this.logger.debug(`Alert timeout reached for device:`, address);
        }, bundle.timeout)
        : null;
        
        this.activeAlerts.set(address, {
            type: bundle.action,
            token: alertToken,
            intervalHandle,
            timeoutHandle,
        });
        
        tick();

        this.logger.debug(`Set alert ${DeviceAlertAction[bundle.action]} for device:`, address, `timeout(s):`, bundle.timeout);
    }
    
    private clearDeviceAlert(address: DeviceKey, restoreTally: boolean): void {
        const runtime = this.activeAlerts.get(address);

        if (!runtime) {
            if (restoreTally) {
                const device = this.devices.get(address);
                if (device) {
                    this._setGpio(address, this.tallyCache.get(address) ?? DeviceTallyState.NONE);
                }
            }
            return;
        }
        
        clearInterval(runtime.intervalHandle);
        if (runtime.timeoutHandle) {
            clearTimeout(runtime.timeoutHandle);
        }
        
        this.activeAlerts.delete(address);
        
        if (restoreTally) {
            const restore_state = this.tallyCache.get(address);
            if (restore_state) {
                this._setGpio(address, restore_state);
            }
            else {
                this._setGpio(address, DeviceTallyState.NONE);
            }
        }
    }
}