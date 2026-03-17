import { Atem, AtemState } from "atem-connection";
import { EventEmitter } from "events";

export interface AtemConnectionEvents {
  connected: (tallyState: AtemConnection.AtemTallyState) => void;
  update: (tallyState: AtemConnection.AtemTallyState) => void;
  disconnected: (tallyState: AtemConnection.AtemTallyState) => void;
}

export declare interface AtemConnection {
  on<U extends keyof AtemConnectionEvents>(
    event: U, listener: AtemConnectionEvents[U]
  ): this;

  emit<U extends keyof AtemConnectionEvents>(
    event: U, ...args: Parameters<AtemConnectionEvents[U]>
  ): boolean;
}

export class AtemConnection extends EventEmitter {
  
  atem: Atem;

  private _ip: string = "192.168.10.240";

  tallyState: AtemConnection.AtemTallyState = {alert: [], program: [], preview: [], status: 0, state: undefined};

  constructor(){
    super();

    this.atem = new Atem();

    this.atem.on('info', (data) => {
      this.logPrefix("INFO", data);
      this._parseAtem();
    });
    this.atem.on('error', (data) => {
      this.logPrefix("ERROR", data)
      this._parseAtem();
    });

    this.atem.on('connected', () => {
      this.log('CONNECTED');
      this._parseAtem();
      this.emit('connected', this.tallyState);
    })

    this.atem.on('stateChanged', (state, pathToChange) => {
      this.logPrefix('UPDATE', pathToChange);
      this._parseAtem();
    })
  }

  setIp(ip: string){
    this._ip = ip;
  }

  connect(){
    this.atem.connect(this._ip);
  }

  disconnect(){
    this.atem.disconnect();
  }

  getState(){
    this._parseAtem();
    return this.tallyState;
  }

  private _parseAtem(){
    this.tallyState.program = this.atem.listVisibleInputs("program");
    this.tallyState.preview = this.atem.listVisibleInputs("preview");

    console.log(this.tallyState.program, this.tallyState.preview);
    
    this.tallyState.status = this.atem.status;
    if(this.atem.status === 2)
      this.tallyState.state = this.atem.state;
    else {
      this.tallyState.state = undefined;
      this.emit('disconnected', this.tallyState);
    }

    // console.log(this.tallyState);

    this.emit('update', this.tallyState);
  }

  private log(data: any){
    console.log("ATEM:", data);
  }
  private logPrefix(prefix: string, data: any){
    console.log("ATEM:", prefix, data);
  }

  private logState(tallyState: AtemConnection.AtemTallyState){
    console.log("ATEM: PRG:", tallyState.program, "PRV:", tallyState.preview);
  }
}

export namespace AtemConnection
{
  export interface AtemTallyState
  {
    alert: Array<number>;
    program: Array<number>;
    preview: Array<number>;
    status: number;
    state: AtemState | undefined;
  }
}