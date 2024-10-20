
export class Tally {
  state: Tally.OutputTallyState = Tally.OutputTallyState.alert;

  atemOutput: number[];

  id: number;
    
  constructor(atemOutput: number | number[]) {

    if (!Array.isArray(atemOutput)) {
      this.atemOutput = [atemOutput];
    }
    else{
      this.atemOutput = atemOutput;
    }
  }
  
  setTally(program: boolean, preview: boolean, alert: boolean = false) {
    if (program) {
      this.state = Tally.OutputTallyState.program;
    }
    else if (preview) {
      this.state = Tally.OutputTallyState.preview;
    }
    else {
      this.state = Tally.OutputTallyState.off;
    }
  }
  
  setTallyState(state: Tally.OutputTallyState) {
    this.state = state;
  }

  setId(id: number) {
    this.id = id;
  }

  setAtemOutput(atemOutput: number | number[]) {
    if (!Array.isArray(atemOutput)) {
      this.atemOutput = [atemOutput];
    }
    else{
      this.atemOutput = atemOutput;
    }
  }

  toArray() {
    return {
      'atemOutput': this.atemOutput,
    };
  }
  
}

export namespace Tally
{
  export enum OutputTallyState
  {
    off = "off",
    program = "program",
    preview = "preview",
    alert = "alert"
  }
}