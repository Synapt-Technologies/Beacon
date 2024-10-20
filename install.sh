#!/usr/bin/env bash
# Copyright (c) 2021-2024 Synapt
# Author: Synapt (IJssel Koster)
# License: GNU GPLv3
# https://github.com/IJIJI/Beacon/raw/main/LICENSE

source <(curl -s https://raw.githubusercontent.com/IJIJI/Beacon/main/install.func)

textred=$(tput sgr0 setaf 196)
textdimred=$(tput sgr0 setaf 9)
textbolddimred=$(tput bold setaf 9)
textgreen=$(tput sgr0 setaf 2)
textboldgreen=$(tput bold setaf 2)
textnormal=$(tput sgr0)

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