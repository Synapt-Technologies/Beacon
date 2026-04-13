#!/bin/bash
# ---------------------------------------------------------------------------
# Build a Raspberry Pi OS image with Beacon Tally pre-installed.
#
# Prerequisites:
#   - Docker Desktop running (WSL2 backend)
#   - ~8 GB free disk space
#   - Internet access (to clone pi-gen and the Beacon repo during build)
#
# Usage (from WSL2 — the project can stay on the Windows filesystem):
#   bash /mnt/c/Users/ijssl/Programming\ Projects/Beacon/pi-image/build.sh
#
# The pi-gen work directory is placed in ~/beacon-pigen-work (WSL2 filesystem)
# to avoid NTFS limitations with device nodes (mknod) during rootfs build.
# Override with: WORK_DIR=/some/other/path bash pi-image/build.sh
#
# Output:
#   ~/beacon-pigen-work/deploy/  →  Beacon-*.img.gz  (flash with Raspberry Pi Imager)
# ---------------------------------------------------------------------------
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Default work dir to WSL2 home to avoid NTFS mknod failures.
# On native Linux this will just be a sibling folder of the project.
WORK_DIR="${WORK_DIR:-${HOME}/beacon-pigen-work}"
PI_GEN_DIR="${WORK_DIR}/.pi-gen"
PI_GEN_REPO="https://github.com/RPi-Distro/pi-gen.git"

# 32-bit (armhf) — works on Pi 2 and all newer models (recommended)
PI_GEN_BRANCH="master"
# 64-bit (arm64) — Pi 3 / 4 / 5 / Zero 2 W only, drops Pi 2 support
# PI_GEN_BRANCH="arm64"

echo "==> Checking Docker..."
docker info > /dev/null 2>&1 || { echo "ERROR: Docker is not running."; exit 1; }

# ---------------------------------------------------------------------------
# pi-gen's build-docker.sh checks for qemu-arm on the WSL2/host side before
# launching the Docker build container.
# ---------------------------------------------------------------------------
if ! which qemu-arm > /dev/null 2>&1; then
    echo "==> Installing qemu-user (required by pi-gen)..."
    sudo apt-get install -y qemu-user qemu-user-binfmt
fi

# ---------------------------------------------------------------------------
# Register ARM binfmt handlers inside Docker Desktop's VM kernel.
# Docker containers run in a separate VM from WSL2, so host-side binfmt
# registrations are not visible inside containers — we must register here too.
# This is a no-op if already registered.
# ---------------------------------------------------------------------------
echo "==> Registering ARM binfmt in Docker VM..."
docker run --rm --privileged tonistiigi/binfmt --install arm > /dev/null

# ---------------------------------------------------------------------------
# Remove any leftover pigen_work container from a previous failed build.
# pi-gen refuses to start if it already exists (and CONTINUE=1 is not set).
# ---------------------------------------------------------------------------
if docker ps -a --format '{{.Names}}' | grep -q '^pigen_work$'; then
    echo "==> Removing stale pigen_work container..."
    docker rm -v pigen_work > /dev/null
fi

# ---------------------------------------------------------------------------
# Clone pi-gen (once; pull on subsequent runs)
# ---------------------------------------------------------------------------
if [ ! -d "${PI_GEN_DIR}" ]; then
    echo "==> Cloning pi-gen (${PI_GEN_BRANCH})..."
    git clone --depth 1 -b "${PI_GEN_BRANCH}" "${PI_GEN_REPO}" "${PI_GEN_DIR}"
else
    echo "==> Updating pi-gen..."
    git -C "${PI_GEN_DIR}" pull --ff-only
fi

# ---------------------------------------------------------------------------
# Copy our config and custom stage into the pi-gen work tree
# ---------------------------------------------------------------------------
echo "==> Setting up stage-beacon..."
cp "${SCRIPT_DIR}/config" "${PI_GEN_DIR}/config"

rm -rf "${PI_GEN_DIR}/stage-beacon"
cp -r "${SCRIPT_DIR}/stage-beacon" "${PI_GEN_DIR}/stage-beacon"
chmod +x "${PI_GEN_DIR}/stage-beacon/00-run.sh"

# ---------------------------------------------------------------------------
# Run the build inside Docker
# ---------------------------------------------------------------------------
echo "==> Starting pi-gen build (this takes 20-60 min on first run)..."
cd "${PI_GEN_DIR}"
./build-docker.sh

echo ""
echo ""
echo "==> Done! Image is in: ${PI_GEN_DIR}/deploy/"
echo "    Flash it with Raspberry Pi Imager, or copy to Windows first:"
echo "    cp ${PI_GEN_DIR}/deploy/Beacon-*.img.gz /mnt/c/Users/\$USER/Desktop/"
