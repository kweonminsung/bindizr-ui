#!/bin/bash

# Development server script
echo "Starting development server..."
echo "Using local ui/dist files"

# Build frontend first
echo "Building frontend..."
cd ui
npm run build
cd ..

export GO_ENV=development
export PORT=9000

go run .