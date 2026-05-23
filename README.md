# Beacon

Find the light in your darkness. A highly configurable, networked tally system.

> [!CAUTION]
> This version is actively being tested but is still an early release and may contain bugs. Keep that in mind when using it in production. If you need a battle-tested version, please use [v2.0.0](https://github.com/Synapt-Technologies/Beacon/releases/tag/v2.0.0) for now it's a step back in features, but it's stable. If you do find a bug, let us know! We'll do our best to fix it quickly.

# Features
* Decentralised tally management
* Multi-switcher configuration
* Source combination
* Hardware tally output
* Expansive web UI configuration
* Tally and device web view
* Easy network device discovery
* Companion module (**WIP**)
* Device alerting
* Open source, with support for DIY devices

<p style="width:90%; box-sizing: border-box; display: flex; gap: 10px; flex-wrap: nowrap">
  <img style="width:40%; border-radius: 5px" alt="BEACON CONTROL HOME" src="https://raw.githubusercontent.com/Synapt-Technologies/Beacon/refs/heads/dev/img/Beacon_devices.png" />
  <img style="width:40%; border-radius: 5px" alt="BEACON PHONE TALLY" src="https://raw.githubusercontent.com/Synapt-Technologies/Beacon/refs/heads/dev/img/Beacon_device_page.png" /> 
  <img style="width:20%; border-radius: 5px" alt="BEACON PHONE TALLY" src="https://raw.githubusercontent.com/Synapt-Technologies/Beacon/refs/heads/dev/img/Beacon_fullscreen_tally.png" /> 
</p>

# Architecture

Beacon is a modular system. This repository contains the main server, the **Beacon Base**. It runs on Windows, Docker, Raspberry Pi and our custom hardware.

The Base connects to one or more *producers*. We currently support Blackmagic ATEM switchers, with VMIX, OBS, Hyperdeck, and Web Presenter support in progress. Producers supply sources and their tally states to *consumers*. There are two consumer types: the *network consumer*, which provides tally access over the network, and the *hardware consumer*, which enables physical outputs on supported platforms (see [Hardware](#hardware)).

Each consumer provides *devices* that are configured through the web interface. Users assign sources to each device, and those sources are combined to determine the device's tally state. A more advanced state builder for complex logic is in the works.

## Network Devices

The *network consumer* allows *networked devices* to connect over MQTT. We offer several networked devices on [synapt.nl](https://synapt.nl/), including extenders with additional hardware outputs and wireless tally devices running on a mesh network. Firmware for our devices and other common hardware can be found in the [Beacon Device repository](https://github.com/Synapt-Technologies/Beacon-Device).

# Hardware

Beacon runs on Node.js, which means it can run almost anywhere. You can set up the Beacon Base by following the [Installation](#installation) instructions, or use our pre-built images for Docker and Raspberry Pi.

Raspberry Pi images support the Pi 3 and Pi 4. When running on a Pi, Beacon exposes GPIO pins as hardware output *devices*. We're working on a newer hardware revision for improved output control. The default pin mapping follows the **Beacon Base V2** GPIO configuration:

| Tally | Program | Preview |
| ----: | :-----: | :------ |
| **1** |    3    | 15      |
| **2** |    5    | 16      |
| **3** |    7    | 18      |
| **4** |    8    | 19      |
| **5** |   10    | 21      |
| **6** |   11    | 22      |
| **7** |   12    | 23      |
| **8** |   13    | 24      |

## DIY Hardware

MQTT support makes it straightforward to add a DIY device to Beacon. We provide firmware for ESP32-based devices, which connect over Wi-Fi. We are working on a dedicated mesh network, which will offer better range. [Pre-built binaries are available](https://github.com/Synapt-Technologies/Beacon-Device/releases) for the following devices:

* Cheap Yellow Display (CYD)
* Huidu HD-WF2

## Beacon Hardware

We develop first-party hardware for this system and are currently transitioning from V2 to V3. The V3 lineup will be available on [synapt.nl](https://synapt.nl/) soon. The system consists of the following components.

### Beacon Base **WIP**
The third-generation Base is the core of the system and runs the Beacon Base software. It features a PoE network connection and four XLR hardware outputs for connecting Lighthouses.
[link]()

### Beacon Lighthouse **WIP**
The Lighthouse is an analog tally light with a 4-pin mini-XLR input, designed to connect to hardware outputs on the Base or a Node. A switch on the back disables the front-facing light for situations where tally should only be visible to the camera operator. Available with 1/4" thread and magnet mounts.
[link]()

### Beacon Node **WIP**
The Node is a wired extender. It has a PoE network connection and four hardware outputs. It connects to the Base to expand the number of available outputs.
[link]()

### Beacon Relay **WIP**
The Relay is a wireless bridge. It connects to the Base over PoE and sets up the mesh network that Satellites use to communicate, coordinating Satellite discovery.
[link]()

### Beacon Satellite **WIP**
The Satellite is a wireless tally light that connects to wifi, or the mesh network set up by the Relay and is discovered automatically by the Base. It includes a small display on the back to show camera information.
[link]()

### Beacon Satellite Pro **WIP**
The Satellite Pro is a wireless tally display with a 64×32 pixel screen on the front for showing camera information, a large tally light, and an information display on the back.

### Beacon Display **WIP**
The Display connects to the network over PoE and offers a 128×64 matrix display. It can be configured to show custom information and is discovered by the Base as a tally device.

# Installation

Beacon can be installed on any platform that supports Node.js. Pre-built Raspberry Pi and Docker images are also available.

## Raspberry Pi

The images support the Pi 3 and Pi 4. We recommend using the Pi 4. Download the latest image from the releases page and flash it to an SD card using the [Raspberry Pi Imager](https://www.raspberrypi.com/software/) or any other flashing tool.

## Node.js

To run Beacon on other systems:

1. Clone the repository.
2. Enter the `app` directory.
3. Run `yarn`
4. Start with `yarn start`

Running the Beacon Base on your own hardware requires familiarity with Node.js. If you run into trouble, we recommend starting with a Raspberry Pi or one of our pre-built hardware options.
