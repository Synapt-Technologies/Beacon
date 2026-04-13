import fs from 'fs';
import pkg from '../../package.json' with { type: 'json' };
import { HardwareVersion, type SystemInfo } from '../types/SystemInfo';
import { Logger } from '../logging/Logger';

const PI_MODEL_NO = [ // TODO: Make a record.
    // https://www.raspberrypi.com/documentation/computers/processors.html
    'BCM2708', // Base family of the BCM2835.
    'BCM2709', 
    'BCM2710', // Pi Zero v2
    'BCM2835', // Pi 1B, 1B+, 1A, 1A+, Compute module 1 and Zero (v1)
    'BCM2836', // Pi 2B
    'BCM2837', // Pi 3, 3+, 3A+, Compute module 3 and 3+ (and later Raspberry Pi 2)
    'BCM2837B0', // Pi 3B+ and 3A+
    'BCM2711', // Pi 4B
    'BCM2712' // Pi 5
];


export default class SystemInfoUtil {

    protected static logger = new Logger(["System", "InfoUtil"]);

    static isPi() {
        try {
            const cpuInfo: string = fs.readFileSync('/proc/cpuinfo', { encoding: 'utf8' });

            // const model = cpuInfo
            //     .split('\n')
            //     .map(line => line.replace(/\t/g, ''))
            //     .filter(line => line.length > 0)
            //     .map(line => line.split(':'))
            //     .map(pair => pair.map(entry => entry.trim()))
            //     .filter(pair => pair[0] === 'Hardware')

            // this.logger.debug(`Hardware model: ${model[0][1]}`);
            
            const devtreeModel = fs.readFileSync('/sys/firmware/devicetree/base/model', { encoding: 'utf8' });

            this.logger.debug(`Device tree model: ${devtreeModel}`);

            // if (!model || model.length == 0) {
            //     return false;
            // }


            // const processor = model[0][1];
            // return PI_MODEL_NO.indexOf(processor) > -1;
            return false;

        } catch (e) {
            this.logger.debug(`Error reading /proc/cpuinfo: ${e}`);
            // if this fails, this is probably not a pi
            return false;
        }

    }

    static getHwModel(): HardwareVersion {
        try { // TODO double try. Might be needed when checking GPIO
            if (!SystemInfoUtil.isPi())
                return HardwareVersion.UNKNOWN;

            // Check GPIO pin config for newer versions.

            return HardwareVersion.V2;
        } catch (e) {
            // if this fails, this is probably not a pi
            return HardwareVersion.UNKNOWN;
        }
    }

    static getFirmwareVersion(): string {
        try {
            return pkg.version;
        } catch (e) {
            return 'Unknown';
        }
    }

    static getSystemInfo(): SystemInfo {
        return {
            hardware: SystemInfoUtil.getHwModel(),
            firmware: SystemInfoUtil.getFirmwareVersion()
        }
    }
}