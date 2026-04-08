import { AbstractConsumer, type ConsumerConfig } from "../AbstractConsumer";
import type { DeviceAddress, DeviceAlertState, DeviceAlertTarget } from "../../types/ConsumerStates";

export interface GpioConsumerConfig extends ConsumerConfig {
    // Pin mappings TBD
}

export class RpiGpioHardwareConsumer extends AbstractConsumer {

    protected readonly conType = "GPIO";

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
        this.logger.warn("GPIO consumer not yet implemented.");
    }

    destroy(): void {}

    setDeviceAlert(_address: DeviceAddress, _type: DeviceAlertState, _target: DeviceAlertTarget): void {
        this.logger.warn("GPIO consumer not yet implemented.");
    }

    protected sendTallyDevice(): void {
        this.logger.warn("GPIO consumer not yet implemented.");
    }
}