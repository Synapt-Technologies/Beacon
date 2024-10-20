import { EventEmitter } from "events";
import { Tally } from './Tally';
import { AtemConnection } from './AtemConnection';

export interface TallyManagerEvents {
  connected: (tallyState: TallyManager.TallyManagerData) => void;
  update: (tallyState: TallyManager.TallyManagerData) => void;
  disconnected: (tallyState: TallyManager.TallyManagerData) => void;
}

export declare interface TallyManager {
  on<U extends keyof TallyManagerEvents>(
    event: U, listener: TallyManagerEvents[U]
  ): this;

  emit<U extends keyof TallyManagerEvents>(
    event: U, ...args: Parameters<TallyManagerEvents[U]>
  ): boolean;
}

export class TallyManager extends EventEmitter {

  tallys: Tally[] = [];
  connection: AtemConnection;

  disconnectAlert: boolean = false;

  idIndex: number = 1;
  
  constructor() {
    super();

    this.connection = new AtemConnection();
    
    this.connection.on('update', (tallyState) => {
      // console.log(this.tallys);
      this._update(tallyState);
      this.emit('update', {tallyData: this.tallys, atemData: tallyState});
    });
    
    this.connection.on('connected', (tallyState) => {
      // console.log(this.tallys);
    });
    
    this.connection.on('disconnected', (tallyState) => {
      // console.log(this.tallys);
    });

  }

  setIp(ip: string){
    this.connection.setIp(ip);
  }

  setTallys(tallys: Tally[]){
    this.idIndex = 1;

    tallys.forEach(tallys => tallys.setId(this.idIndex++));
    this.tallys = tallys;
  }

  connect(ip: string | null = null){
    this.connection.disconnect();
    if(ip) this.connection.setIp(ip);
    this.connection.connect();
  }
  
  stop(){
    this.connection.disconnect();
    this._update(this.connection.getState());
  }

  update(){
    this._update(this.connection.getState());
  }

  _update(tallyState: AtemConnection.AtemTallyState){

    if (tallyState.status !== 2 && this.disconnectAlert) {
      this.tallys.forEach((tally) => {
        tally.setTallyState(Tally.OutputTallyState.alert);
      });

      return;
    }

    this.tallys.forEach((tally) => {
      if(tallyState.program.some((input) => tally.atemOutput.includes(input))){
        tally.setTallyState(Tally.OutputTallyState.program);
      }
      else if(tallyState.preview.some((input) => tally.atemOutput.includes(input))){
        tally.setTallyState(Tally.OutputTallyState.preview);
      }
      else if(tallyState.alert.some((input) => tally.atemOutput.includes(input))){
        tally.setTallyState(Tally.OutputTallyState.alert);
      }
      else {
        tally.setTallyState(Tally.OutputTallyState.off);
      }
    });

    // console.log(this.tallys);
  }

  settingDisconnectAlert(disconnectAlert: boolean){
    this.disconnectAlert = disconnectAlert;
  }

  applySettings(key: string, value: any) {
    switch (key) {
      case 'atem_ip':
        // this.connection.setIp(value);
        break;
      case 'alert_on_disconnect':
        this.disconnectAlert = value;
        break;
    }
  }
}

export namespace TallyManager {
  export interface TallyManagerData {
    tallyData: Tally[];
    atemData: AtemConnection.AtemTallyState | undefined;
  } 
}