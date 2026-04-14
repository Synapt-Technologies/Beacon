# Develop Beacon
To build: Run the following in linux.
```bash
(Project Root)/pi-image/build.sh
```
If you are compiling the image on windows, you must use WSL.


## TODO
- [ ] Implement mqtt ws tally for devices
  - [ ] Add alerts
- [ ] Persist alert config to settings
- [ ] On patch change the web tally does not update.
- [ ] Disconnect warning for tally
  - [ ] State on disconnect also on web interface
    - [ ] On disconnection from api
      - [ ] Add some sort of connection timeout?  
    - [x] On producer disconnect
    - [ ] Only the devices that include sources from the disconnected source?
- [ ] Add "F11" fullscreen button
- [ ] Show more source info, pimarily consumer:sourceid at the device source list.
- [ ] Fix add connection to show the added connection without reload
  - [ ] Maybe background poll for changes?
- [ ] Add Virtual tally
  - [ ] Display them at the top of the tally overview
    - [ ] Add tally type / consumer filter
  - [ ] Display them on the web tally page?
- [ ] Better connection (producer and consumer) info
  - [ ] No issue on disabled
  - [ ] Monitor states
    - [ ] Issue on those
  - [ ] Refactor settings
    - [ ] Remove 
      - [ ] Admin port
      - [ ] MQTT Port
      - [ ] Keep Alive
      - [ ] Mqtt broker disable
      - [ ] Reset alert buttons
    - [ ] Add
      - [ ] Reset to factory settings
- [ ] SHow more producer info
- [ ] Add System info to settings
  - [ ] System name
  - [ ] More info?
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
