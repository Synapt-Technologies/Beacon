# Beacon

Find the light in your darkness. Highly configurable Tally for Blackmagic Atem switchers.


# Features


# Hardware

# Installation

Update your Raspberry pi:

```shell
sudo apt-get update &&
sudo apt-get upgrade
```

Install Git, NodeJS, NPM, Yarn and TSX:

```bash
sudo apt install git -y &&
sudo apt install nodejs &&
sudo apt install npm -y &&
sudo npm install --global yarn &&
sudo npm install --global tsx
```

> Note. The last two installs might give the error "ENOENT: no such file or directory, uv_cwd". Re-opening the terminal will resolve this.

Make a directory:

```bash
sudo mkdir /opt/Beacon-tally
```

Clone and initialize repository:

```bash
sudo git clone https://github.com/IJIJI/Beacon.git /opt/Beacon-tally &&
cd /opt/Beacon-tally &&
sudo yarn install
```

Create startup service:

```bash
sudo nano /lib/systemd/system/beacon.service
```

Paste startup service into file, then press Ctrl + S to save and Ctrl + X to exit:

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
sudo systemctl daemon-reload &&
sudo systemctl enable beacon &&
sudo systemctl start beacon
```

Congratulations, you can now access your Beacon tally via the browser! To see your ip address you can use this command:

```yaml
ifconfig | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*'
```

### Automatic install

You can install Beacon Tally automatically with this install script:

***WARNING! This script does not allways work. The manual method is still recommended.***

```bash
bash -c "$(wget -qLO - https://raw.githubusercontent.com/IJIJI/Beacon/main/install.sh)"
```
