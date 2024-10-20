
export class FrontendTallySource {
  _tallyEntities = [];

  _container;

  constructor(container) {
    this._container = document.getElementById(container);
  }

  loadData(tallyData) {
    tallyData.forEach((tally) => {
      this._addTally(tally);
    });
  }

  _addTally(tally) {

    console.log(tally);

    const tallyEntity = document.createElement('div');
    tallyEntity.classList.add('tally');

    const tallyIcon = document.createElement('div');
    tallyIcon.classList.add('tallyIcon');

    if(tally.hardwareId != null) 
      tallyIcon.innerHTML = '<h2>' + tally.hardwareId + '</h2>';
    else
    tallyIcon.innerHTML = '<b><span class="material-icons">podcasts</span></b>' + '<h2>' + tally.id + '</h2>';

    const sources = document.createElement('div');
    sources.classList.add('sources');

    const source = document.createElement('textarea');
    source.name = tally.id;
    source.pattern = '^(\d+)((,|;)\s*\d+)*$';

    source.value = tally.atemOutput;

    sources.appendChild(source);

    tallyEntity.appendChild(tallyIcon);
    tallyEntity.appendChild(sources);

    this._container.appendChild(tallyEntity);

  }
}
