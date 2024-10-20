
import { FrontendTally } from "/js/FrontendTally.js";

export class FrontendTallyManager {
  _tallyEntities = [];

  _hardwareContainer;
  _softwareContainer;

  status = 0;

  constructor(hardwareContainer, softwareContainer) {
    this._hardwareContainer = document.getElementById(hardwareContainer);
    this._softwareContainer = document.getElementById(softwareContainer);

    this._tallyEntities = new Map();
  }

  updateTallyState(tallyData) {

    const updatedIds = tallyData.map((tally) => tally.id);

    const keys = Array.from(this._tallyEntities.keys());

    keys.forEach((key) => {
      if(!updatedIds.includes(key)) {
        this._removeTally(this._tallyEntities.get(key));
      }
    });

    tallyData.forEach((tally) => {
      this._updateTally(tally);
    });
  }

  _updateTally(tally) {

    if (tally == null) {
      return;
    }

    if (!this._tallyEntities.has(tally.id)) {
      return this._addTally(tally);
    }

    const currentTallyEntity = this._tallyEntities.get(tally.id);

    if(this.status != 2)
      tally.state = 'alert';

    if(tally.state == 'program') {
      currentTallyEntity.classList.add("program");
      currentTallyEntity.classList.remove("preview");
      currentTallyEntity.classList.remove("alert");
    }
    else if(tally.state == 'preview') {
      currentTallyEntity.classList.remove("program");
      currentTallyEntity.classList.add("preview");
      currentTallyEntity.classList.remove("alert");
    }
    else if(tally.state == 'alert') {
      currentTallyEntity.classList.remove("program");
      currentTallyEntity.classList.remove("preview");
      currentTallyEntity.classList.add("alert");
    }
    else {
      currentTallyEntity.classList.remove("program");
      currentTallyEntity.classList.remove("preview");
      currentTallyEntity.classList.remove("alert");
    }

    const source = currentTallyEntity.querySelector("p span.source");

    source.innerHTML = "" + tally.atemOutput;

    // currentTallyEntity.classList.remove("program");
    // currentTallyEntity.classList.remove("preview");
    // currentTallyEntity.classList.remove("alert");


  }

  /**
   * @param {FrontendTally} tally The date
   */
  _addTally(tally) {

    if (this._tallyEntities.has(tally.id)) {
      return;
    }

    const tallyContainer = document.createElement("a");
    tallyContainer.target = "_blank";
    tallyContainer.id = "tally-" + tally.id;
    tallyContainer.classList.add("tally");
    tallyContainer.href = "/view/" + tally.id;

    if(tally.state == 'program') {
      tallyContainer.classList.add("program");
    }
    else if(tally.state == 'preview') {
      tallyContainer.classList.add("preview");
    }
    else if(tally.state == 'alert') {
      tallyContainer.classList.add("alert");
    }
    
    const tallyHeader = document.createElement("h2");
    if(tally.hardwareId != null) 
      tallyHeader.innerHTML = "" + tally.hardwareId;
    else
      tallyHeader.innerHTML = '<b><span class="material-icons">podcasts</span></b>' + tally.id;

    tallyContainer.appendChild(tallyHeader);

    const tallySource = document.createElement("p");
    const sourceIcon = document.createElement("span");
    sourceIcon.classList.add("material-icons");

    // TODO
    if(tally.hardwareId != null || true) 
      sourceIcon.innerHTML = "settings_ethernet";
    else
      sourceIcon.innerHTML = "podcasts";

    const sourceText = document.createElement("span");
    sourceText.classList.add("source");
    sourceText.innerHTML = "" + tally.atemOutput;

    tallySource.appendChild(sourceIcon);
    tallySource.appendChild(sourceText);

    tallyContainer.appendChild(tallySource);

    if(tally.hardwareId != null) 
      this._hardwareContainer?.appendChild(tallyContainer);
    else
      this._softwareContainer?.appendChild(tallyContainer);

    this._tallyEntities.set(tally.id, tallyContainer);

  }

// <a href="" class="tally">
//   <h2><b>S</b>11</h2>
//   <p><span class="material-icons">podcasts</span> <span class="source">3</span></p>
// </a>

  _removeTally(tally) {
    if (!this._tallyEntities.has(tally.id)) {
      return;
    }

    const tallyEntity = this._tallyEntities.get(tally.id);
    tallyEntity.remove();

    this._tallyEntities.delete(tally.id);
  }

}



// export interface TallyObject
// {
//     state: Tally.OutputTallyState;
//     id: number;
//     atemOutput: number;
//     hardwareId: number | null;
// }
  
  

// export enum OutputTallyState
// {
//     off = "off",
//     program = "program",
//     preview = "preview",
//     alert = "alert"
// }
  