#!/bin/bash
# Build and push the amd64+arm64 image: build_image.sh [tag]; IMAGE overrides the repository.
set -euo pipefail

cd "$(dirname "$0")/.."

VERSION=$(grep '"version"' ui/package.json | head -1 | cut -d '"' -f 4)
TAG="${1:-$VERSION}"
IMAGE="${IMAGE:-kweonminsung/bindizr-ui}"

# The non-native half builds under emulation: slow, but no cross toolchain.
docker buildx build \
    --platform linux/amd64,linux/arm64 \
    -t "$IMAGE:$TAG" -t "$IMAGE:latest" \
    --push .

echo "Pushed $IMAGE:$TAG and $IMAGE:latest for linux/amd64 and linux/arm64"
