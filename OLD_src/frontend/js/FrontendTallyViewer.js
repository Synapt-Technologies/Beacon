
import { FrontendTally } from "/js/FrontendTally.js";

export class FrontendTallyViewer {
  _tallyEntities = [];

  _container;
  _id;

  init = false;

  status = 2;

  constructor(container, id) {
    this._container = document.getElementById(container);
    this._id = id;

    this._tallyEntities = new Map();
  }

  updateTallyState(tallyData) {

    const updatedIds = tallyData.map((tally) => tally.id);

    if(this.init && !updatedIds.includes(this._id)) {
      this._setState('alert');
    }

    tallyData.forEach((tally) => {
      if (tally.id == this._id) {

        this._updateTally(tally);
        return;
      }
    });
  }

  _updateTally(tally) {

    if (!this.init){
      this._createTally(tally);
      return;
    }


    if (tally == null) {
      this._setState('alert');
    }
    this._setState(tally.state);

    const source = this._container.querySelector("p span.source");

    source.innerHTML = "" + tally.atemOutput;

  }

  _createTally(tally) {

    console.log(tally);

    const tallyContainer = document.createElement("div");
    tallyContainer.classList.add("info");


    const tallyHeader = document.createElement("h2");
    if(tally.hardwareId != null) 
      tallyHeader.innerHTML = "" + tally.hardwareId;
    else
      tallyHeader.innerHTML = "<b>S</b>" + tally.id;

    tallyContainer.appendChild(tallyHeader);

    const tallySource = document.createElement("p");
    const sourceIcon = document.createElement("span");
    sourceIcon.classList.add("material-icons");

    if(tally.hardwareId != null) 
      sourceIcon.innerHTML = "settings_ethernet";
    else
      sourceIcon.innerHTML = "podcasts";

    const sourceText = document.createElement("span");
    sourceText.classList.add("source");
    sourceText.innerHTML = "" + tally.atemOutput;

    tallySource.appendChild(sourceIcon);
    tallySource.appendChild(sourceText);

    tallyContainer.appendChild(tallySource);

    this._container.innerHTML = tallyContainer.outerHTML;

    this.init = true;

    this._updateTally(tally);
  }

/* <div class="info">
  <h2><b>S</b>8</h2>
  <p><span class="material-icons">settings_ethernet</span> <span class="source">8</span></p>
</div> */

  _setState(state) {

    if(this.status != 2)
      state = 'alert';


    if(state == 'program') {
      this._container.classList.add("program");
      this._container.classList.remove("preview");
      this._container.classList.remove("alert");
    }
    else if(state == 'preview') {
      this._container.classList.remove("program");
      this._container.classList.add("preview");
      this._container.classList.remove("alert");
    }
    else if(state == 'alert') {
      this._container.classList.remove("program");
      this._container.classList.remove("preview");
      this._container.classList.add("alert");
    }
    else {
      this._container.classList.remove("program");
      this._container.classList.remove("preview");
      this._container.classList.remove("alert");
    }
  }
}
