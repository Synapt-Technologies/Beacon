# Develop Beacon
To build: Run the following in linux.
```bash
(Project Root)/pi-image/build.sh
```
If you are compiling the image on windows, you must use WSL.


## TODO
- [x] !! PLATFORM NEED MANUAL RESTART ON UI CHANGE AFTER UPDATE !!
- [x] Implement mqtt ws tally for devices
  - [ ] Add alerts
- [x] Persist alert config to settings
- [x] On patch change the web tally does not update.
- [x] Disconnect warning for tally
  - [x] State on disconnect also on web interface
  - [x] State on disconnect also on web interface
    - [x] On disconnection from api
      - [x] Add some sort of connection timeout?  
    - [x] On producer disconnect
    - [x] Changing the stage while disconnected does not work.
  - [x] Only the devices that include sources from the disconnected source?
- [ ] Add "F11" fullscreen button
- [ ] Show more source info, pimarily consumer:sourceid at the device source list.
- [x] Fix add connection to show the added connection without reload
- [ ] Add Virtual tally
  - [ ] Display them at the top of the tally overview
    - [ ] Add tally type / consumer filter
  - [ ] Display them on the web tally page?
- [x] Better connection (producer and consumer) info
  - [x] No issue on disabled
  - [x] Monitor states
    - [x] Issue on those
- [ ] Refactor UI settings
  - [ ] Remove 
    - [x] Admin port
    - [ ] MQTT Port
    - [ ] Keep Alive
    - [x] Mqtt broker disable
    - [x] Reset alert buttons
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
- [x] **REFACTOR ORCHESTRATION**
  - [x] Consumers don't own the tally process
  - [x] Consumer exports tally devices. 
  - [x] The orchestrator sets the tallystate 
  - [x] The Consumer exposes sendTallyDevice (or similar)
  - [x] No ConsumeTally
  - [x] The orchestrator decides which devices to send
  - [x] GlobalConsumer gets all, non global only the devices mapped to their consumerId
  - [x] Aedes devices on the aedes topic -> Discovery:
    - [x] Device requests descivery on global topic: tally/discovery
    - [x] Aedes is the active consumer on that mqtt -> It assigns its ConsumerId + a DeviceId (mac based?)
    - [x] The device saves that and connects to the topic.
  - [x] The Orchestrator sends the relevant devices to the right consumers.
- [ ] Add multi output devices!
- [ ] Duplicate producer ID is just skipped on add.
- [ ] Unify UI structure:
  - [ ] List page for devices, sources and connections
  - [ ] Tallyrow for devices and sources
