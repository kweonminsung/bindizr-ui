@echo off

REM Development server script
echo Starting development server...
echo Using local dist files from ../dist

set GO_ENV=development
set PORT=8080

cd server
go run .