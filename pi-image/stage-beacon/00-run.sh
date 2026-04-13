#!/bin/bash -e

# ---------------------------------------------------------------------------
# Install Node.js 20 LTS via NodeSource
# ---------------------------------------------------------------------------
on_chroot << 'EOF'
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
EOF

# ---------------------------------------------------------------------------
# Enable corepack so Yarn 4 (Berry) works without a global install.
# The repo's packageManager field pins the exact Yarn version.
# ---------------------------------------------------------------------------
on_chroot << 'EOF'
corepack enable
EOF

# ---------------------------------------------------------------------------
# Clone the Beacon repository, install deps, and build the React frontend
# ---------------------------------------------------------------------------
on_chroot << 'EOF'
git clone --depth 1 https://github.com/IJIJI/Beacon.git /opt/Beacon-tally

cd /opt/Beacon-tally/app
yarn install --immutable
yarn build
EOF

# ---------------------------------------------------------------------------
# Install the systemd service
# ---------------------------------------------------------------------------
install -m 644 files/beacon.service "${ROOTFS_DIR}/lib/systemd/system/beacon.service"

on_chroot << 'EOF'
systemctl enable beacon.service
EOF
