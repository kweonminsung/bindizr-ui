#!/bin/bash

# Production build script
echo "Building for production..."

# Build frontend
echo "Building frontend..."
cd ui
npm run build
cd ..

# Build Go server with embedded files (production mode)
echo "Building Go server with embedded files..."
GO_ENV=production go build