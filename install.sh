#!/usr/bin/env bash
# Copyright (c) 2021-2024 Synapt
# Author: Synapt (IJssel Koster)
# License: GNU GPLv3
# https://github.com/IJIJI/Beacon/raw/main/LICENSE

textred=$(tput sgr0 setaf 196)
textdimred=$(tput sgr0 setaf 9)
textbolddimred=$(tput bold setaf 9)
textgreen=$(tput sgr0 setaf 2)
textboldgreen=$(tput bold setaf 2)
textnormal=$(tput sgr0)

function header_info {

clear
cat << EOF
${textred}
  ____                               _____     _ _        
 | __ )  ___  __ _  ___ ___  _ __   |_   _|_ _| | |_   _  
 |  _ \ / _ \/ _  |/ __/ _ \|  _ \    | |/ _  | | | | | | 
 | |_) |  __/ (_| | (_| (_) | | | |   | | (_| | | | |_| | 
 |____/ \___|\__,_|\___\___/|_| |_|   |_|\__,_|_|_|\__, | 
                                                   |___/  
${textdimred}
       ${textbolddimred}Beacon Tally: The light in your darkness         
           ${textbolddimred}Author${textdimred}................Synapt.net          
           ${textbolddimred}License${textdimred}................GNU GPLv3          
           ${textbolddimred}Version${textdimred}......................1.0          

${textnormal}
EOF
}

# Check if the shell is using bash
shell_check() {
  if [[ "$(basename "$SHELL")" != "bash" ]]; then
    clear
    msg_error "Your default shell is currently not set to Bash. To use these scripts, please switch to the Bash shell."
    echo -e "\nExiting..."
    sleep 2
    exit
  fi
}

# Run as root only
root_check() {
  if [[ $EUID -ne 0 ]]; then
    clear
    msg_error "Please run this script as root."
    echo -e "\nExiting..."
    sleep 2
    exit
  fi
}

spinner() {
  local chars="/-\|"
  local spin_i=0
  printf "\e[?25l"
  while true; do
      printf "\r \e[36m%s\e[0m" "${chars:spin_i++%${#chars}:1}"
      sleep 0.1
  done
}
# This function displays an informational message with a yellow color.
msg_info() {
  local msg="$1"
  # printf "\e[?25h"
  echo -ne " ${HOLD} ${YW}  ${msg}   "
  spinner &
  SPINNER_PID=$!
}

# This function displays a success message with a green color.
msg_ok() {
  if [ -n "$SPINNER_PID" ] && ps -p $SPINNER_PID > /dev/null; then kill $SPINNER_PID > /dev/null; fi
  printf "\e[?25h"
  local msg="$1"
  echo -e "${BFR} ${CM} ${GN}${msg}${CL}"
}

# This function displays a error message with a red color.
msg_error() {
  if [ -n "$SPINNER_PID" ] && ps -p $SPINNER_PID > /dev/null; then kill $SPINNER_PID > /dev/null; fi
  printf "\e[?25h"
  local msg="$1"
  echo -e "${BFR} ${CROSS} ${RD}${msg}${CL}"
}

exit-script() {
  clear
  echo -e "⚠  User exited script \n"
  exit
}

function update_script() {
msg_info  "Updating operating system: apt-get update"
sudo apt-get update &>/dev/null
msg_ok    "Done - Updating operating system: apt-get update"

msg_info  "Updating operating system: apt-get upgrade"
sudo apt-get -y upgrade &>/dev/null
msg_ok    "Done - Updating operating system: apt-get upgrade"

exit
}

dir=/opt/Beacon-tally

function dependencies_script() {
msg_info  "Installing dependencies: nodejs"
sudo apt install nodejs &>/dev/null
msg_ok    "Done - Installing dependencies: nodejs"

msg_info  "Installing dependencies: yarn"
npm install --global yarn &>/dev/null
msg_ok    "Done - Installing dependencies: yarn"

}

function foldercreate_script() {
  if [[ ! -e $dir ]]; then
    mkdir $dir
  elif [[ -e $dir ]]; then
    sudo rm -rf $dir
    mkdir $dir
  elif [[ ! -d $dir ]]; then
    msg_error "$dir already exists but is not a directory" 1>&2
    exit
  fi

  cd $dir
}

function clonegit_script(){
  msg_info  "Cloning repository"
  git clone https://github.com/IJIJI/Beacon.git $dir &>/dev/null
  msg_ok    "Done - Cloning repository"
}

function yarninit_script(){
  msg_info  "Installing dependencies: yarn init"
  sudo yarn install &>/dev/null
  msg_ok    "Done - Installing dependencies: yarn init"
}

function create_service(){
  msg_info  "Creating service"
  file_location=/lib/systemd/system/beacon.service

  cat > $file_location << EOF
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
EOF
  msg_ok    "Done - Creating service"
}

function enable_service(){
  msg_info  "Reloading daemon"
  sudo systemctl daemon-reload
  msg_ok    "Done - Reloading daemon"
  
  msg_info  "Enabeling service"
  sudo systemctl enable beacon
  msg_ok    "Done - Enabeling service"
  
  msg_info  "Starting service"
  sudo systemctl start beacon
  msg_ok    "Done - Starting service"
  
}


shell_check
root_check

header_info
update_script
dependencies_script
foldercreate_script
clonegit_script
yarninit_script
create_service
enable_service


cat << EOF
${textboldgreen}
Success!
${textgreen}Open Admin Panel:${textnormal}
EOF
ifconfig | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | awk '{print "http://" $0 "/"}'