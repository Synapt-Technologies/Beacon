# Beacon

Find the light in your darkness. Highly configurable networked tally system.

[UI Demo](https://synapt.nl/)

# Features
* Decentralised Tally management.
* Multi-switcher configuration.
* Source combination.
* Hardware tally output.
* Expansive web UI configuration.
* Tally and Device web view.
* Companion module. **WIP**
* Device alerting.

<p style="width:100%; box-sizing: border-box; display: flex; gap: 10px; flex-wrap: nowrap">
  <img style="width:75%; border-radius: 5px" alt="BEACON CONTROL HOME" src="https://raw.githubusercontent.com/IJIJI/Beacon/refs/heads/main/assets/Main-Page.png" />
  <img style="width:24%; border-radius: 5px" alt="BEACON PHONE TALLY" src="https://raw.githubusercontent.com/IJIJI/Beacon/refs/heads/main/assets/Phone-Tally.png" /> 
</p>

# Architecture

Beacon is a modular system. This repository is for the main server, the Beacon Base. It is made for our custom hardware, available on [synapt.nl](https://synapt.nl/). The base can connect to multiple so called *producers*. Currently we support Blackmagic Atem switchers, and we are working on VMIX, OBS, Hyperdeck and Web presenter support. These *producers* supply sources and their states to *consumers*. We currently have two types of *consumers*. The *network consumer* that provides access to tally over the network, and our *hardware consumer* that enables hardware outputs on supported platforms (see #Hardware). Each consumer supplies *devices*, which can be configured in the web interface. A user can assign sources to each *device*, which are combined to produce a *device*'s tally state. We are working on a state builder to allow for even more complex logic.

## Network Devices
The *network consumer* allows *networked devices* over mqtt. We offer multiple *networked devices* on [synapt.nl](https://synapt.nl/). These include hardware extenders, offering more outputs, but also wireless tally *devices* operating on a mesh network.

# Hardware
Beacon runs on Node.js, which enables it to run on a lot of places. To get the *Beacon Base* setup you can follow the instructions at #Installation. We also offer pre-build images for Raspberry Pi. These work on the 64 bit Raspberry Pis, which includes all models starting from the Pi 3. When Beacon runs on a Pi it exposes the local GPIO outputs as *devices*. We are working on a newer hardware version to offer better output control. By default this uses the *Beacon Base V2* gpio configuration:


|       Tally | Program | Preview |
| ----------: | :-----: | ------- |
| **1** |    3    | 15      |
| **2** |    5    | 16      |
| **3** |    7    | 18      |
| **4** |    8    | 19      |
| **5** |   10   | 21      |
| **6** |   11   | 22      |
| **7** |   12   | 23      |
| **8** |   13   | 24      |

## DIY Hardware **WIP**
Due to the MQTT support it is easy to add a DIY device to the system. We offer code for M5Stack products **WIP** and a bare ESP32. These work over WIFI. For a completely stable wireless device we suggest our Beacon hardware. You can find the DIY repositories here:
* Still **WIP**

## Beacon Hardware
We have developed first-party hardware for this system. We are currently working on the transistion between our V2 and V3 system. The V3 will soon be available on [synapt.nl](https://synapt.nl/). The system consists of the following components.


### Beacon Base:
The Base is the core of the system. This runs the Beacon Base software. It has a POE network connection and four XLR hardware outputs, where Lighthouses can be connected.
[link]()

### Beacon Lighthouse: **WIP**
The Lighthouse is an analog light. It has a 4 pin min-xlr input and can be connected to hardware outputs on the Base or a Relay. They have a switch on the back, which disables the light on the front for situations where the tally should only be seen by the camera operator. We offer both 1/4" and magnet mounts.
[link]()

### Beacon Node: **WIP**
The relay is a networked extender. It has a POE network connection and four hardware outputs. It and connects to the Base to extend it.
[link]()

### Beacon Relay: **WIP**
The Relay is a wireless bridge. It has a POE network connection and connects to the Base. It sets up the wireless mesh network for Satelites to connect to and coördinates Lighthouse discovery.
[link]()

### Beacon Satelite: **WIP**
This is a wireless tally light. It connects to the mesh network set up by the relay, and is discovered by the Base. It also contains a small display on the back, to display camera information.
[link]()

### Beacon Satelite Pro: **WIP**
The Satelite Pro is a wireless tally display. It offers a 64x32 pixel display on the front, where camera information can be displayed. It also offers tally light and an information display on the back.

### Beacon Display: **WIP**
This connects to the network with a POE connection. It offers a 128x64 matrix display and can be configured to show information and it is discovered by the Base as tally light.


# Installation
This system can be installed on all platforms that support Node.js. To install this on a Raspberry Pi we offer pre-built images. We are also working on a docker image.

## Raspberry Pi
The image we offer supports all 64-bit capable models. That means all Pis starting from the Pi 3 should work, though we recommend using at least a Pi 4. To get started, download the latest image from the releases and flash it to your sd card. This can be done with the [Raspberry Pi Imager](https://www.raspberrypi.com/software/), or another software of your choice.

## Node
To run this on other systems, you can follow these steps:
 1. Clone the repository.
 2. Enter the app directory.
 3. Run `yarn`
 4. Start with `yarn start`

Running beacon on your own hardware requires understanding of Node.js. If you struggle running it, we recommend getting started on a Raspberry Pi, or looking at our pre-built hardware.