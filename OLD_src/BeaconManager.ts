import { Tally } from './Tally';
import { TallyManager } from './TallyManager';
import { WebServer } from './WebServer';
import { SettingLoader } from './SettingLoader';

export class BeaconManager {

  private settings: SettingLoader;
  private webServer: WebServer;
  private tallyManager: TallyManager;

  constructor() {
    this.settings = new SettingLoader();

    this.tallyManager = new TallyManager();

    // this.tallyManager.setTallys(tallys);

    this.webServer = new WebServer(this.settings);

    this.settings.on('loaded', (config) => {

      this.tallyManager.setIp(config.settings.atem_ip);
      this.tallyManager.settingDisconnectAlert(config.settings.alert_on_disconnect);
      // this.tallyManager.setTallys(tallys);
      this.tallyManager.setTallys(config.tally.tallys);

      this.init();
    });

    this.webServer.on('sourceChange', () => {
      this.tallyManager.update();
    });

    this.settings.load();
  }

  init(){
    this.tallyManager.on('update', (data) => {
      this.webServer.setData(data);
    });

    this.settings.on('set_alert_on_disconnect', (value) => {
      this.tallyManager.settingDisconnectAlert(value);
    });

    this.settings.on('set_atem_ip', (value) => {
      this.tallyManager.connect(value);
    });

    this.tallyManager.connect();
    this.webServer.start();
  }

  getSettings(): SettingLoader {
    return this.settings;
  }
}