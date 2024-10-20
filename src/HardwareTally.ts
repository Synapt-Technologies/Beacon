import { Tally } from './Tally';
// import { init } from 'raspi';
import { DigitalOutput } from 'raspi-gpio';

export class HardwareTally extends Tally {

  hardwareTally = true;
  hardwareId: number;

  outputNums: {'program': string, 'preview': string};
  outputs: {'program': DigitalOutput, 'preview': DigitalOutput};
  // outputs: {'program': number, 'preview': number};
  
  constructor(pins: {'program': string, 'preview': string}, hardwareId:number, atemOutput: number | number[] = hardwareId) {
    
    super(atemOutput);

    this.outputNums = pins;
    this.outputs = { 'program': new DigitalOutput(pins.program), 'preview': new DigitalOutput(pins.preview) };

    this.hardwareId = hardwareId;

    this._setOutputs();
  }
  
  setTally(program: boolean, preview: boolean, alert: boolean = false) {
    super.setTally(program, preview, alert);    
    this._setOutputs();
    
  }
  
  setTallyState(state: Tally.OutputTallyState) {
    super.setTallyState(state);    
    this._setOutputs();
  }

  toArray() {
    return {
      'hardwareId': this.hardwareId,
      'outputNums': this.outputNums,
      'atemOutput': this.atemOutput,
      'hardwareTally': this.hardwareTally,
    };
  }
  
  private _setOutputs() {
    switch (this.state) {
      case Tally.OutputTallyState.off:
      this.outputs.program.write(0);
      this.outputs.preview.write(0);
      break;
      case Tally.OutputTallyState.program:
      this.outputs.program.write(1);
      this.outputs.preview.write(0);
      break;
      case Tally.OutputTallyState.preview:
      this.outputs.program.write(0);
      this.outputs.preview.write(1);
      break;
      case Tally.OutputTallyState.alert:
      this.outputs.program.write(1);
      this.outputs.preview.write(1);
      break;
      default:
      break;
    }
  }
}

