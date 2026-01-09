#!/usr/bin/env node
const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const PORT = process.env.PROGRESS_PORT || 8080;
const LOG_FILE = process.env.PROGRESS_LOG || '/reinstall.log';

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Store progress state
let progressState = {
    status: 'idle', // idle, running, completed, error
    currentStep: '',
    progress: 0,
    totalSteps: 0,
    logs: [],
    startTime: null,
    endTime: null,
    error: null
};

// Broadcast to all connected clients
function broadcast(data) {
    const message = JSON.stringify(data);
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

// API endpoint to update progress
app.post('/api/progress', (req, res) => {
    const { step, progress, status, message, error } = req.body;
    
    if (step) progressState.currentStep = step;
    if (progress !== undefined) progressState.progress = progress;
    if (status) progressState.status = status;
    if (message) {
        progressState.logs.push({
            timestamp: new Date().toISOString(),
            message: message
        });
        // Keep only last 1000 log entries
        if (progressState.logs.length > 1000) {
            progressState.logs = progressState.logs.slice(-1000);
        }
    }
    if (error) progressState.error = error;
    
    if (status === 'running' && !progressState.startTime) {
        progressState.startTime = new Date().toISOString();
    }
    if (status === 'completed' || status === 'error') {
        progressState.endTime = new Date().toISOString();
    }
    
    broadcast(progressState);
    res.json({ success: true });
});

// API endpoint to get current progress
app.get('/api/progress', (req, res) => {
    res.json(progressState);
});

// API endpoint to reset progress
app.post('/api/reset', (req, res) => {
    progressState = {
        status: 'idle',
        currentStep: '',
        progress: 0,
        totalSteps: 0,
        logs: [],
        startTime: null,
        endTime: null,
        error: null
    };
    broadcast(progressState);
    res.json({ success: true });
});

// WebSocket connection handler
wss.on('connection', (ws) => {
    // Send current state to new client
    ws.send(JSON.stringify(progressState));
    
    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

// Tail log file and broadcast updates
let logWatcher = null;
function startLogWatcher() {
    if (logWatcher) return;
    
    if (fs.existsSync(LOG_FILE)) {
        // Read last 100 lines
        const logContent = fs.readFileSync(LOG_FILE, 'utf8');
        const lines = logContent.split('\n').slice(-100);
        progressState.logs = lines.map(line => ({
            timestamp: new Date().toISOString(),
            message: line
        }));
        
        // Watch for changes
        fs.watchFile(LOG_FILE, { interval: 1000 }, (curr, prev) => {
            if (curr.mtime > prev.mtime) {
                const newLines = fs.readFileSync(LOG_FILE, 'utf8')
                    .split('\n')
                    .slice(-10); // Get last 10 new lines
                
                newLines.forEach(line => {
                    if (line.trim()) {
                        progressState.logs.push({
                            timestamp: new Date().toISOString(),
                            message: line
                        });
                    }
                });
                
                // Keep only last 1000 entries
                if (progressState.logs.length > 1000) {
                    progressState.logs = progressState.logs.slice(-1000);
                }
                
                broadcast(progressState);
            }
        });
    }
}

// Start server
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Progress tracking server running on http://0.0.0.0:${PORT}`);
    console.log(`WebSocket server ready for connections`);
    startLogWatcher();
});

// Graceful shutdown
process.on('SIGTERM', () => {
    if (logWatcher) {
        fs.unwatchFile(LOG_FILE);
    }
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

