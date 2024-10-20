# Beacon

Find the light in your darkness. Highly configurable Tally for Blackmagic Atem switchers.


# Features


# Hardware

# Installation

You can install Beacon Tally automatically with this install script:

```bash
bash -c "$(wget -qLO - https://raw.githubusercontent.com/IJIJI/Beacon/main/install.sh)"
```

### Manual install

Update your Raspberry pi:

```shell
sudo apt-get update
sudo apt-get upgrade
```

Install Git, NodeJS, NPM, Yarn and TSX:

```bash
sudo apt install git -y
sudo apt install nodejs npm -y
sudo npm install --global yarn
sudo npm install --global tsx
```

Make a directory:

```bash
mkdir /opt/Beacon-tally
```

Clone and initialize repository:

```bash
git clone https://github.com/IJIJI/Beacon.git /opt/Beacon-tally
cd /opt/Beacon-tally
yarn install
```

Create startup service:

```bash
sudo nano /lib/systemd/system/beacon.service
```

Paste startup service into file:

```yaml
#/lib/systemd/system/beacon.service
[Unit]
Description=Beacon Tally
After=network-online.target

[Service]
Type=simple
Restart=always
RestartSec=3
Restart=on-failure
WorkingDirectory= /opt/Beacon-tally/
ExecStart=yarn start /opt/Beacon-tally/

[Install]
WantedBy=multi-user.target
```

Enable and start service:

```yaml
sudo systemctl daemon-reload
sudo systemctl enable beacon
sudo systemctl start beacon
```

Congratulations, you can now access your Beacon tally via the browser! To see your ip address you can use this command:

```yaml
ifconfig | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*'
```
