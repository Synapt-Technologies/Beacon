import { HardwareVersion } from "../../../types/SystemInfo";
import type { Gpio } from "pigpio";
import type { ConsumerConfig, ConsumerInfo } from "../../types/ConsumerTypes";
import {
  ConnectionState,
  TallyState,
  type WithRequired,
} from "../../types/CommonTypes";
import { AbstractConsumer } from "../AbstractConsumer";
import {
  ConnectionType,
  DeviceAlertAction,
  DeviceTools,
  TallyDeviceDto,
  type DeviceAddress,
  type DeviceAlertBundle,
  type DeviceKey,
  type DeviceStateBundle,
} from "../../types/DeviceTypes";

// TODO: Populate this. Pinouts?

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface RpiGpioConsumerConfig extends ConsumerConfig {
  // Pin mappings TBD
  hw_version: HardwareVersion; // TODO: Auto detect?
}

export interface RpiGpioConsumerInfo extends ConsumerInfo {
  // version: HardwareVersion;
}

export interface GpioTallyPins {
  program: number;
  preview: number;
}

interface GpioTallyOutput {
  program: Gpio;
  preview: Gpio;
}

interface DeviceAlertRuntime {
  action: DeviceAlertAction;
  token: symbol;
  intervalHandle: NodeJS.Timeout;
  timeoutHandle: NodeJS.Timeout | null;
}

interface AlertPatternConfig {
  speedMs: number;
  pattern: Array<TallyState | null>;
}

// TODO: Move to class, make it user configurable and broadcast it to devices (via consumer) to sync patterns.
const ALERT_PATTERNS: Record<DeviceAlertAction, AlertPatternConfig | null> = {
  [DeviceAlertAction.IDENT]: {
    speedMs: 400,
    pattern: [TallyState.PREVIEW, TallyState.PROGRAM],
  },
  [DeviceAlertAction.INFO]: {
    speedMs: 300,
    pattern: [TallyState.PREVIEW, null, null, null],
  },
  [DeviceAlertAction.NORMAL]: {
    speedMs: 400,
    pattern: [TallyState.WARNING, null],
  },
  [DeviceAlertAction.PRIO]: {
    speedMs: 150,
    pattern: [TallyState.PROGRAM, TallyState.WARNING],
  },
  [DeviceAlertAction.CLEAR]: null,
};

const DEFAULT_PINOUT: Record<
  Exclude<HardwareVersion, HardwareVersion.UNKNOWN | HardwareVersion.DOCKER>,
  Array<GpioTallyPins>
> = {
  [HardwareVersion.V2]: [
    // Board BCM numbers, pin numbers in comments:
    { program: 2, preview: 22 }, // 3,  15
    { program: 3, preview: 23 }, // 5,  16
    { program: 4, preview: 24 }, // 7,  18
    { program: 14, preview: 10 }, // 8,  19
    { program: 15, preview: 9 }, // 10, 21
    { program: 17, preview: 25 }, // 11, 22
    { program: 18, preview: 11 }, // 12, 23
    { program: 27, preview: 8 }, // 13, 24
    // { program: 22, preview:  7 }, // 15, 26
    // { program: 23, preview:  5 }, // 16, 29
  ],
  [HardwareVersion.V3]: [],
};

// TODO MOVE ACTUAL HARDWARE CODE TO ANOTHER LIB? OR SOME SORT OF FACTORY TO PARSE HW VERSION?
// TODO: HardwareBus.ts? or HardwareConsumer that uses a factory to get the right outputs?

// TODO: Add intermediary AbstractLocalConsumer that handles the alert pattern timers etc.
export class RpiGpioHardwareConsumer extends AbstractConsumer {
  declare protected _config: RpiGpioConsumerConfig; // Declare to indicate it overwrites the parent's type.

  public static readonly DefaultConfig: Omit<
    RpiGpioConsumerConfig,
    "hw_version"
  > = {
    id: "rpigpio",
    name: "Hardware Consumer",
  };

  protected _getDefaultConfig(): Omit<RpiGpioConsumerConfig, "hw_version"> {
    return RpiGpioHardwareConsumer.DefaultConfig;
  }

  declare protected _info: RpiGpioConsumerInfo;

  constructor(config: WithRequired<RpiGpioConsumerConfig, "hw_version">) {
    super(config);
    this._info = {
      ...this._info,
      // version: this.getHardwareVersion(),
    };
  }

  protected _checkConfig(config: RpiGpioConsumerConfig) {
    super._checkConfig(config);

    if (config.hw_version == null || config.hw_version !== HardwareVersion.V2) {
      this._logger.fatal(
        `Invalid hardware version. Only Beacon v2 is supported.`,
      );
    }
  }

  protected _gpioMap: Map<DeviceKey, GpioTallyOutput> = new Map();
  protected _gpioCache: Map<DeviceKey, TallyState> = new Map();
  protected _deviceCache: Map<DeviceKey, TallyState> = new Map();
  protected _activeAlerts: Map<DeviceKey, DeviceAlertRuntime> = new Map();

  async _init(): Promise<void> {
    // TODO: This check is double, as it is also in _checkConfig. Decide if this, or the one in _checkConfig should be removed.
    if (
      this._config.hw_version == null ||
      this._config.hw_version !== HardwareVersion.V2
    ) {
      return this._logger.fatal(
        `Invalid hardware version. Only Beacon v2 is supported.`,
      );
    }

    const pinMap = DEFAULT_PINOUT[this._config.hw_version];

    // TODO add check if pinmap is valid?
    try {
      const pigpio = await import("pigpio");
      const Gpio = pigpio.default.Gpio;

      for (let i = 0; i < pinMap.length; i++) {
        const address: DeviceAddress = {
          consumer: this._config.id,
          device: String(i),
        };
        const key = DeviceTools.toKey(address);

        const pins = pinMap[i];

        const gpioPins: GpioTallyOutput = {
          program: new Gpio(pins.program, { mode: Gpio.OUTPUT }),
          preview: new Gpio(pins.preview, { mode: Gpio.OUTPUT }),
        };

        this._gpioMap.set(key, gpioPins);

        const storedDevice = this.getDevice(address);

        if (!storedDevice) {
          const newDevice: TallyDeviceDto = new TallyDeviceDto({
            id: address,
            info: {
              label: `GPIO Pins ${i + 1}@${pins.program}/${pins.preview}`,
              model: `Raspi-GPIO`,
              connection: ConnectionType.LOCAL,
              firmware: {
                type: "Beacon-Base",
                // TODO: Add beacon version.
              },
            },
          });

          this.addDevice(newDevice);
          this._logger.info(
            `Added new GPIO device with address ${key} and pins PRGM:${pins.program} / PRVW:${pins.preview}`,
          );
        }
      }

      //TODO: Delete other devices?

      this._info.state = ConnectionState.ONLINE;
      this._emitInfoUpdate();
      this._logger.info(
        "Initialised GPIO running on version:",
        this._config.hw_version,
      );
    } catch (e) {
      this._info.state = ConnectionState.FAILED;
      this._emitInfoUpdate();
      this._logger.error(
        "Failed initialising GPIO. Entering FAILED state. Error:",
        e,
      );
      await this._destroy();
    }
  }

  protected _addDevice(newDevice: TallyDeviceDto, override?: boolean): void {
    const key = newDevice.toKey();
    this._deviceCache.set(key, TallyState.NONE);
  }

  async _destroy(): Promise<void> {
    this._activeAlerts.forEach((_runtime, key) => {
      this._clearDeviceAlert(key, false);
    });

    this._gpioMap.forEach((output) => {
      output.program.digitalWrite(0);
      output.preview.digitalWrite(0);
    });
    this._logger.info("Cleared GPIO outputs.");
    try {
      const pigpio = await import("pigpio");

      if (pigpio.default && pigpio.default.terminate) {
        pigpio.default.terminate();
        this._logger.info("GPIO Consumer destroyed.");
      } else {
        this._logger.warn("Could not destroy PIGPIO");
      }
    } catch (e) {
      this._logger.error("Failed to terminate pigpio:", e);
    }
  }

  private _setGpio(key: DeviceKey, state: TallyState): boolean {
    const output = this._gpioMap.get(key);

    if (!output) {
      this._logger.error(
        "Attempted to send tally to device with an unknown or invalid GPIO! Device:",
        key,
        "State:",
        state,
      );
      return false;
    }

    if (this._gpioCache.get(key) === state) {
      this._logger.debug(
        `Skipping GPIO write for device (state unchanged):`,
        key,
        "State:",
        state,
      );
      return true;
    }

    // output.program.pwmWrite(128); // TODO

    // TODO: Make an option to flatten states, mapping impossible states onto other states.
    try {
      switch (state) {
        case TallyState.PROGRAM:
          output.program.digitalWrite(1);
          output.preview.digitalWrite(0);
          break;
        case TallyState.PREVIEW:
          output.program.digitalWrite(0);
          output.preview.digitalWrite(1);
          break;
        case TallyState.DANGER: // TODO: Maybe different state? No PWM though, not sure if possible.
        case TallyState.WARNING:
        case TallyState.INFO:
        case TallyState.LIGHT:
          output.program.digitalWrite(1);
          output.preview.digitalWrite(1);
          break;
        default:
          output.program.digitalWrite(0);
          output.preview.digitalWrite(0);
      }
    } catch (e) {
      this._logger.error(
        "Failed to write GPIO state for device:",
        key,
        "State:",
        state,
        "Error:",
        e,
      );
      return false;
    }

    this._gpioCache.set(key, state);
    this._logger.debug(`Set GPIO for state ${state}:`, output);
    return true;
  }

  protected _sendDeviceState(bundle: DeviceStateBundle): void {
    if (this._gpioMap.size <= 0) {
      this._logger.warn(
        "Discarding Tally: Attempted to send with an empty GPIO map. Probably not initialised.",
      );
      return;
    }

    const key = DeviceTools.toKey(bundle.id);
    this._deviceCache.set(key, bundle.data.state);

    if (this._activeAlerts.has(key)) {
      this._logger.debug(
        `Skipping GPIO tally write for alerting device:`,
        bundle.id,
      );
      return;
    }

    this._setGpio(key, bundle.data.state);
  }

  protected _sendDeviceAlert(bundle: DeviceAlertBundle): void {
    const key = DeviceTools.toKey(bundle.id);
    const device = this._devices.get(key);

    if (!device) {
      this._logger.debug(
        `Attempted to set alert for unknown device, skipping:`,
        bundle.id,
      );
      return;
    }

    const action = bundle.data.alert.action;
    const timeout = bundle.data.alert.timeout ?? 0;

    if (bundle.data.alert.action === DeviceAlertAction.CLEAR) {
      this._clearDeviceAlert(key, true);
      return;
    }

    const alertConfig = ALERT_PATTERNS[action];

    if (!alertConfig) {
      this._logger.warn(
        `Unsupported alert type for GPIO: ${bundle.data.alert.action}`,
      );
      return;
    }

    this._clearDeviceAlert(key, false);

    const alertToken = Symbol("gpio-alert");
    let stepIndex = 0;
    const tick = () => {
      const runtime = this._activeAlerts.get(key);

      // Ignore stale timer callbacks from a previous alert lifecycle.
      if (!runtime || runtime.token !== alertToken) {
        return;
      }

      const patternValue = alertConfig.pattern[stepIndex];
      const currentDeviceState = this._getCachedDeviceState(key);
      const state = patternValue === null ? currentDeviceState : patternValue;
      this._setGpio(key, state);
      stepIndex = (stepIndex + 1) % alertConfig.pattern.length;
    };

    const intervalHandle = setInterval(tick, alertConfig.speedMs);
    const timeoutHandle =
      timeout > 0
        ? setTimeout(() => {
            const runtime = this._activeAlerts.get(key);
            if (!runtime || runtime.token !== alertToken) {
              return;
            }
            this._clearDeviceAlert(key, true);
            this._logger.debug(`Alert timeout reached for device:`, key);
          }, timeout)
        : null;

    this._activeAlerts.set(key, {
      action,
      token: alertToken,
      intervalHandle,
      timeoutHandle,
    });

    tick();

    this._logger.debug(
      `Set alert ${DeviceAlertAction[action]} for device:`,
      key,
      `timeout:`,
      timeout,
    );
  }

  private _getCachedDeviceState(key: DeviceKey): TallyState {
    return this._deviceCache.get(key) ?? TallyState.NONE;
  }

  private _setGpioToCachedDeviceState(key: DeviceKey): void {
    const state = this._getCachedDeviceState(key);
    this._setGpio(key, state);
  }

  private _clearDeviceAlert(key: DeviceKey, restoreTally: boolean): void {
    const runtime = this._activeAlerts.get(key);

    if (!runtime) {
      if (restoreTally) {
        this._setGpioToCachedDeviceState(key);
      }
      return;
    }

    clearInterval(runtime.intervalHandle);
    if (runtime.timeoutHandle) {
      clearTimeout(runtime.timeoutHandle);
    }

    this._activeAlerts.delete(key);

    if (restoreTally) {
      this._setGpioToCachedDeviceState(key);
    }
    this._logger.debug(`Cleared alert for device:`, key);
  }
}
