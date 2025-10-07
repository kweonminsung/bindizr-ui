#!/bin/bash

# Production build script
echo "Building for production..."

# Build frontend
echo "Building frontend..."
npm run build

# Copy dist to server directory
echo "Copying dist to server..."
cp -r dist server/

# Build Go server with embedded files (production mode)
echo "Building Go server with embedded files..."
cd server
GO_ENV=production go build

echo "Production build complete! Server executable created with embedded frontend."
echo "To run in production: ./server/server"
echo "To run in development: ./dev.sh"