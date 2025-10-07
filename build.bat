@echo off

REM Build frontend
echo Building frontend...
call npm run build

REM Copy dist to server directory
echo Copying dist to server...
xcopy /E /I /Y dist server\dist

REM Build Go server with embedded files
echo Building Go server...
cd server
go build

echo Build complete! Server executable created with embedded frontend.
pause