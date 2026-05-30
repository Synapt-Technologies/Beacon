# Develop Beacon
To build: Run the following in linux.
```bash
(Project Root)/pi-image/build.sh
```
If you are compiling the image on windows, you must use WSL.


## TODO
- [ ] CLASS REBUILD:
  - [x] Rework buss structure to support more than only program preview.
  - [ ] Add AbstractConnection that is implemented by AbstractTallyProducer and AbstractConsumer that contains the base fields like config(id name), its getters setters and validation.


- [ ] Dev/prod mode for ui
  - [ ] For seperate logging
- [ ] Dev switch in ui for dev options
  - [ ] Add virtual device menu (still todo) allows to add a device for whichever consumer. (that allows it).
- [ ] Easier way to page through devices. Some sort of arrow keys in the navbar?
- [x] Implement mqtt ws tally for devices
  - [ ] Add alerts on UI
- [ ] Add "F11" fullscreen button
- [ ] Show more source info, pimarily consumer:sourceid at the device source list.
- [ ] Add Virtual tally
  - [ ] Display them at the top of the tally overview
    - [ ] Add tally type / consumer filter
  - [ ] Display them on the web tally page?
- [ ] Refactor UI settings
  - [ ] Add
    - [ ] Reset to factory settings
- [ ] Show more producer info
- [ ] Add hooks for alerts
  - [ ] Http
  - [ ] Osc
- [ ] **More connections!**
  - [ ] VMIX
  - [ ] Hyperdeck: Is recording?
  - [ ] WebPresenter: Is on air?
- [ ] Add the option for advanced tally logic -> user can setup logic for tally states.
  - [ ] Select 'default' sources and add option to add conditions on top?
- [ ] Implement alert state blinking in GPIOConsumer
- [ ] Add pagewide haptics ( Currently in context and alert buttons. )
  - [ ] Context the right place?
- [ ] **REFACTOR ORCHESTRATION**
  - [x] Types
  - [x] Producer Rewrite
  - [ ] Old TODO (still relevant)
    - [ ] Consumers don't own the tally process
    - [ ] Consumer exports tally devices. 
    - [ ] The orchestrator sets the tallystate 
    - [ ] The Consumer exposes sendDeviceTally (or similar)
    - [ ] No ConsumeTally
    - [ ] The orchestrator decides which devices to send
    - [ ] GlobalConsumer gets all, non global only the devices mapped to their consumerId
    - [ ] Aedes devices on the aedes topic -> Discovery:
      - [ ] Device requests descivery on global topic: tally/discovery
      - [ ] Aedes is the active consumer on that mqtt -> It assigns its ConsumerId + a DeviceId (mac based?)
      - [ ] The device saves that and connects to the topic.
    - [ ] The Orchestrator sends the relevant devices to the right consumers.
    - [ ] Implement clear split between config, tally and alert.
    - [ ] Add text alert type.
    - [ ] Rename orchestrator and lifecycle. Logic and orchestrator, or coordinator?
    - [ ] Move consumer responsibilities to orchestrator.
- [ ] Add multi output devices!
- [ ] Duplicate producer ID is just skipped on add.
- [ ] Unify UI structure:
  - [ ] List page for devices, sources and connections
  - [ ] Tallyrow for devices and sources
- [ ] Add device state on disconnect: When a device disconnects from beacon, not beacon from producer
