#!/bin/bash

# Development server script
echo "Starting development server..."
echo "Using local dist files from ../dist"

export GO_ENV=development
export PORT=8080

cd server
go run .