#!/bin/bash
# ---------------------------------------------------------------------------
# Build a Raspberry Pi OS image with Beacon Tally pre-installed.
# Uses rpi-image-gen (https://github.com/raspberrypi/rpi-image-gen).
#
# Run from WSL2 (the project can stay on the Windows filesystem):
#   bash /mnt/c/Users/ijssl/Programming\ Projects/Beacon/pi-image/build.sh
#
# Output: ~/beacon-image-work/work/image-Beacon/  →  Beacon.img
# ---------------------------------------------------------------------------
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORK_DIR="${WORK_DIR:-${HOME}/beacon-image-work}"
RIG_DIR="${WORK_DIR}/.rpi-image-gen"
RIG_REPO="https://github.com/raspberrypi/rpi-image-gen.git"

# ---------------------------------------------------------------------------
# Clone rpi-image-gen (once; pull on subsequent runs) — must happen before
# install_deps.sh, which lives inside the cloned repo.
# ---------------------------------------------------------------------------
mkdir -p "${WORK_DIR}"
if [ ! -d "${RIG_DIR}" ]; then
    echo "==> Cloning rpi-image-gen..."
    git clone --depth 1 "${RIG_REPO}" "${RIG_DIR}"
else
    echo "==> Updating rpi-image-gen..."
    git -C "${RIG_DIR}" pull --ff-only
fi

# ---------------------------------------------------------------------------
# Install all dependencies via rpi-image-gen's own script — it knows the
# full list and is idempotent (apt skips already-installed packages).
# Also install qemu-user-static and binfmt-support for ARM64 cross-compile.
# ---------------------------------------------------------------------------
echo "==> Installing dependencies..."
sudo apt-get install -y --no-install-recommends qemu-user-static binfmt-support > /dev/null
sudo "${RIG_DIR}/install_deps.sh"

# ---------------------------------------------------------------------------
# Register ARM64 binfmt in WSL2 kernel (needed for chroot hooks in the build)
# ---------------------------------------------------------------------------
echo "==> Registering ARM64 binfmt..."
sudo update-binfmts --enable qemu-aarch64 2>/dev/null || true

# ---------------------------------------------------------------------------
# Load nbd kernel module (needed by rpi-image-gen for image creation)
# ---------------------------------------------------------------------------
echo "==> Loading nbd module..."
sudo modprobe nbd 2>/dev/null || echo "    WARNING: nbd module unavailable — image creation may fail on WSL2"

# ---------------------------------------------------------------------------
# Run the build
# ---------------------------------------------------------------------------
echo "==> Starting Beacon image build..."
mkdir -p "${WORK_DIR}/work"
"${RIG_DIR}/rpi-image-gen" build \
    -S "${SCRIPT_DIR}" \
    -c beacon.yaml \
    -B "${WORK_DIR}/work"

echo ""
echo "==> Done! Image is in: ${WORK_DIR}/work/image-Beacon/"
echo "    Copy to repo:    mkdir -p \"${SCRIPT_DIR}/rpi-build\" && cp \"\$(ls ${WORK_DIR}/work/image-Beacon/*.img | head -1)\" \"${SCRIPT_DIR}/rpi-build/Beacon.img\""
