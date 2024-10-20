export class FrontendTally {

  state;
  id;
  atemOutput;
  hardwareId;

  constructor(state, id, atemOutput, hardwareId = null) {
    this.state = state;
    this.id = id;
    this.atemOutput = atemOutput;
    this.hardwareId = hardwareId;
  }
}

