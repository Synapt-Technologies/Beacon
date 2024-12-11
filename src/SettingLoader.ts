

import { Tally } from "./Tally";
import { HardwareTally } from "./SoftHardwareTally";

import { EventEmitter } from "events";

import fs from 'node:fs';
import Conf from 'conf';

export interface SettingLoaderEvents {
  loaded: (settings: SettingLoader.Config) => void;
  set_atem_ip: (value: string) => void;
  set_alert_on_disconnect: (value: boolean) => void;
  network_sources: (value: boolean) => void;
}

export declare interface SettingLoader {
  on<U extends keyof SettingLoaderEvents>(
    event: U, listener: SettingLoaderEvents[U]
  ): this;

  emit<U extends keyof SettingLoaderEvents>(
    event: U, ...args: Parameters<SettingLoaderEvents[U]>
  ): boolean;
}

export class SettingLoader extends EventEmitter {


  // TODO TEST
  // config: SettingLoader.Config = new SettingLoader.Config();
  config: SettingLoader.Config;

  constructor() {
    super();
    
    this.config = new SettingLoader.Config();
  }

  load(): void {

    try {
      const jsonData = fs.readFileSync('config.json', 'utf8');

      const data = JSON.parse(jsonData);

      this.config.settings = Object.assign(this.config.settings, data.settings);
      // this.config.tally = Object.assign(this.config.tally, JSON.parse(data).tally);

      var tallys: Tally[] = [];

      data.tally.forEach((tally, index) => {
        if (tally.hardwareTally) {
          tallys.push(new HardwareTally(tally.outputNums, tally.hardwareId, tally.atemOutput));
        }
        else {
          tallys.push(new Tally(tally.atemOutput));
        }
      });

      this.config.tally.setTallys(tallys);

      console.log('SETTINGS: Loaded: ', this.config);
      console.log('SETTINGS: TALLY1: ', this.config.tally.tallys[0]);
    } catch (e) {
      console.log('SETTINGS: Failed loading. Setting defaults: ', this.config);
      this._save();
    }
    this.emit('loaded', this.config);
  }

  getSettings(): SettingLoader.Settings {
    return this.config.settings;
  }

  set(key: string, value: string): boolean {
    if (this.config.settings == null) return false;

    switch (key) {
      case 'atem_ip':
        this.config.settings.atem_ip = value;
        this.emit('set_atem_ip', this.config.settings.atem_ip);
        break;
      case 'alert_on_disconnect':
        this.config.settings.alert_on_disconnect = (value == 'true') || (value == 'false,true');
        this.emit('set_alert_on_disconnect', this.config.settings.alert_on_disconnect);
        break;
      case 'network_sources':
        this.config.settings.network_sources = (value == 'true') || (value == 'false,true');
        this.emit('network_sources', this.config.settings.network_sources);
        break;
    }
    console.log('Settings updated: ', key, this.config.settings);

    this._save();

    return true
  }

  setTally(tallys: Tally[]): void {
    this.config.tally.tallys = tallys;
    this._save();
  }

  _save(): void {
    fs.writeFileSync('config.json', this.config.toJSON());
  }
};




export namespace SettingLoader
{

  export class Config {
    settings: Settings = new Settings();
    tally: TallySettings = new TallySettings;

    constructor() {
      // this.settings = new Settings();
      // this.tally = new TallySettings();
    }

    toArray(): {[key: string]: any} {
      return {
        'settings': this.settings.toArray(),
        'tally': this.tally.toArray(),
      };
    }

    toJSON(): string {
      return JSON.stringify(this.toArray());
    }
  }

  export class Settings
  {
    atem_ip: string = '192.168.10.240';
    alert_on_disconnect: boolean = false;
    network_sources: boolean = false;

    toArray(): {[key: string]: any} {
      return {
        'atem_ip': this.atem_ip,
        'alert_on_disconnect': this.alert_on_disconnect,
        'network_sources': this.network_sources,
      };
    };

    toJSON(): string {
      return JSON.stringify(this.toArray());
    }
  }

  export class TallySettings {
    tallys: Tally[] = [
      new HardwareTally({'program': 'P1-3',  'preview': 'P1-15'}, 1, 1),
      new HardwareTally({'program': 'P1-5',  'preview': 'P1-16'}, 2, 2),
      new HardwareTally({'program': 'P1-7',  'preview': 'P1-18'}, 3, 3),
      new HardwareTally({'program': 'P1-8',  'preview': 'P1-19'}, 4, 4),
      new HardwareTally({'program': 'P1-10', 'preview': 'P1-21'}, 5, 5),
      new HardwareTally({'program': 'P1-11', 'preview': 'P1-22'}, 6, 6),
      new HardwareTally({'program': 'P1-12', 'preview': 'P1-23'}, 7, 7),
      new HardwareTally({'program': 'P1-13', 'preview': 'P1-24'}, 8, 8),
      new Tally([1,2,3,4]),
      new Tally([5,6]),
      new Tally([3010]),
      new Tally([1000]),
    ];

    constructor() {
    }

    setTallys(tallys: Tally[]) {
      this.tallys = tallys;
    }

    toArray(): Tally[] {

      var tallys: any[] = [];

      this.tallys.forEach((tally, index) => {
        tallys.push(tally.toArray());
      });

      return tallys;
      // return this.tallys;
    }

    toJSON(): string {
      return JSON.stringify(this.toArray());
    }
  }
}
