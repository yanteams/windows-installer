#!/bin/bash
# Script to start the progress tracking server

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
PROGRESS_PORT=${PROGRESS_PORT:-8080}

# Check if Node.js is installed
if ! command -v node >/dev/null 2>&1; then
    echo "Node.js is not installed. Installing..."
    
    # Try to install Node.js based on OS
    if [ -f /etc/alpine-release ]; then
        apk add nodejs npm
    elif [ -f /etc/debian_version ]; then
        apt-get update && apt-get install -y nodejs npm
    elif [ -f /etc/redhat-release ]; then
        yum install -y nodejs npm || dnf install -y nodejs npm
    else
        echo "Please install Node.js manually"
        exit 1
    fi
fi

# Check if dependencies are installed
if [ ! -d "$BACKEND_DIR/node_modules" ]; then
    echo "Installing dependencies..."
    cd "$BACKEND_DIR"
    npm install
fi

# Start the server
cd "$BACKEND_DIR"
export PROGRESS_PORT=$PROGRESS_PORT
export PROGRESS_LOG=${PROGRESS_LOG:-/reinstall.log}

echo "Starting progress tracking server on port $PROGRESS_PORT..."
echo "Access the dashboard at: http://$(hostname -I | awk '{print $1}'):$PROGRESS_PORT"
echo "Or: http://localhost:$PROGRESS_PORT"

node server.js

