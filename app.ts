
// // import { HardwareTally } from './src/HardwareTally';
// import { HardwareTally } from './src/SoftHardwareTally';
// import { Tally } from './src/Tally';
// import { TallyManager } from './src/TallyManager';
// import { WebServer } from './src/WebServer';
// import { SettingLoader } from './src/SettingLoader';

// console.log('Starting Beacon...');


// let settings = new SettingLoader();

// console.log(settings);

// let tallys = [
//   new HardwareTally({'program': 'P1-3',  'preview': 'P1-15'}, 1, 1),
//   new HardwareTally({'program': 'P1-5',  'preview': 'P1-16'}, 2, 2),
//   new HardwareTally({'program': 'P1-7',  'preview': 'P1-18'}, 3, 3),
//   new HardwareTally({'program': 'P1-8',  'preview': 'P1-19'}, 4, 4),
//   new HardwareTally({'program': 'P1-10', 'preview': 'P1-21'}, 5, 5),
//   new HardwareTally({'program': 'P1-11', 'preview': 'P1-22'}, 6, 6),
//   new HardwareTally({'program': 'P1-12', 'preview': 'P1-23'}, 7, 7),
//   new HardwareTally({'program': 'P1-13', 'preview': 'P1-24'}, 8, 8),
//   new Tally([1, 2, 3, 4, 5]),
//   new Tally([2001, 2002]),
//   new Tally([3010, 3020]),
// ]

// let webServer = new WebServer(settings); 

// let tallyManager = new TallyManager(tallys, '192.168.10.15');

// tallyManager.on('update', (data) => {
//   webServer.setData(data);
// });

// tallyManager.settingDisconnectAlert(false);

// tallyManager.start();

// settings.on('set_alert_on_disconnect', (value) => {
//   tallyManager.settingDisconnectAlert(value);
// });


// settings.on('set', (settings) => {

//   tallyManager.settingDisconnectAlert(settings.alert_on_disconnect);
// });


import { BeaconManager } from './src/BeaconManager';

let beacon = new BeaconManager();
// beacon.init();