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

// Store progress state by session ID
const sessions = new Map();

// File to persist sessions across restarts
const SESSIONS_FILE = path.join(__dirname, 'sessions.json');

// Load sessions from file on startup
function loadSessions() {
    try {
        if (fs.existsSync(SESSIONS_FILE)) {
            const data = fs.readFileSync(SESSIONS_FILE, 'utf8');
            const savedSessions = JSON.parse(data);
            for (const [id, state] of Object.entries(savedSessions)) {
                sessions.set(id, state);
            }
            console.log(`Loaded ${sessions.size} session(s) from file`);
        }
    } catch (err) {
        console.error('Failed to load sessions:', err);
    }
}

// Save sessions to file
function saveSessions() {
    try {
        const sessionsObj = {};
        for (const [id, state] of sessions.entries()) {
            sessionsObj[id] = state;
        }
        fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessionsObj, null, 2));
    } catch (err) {
        console.error('Failed to save sessions:', err);
    }
}

// Load sessions on startup
loadSessions();

// Save sessions periodically (every 30 seconds)
setInterval(saveSessions, 30000);

// Get or create session state
function getSessionState(sessionId) {
    if (!sessions.has(sessionId)) {
        sessions.set(sessionId, {
            status: 'idle', // idle, running, completed, error
            currentStep: '',
            progress: 0,
            totalSteps: 0,
            logs: [],
            startTime: null,
            endTime: null,
            error: null,
            sessionId: sessionId,
            createdAt: new Date().toISOString()
        });
    }
    return sessions.get(sessionId);
}

// Clean up old sessions (older than 24 hours)
function cleanupOldSessions() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    for (const [sessionId, state] of sessions.entries()) {
        const createdAt = new Date(state.createdAt).getTime();
        if (now - createdAt > maxAge) {
            sessions.delete(sessionId);
        }
    }
}

// Run cleanup every hour
setInterval(cleanupOldSessions, 60 * 60 * 1000);

// Broadcast to all connected clients for a specific session
function broadcast(sessionId, data) {
    const message = JSON.stringify(data);
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN && client.sessionId === sessionId) {
            client.send(message);
        }
    });
}

// API endpoint to update progress
app.post('/api/progress', (req, res) => {
    const { sessionId, step, progress, status, message, error } = req.body;
    
    if (!sessionId) {
        return res.status(400).json({ error: 'sessionId is required' });
    }
    
    const progressState = getSessionState(sessionId);
    
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
    
    broadcast(sessionId, progressState);
    saveSessions(); // Save after update
    res.json({ success: true });
});

// API endpoint for log messages (backward compatibility)
app.post('/api/progress/log', (req, res) => {
    const { sessionId, message } = req.body;
    
    if (!sessionId) {
        return res.status(400).json({ error: 'sessionId is required' });
    }
    
    const progressState = getSessionState(sessionId);
    if (message) {
        progressState.logs.push({
            timestamp: new Date().toISOString(),
            message: message
        });
        if (progressState.logs.length > 1000) {
            progressState.logs = progressState.logs.slice(-1000);
        }
        broadcast(sessionId, progressState);
        saveSessions(); // Save after update
    }
    res.json({ success: true });
});

// API endpoint to get current progress
app.get('/api/progress/:sessionId?', (req, res) => {
    const sessionId = req.params.sessionId || req.query.sessionId;
    
    if (!sessionId) {
        // Return list of active sessions
        const activeSessions = Array.from(sessions.entries()).map(([id, state]) => ({
            sessionId: id,
            status: state.status,
            currentStep: state.currentStep,
            progress: state.progress,
            createdAt: state.createdAt
        }));
        return res.json({ sessions: activeSessions });
    }
    
    const progressState = getSessionState(sessionId);
    res.json(progressState);
});

// Route to list all sessions (HTML page)
app.get('/', (req, res) => {
    const sessionId = req.query.sessionId;
    
    // If sessionId is provided, redirect to the session page
    if (sessionId) {
        return res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
    
    // Otherwise, show session list page
    const activeSessions = Array.from(sessions.entries()).map(([id, state]) => ({
        sessionId: id,
        status: state.status,
        currentStep: state.currentStep,
        progress: state.progress,
        createdAt: state.createdAt,
        startTime: state.startTime,
        endTime: state.endTime
    }));
    
    // Sort by creation time (newest first)
    activeSessions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Windows Installer - Session List</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        h1 {
            color: white;
            text-align: center;
            margin-bottom: 30px;
            font-size: 2.5em;
        }
        .sessions-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
        }
        .session-card {
            background: white;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .session-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 8px 12px rgba(0,0,0,0.2);
        }
        .session-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        .session-id {
            font-family: monospace;
            font-size: 0.9em;
            color: #666;
            word-break: break-all;
        }
        .status-badge {
            padding: 5px 10px;
            border-radius: 20px;
            font-size: 0.8em;
            font-weight: bold;
        }
        .status-idle { background: #e0e0e0; color: #666; }
        .status-running { background: #4caf50; color: white; }
        .status-completed { background: #2196f3; color: white; }
        .status-error { background: #f44336; color: white; }
        .progress-bar {
            width: 100%;
            height: 8px;
            background: #e0e0e0;
            border-radius: 4px;
            overflow: hidden;
            margin: 10px 0;
        }
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #4caf50, #8bc34a);
            transition: width 0.3s;
        }
        .session-info {
            font-size: 0.9em;
            color: #666;
            margin: 10px 0;
        }
        .session-link {
            display: block;
            margin-top: 15px;
            padding: 10px;
            background: #667eea;
            color: white;
            text-align: center;
            text-decoration: none;
            border-radius: 5px;
            transition: background 0.2s;
        }
        .session-link:hover {
            background: #5568d3;
        }
        .empty-state {
            text-align: center;
            color: white;
            padding: 60px 20px;
            background: rgba(255,255,255,0.1);
            border-radius: 10px;
            backdrop-filter: blur(10px);
        }
        .empty-state h2 {
            margin-bottom: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🪟 Windows Installer - Sessions</h1>
        ${activeSessions.length === 0 ? `
            <div class="empty-state">
                <h2>Chưa có session nào</h2>
                <p>Chạy script cài đặt để tạo session mới</p>
            </div>
        ` : `
            <div class="sessions-grid">
                ${activeSessions.map(session => `
                    <div class="session-card">
                        <div class="session-header">
                            <div class="session-id">${session.sessionId}</div>
                            <span class="status-badge status-${session.status}">${session.status}</span>
                        </div>
                        ${session.status === 'running' ? `
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${session.progress || 0}%"></div>
                            </div>
                            <div class="session-info">Tiến độ: ${session.progress || 0}%</div>
                        ` : ''}
                        ${session.currentStep ? `<div class="session-info">Bước: ${session.currentStep}</div>` : ''}
                        <div class="session-info">Tạo lúc: ${new Date(session.createdAt).toLocaleString('vi-VN')}</div>
                        ${session.startTime ? `<div class="session-info">Bắt đầu: ${new Date(session.startTime).toLocaleString('vi-VN')}</div>` : ''}
                        <a href="/?sessionId=${session.sessionId}" class="session-link">Xem chi tiết →</a>
                    </div>
                `).join('')}
            </div>
        `}
    </div>
</body>
</html>
    `;
    
    res.send(html);
});

// API endpoint to reset progress
app.post('/api/reset/:sessionId?', (req, res) => {
    const sessionId = req.params.sessionId || req.body.sessionId;
    
    if (!sessionId) {
        return res.status(400).json({ error: 'sessionId is required' });
    }
    
    const progressState = getSessionState(sessionId);
    progressState.status = 'idle';
    progressState.currentStep = '';
    progressState.progress = 0;
    progressState.totalSteps = 0;
    progressState.logs = [];
    progressState.startTime = null;
    progressState.endTime = null;
    progressState.error = null;
    
    broadcast(sessionId, progressState);
    saveSessions(); // Save after reset
    res.json({ success: true });
});

// WebSocket connection handler
wss.on('connection', (ws, req) => {
    // Extract sessionId from URL query parameter
    const url = new URL(req.url, `http://${req.headers.host}`);
    const sessionId = url.searchParams.get('sessionId');
    
    if (!sessionId) {
        ws.close(1008, 'sessionId is required');
        return;
    }
    
    ws.sessionId = sessionId;
    
    // Send current state to new client
    const progressState = getSessionState(sessionId);
    ws.send(JSON.stringify(progressState));
    
    ws.on('close', () => {
        console.log(`Client disconnected from session ${sessionId}`);
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

