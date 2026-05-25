#!/bin/sh
if [ -f /boot/firmware/ssh ]; then
  systemctl start ssh
fi
