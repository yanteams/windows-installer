const API_URL = window.location.origin;
let ws = null;
let reconnectInterval = null;
let reconnectTimeout = null;
let elapsedInterval = null;
let autoScroll = true;
let lastProgress = 0;
let startTime = null;
let estimatedTime = null;

// Get sessionId from URL
function getSessionId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('sessionId') || null;
}

// Check if we're on the session list page
function isSessionListPage() {
    return window.location.pathname === '/' && !getSessionId();
}

// Initialize WebSocket connection
function connectWebSocket() {
    const sessionId = getSessionId();
    if (!sessionId) {
        // If no sessionId and we're on the main page, redirect to session list
        if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
            // Already on root, just show error
            console.warn('No sessionId found in URL');
            updateConnectionStatus('error');
            showToast('Không tìm thấy Session ID. Vui lòng truy cập từ link trong script cài đặt.', 'error');
            return;
        }
        console.error('No sessionId found in URL');
        updateConnectionStatus('error');
        showToast('Không tìm thấy Session ID trong URL', 'error');
        return;
    }
    
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}?sessionId=${sessionId}`;
    
    updateConnectionStatus('connecting');
    
    ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
        console.log('WebSocket connected');
        updateConnectionStatus('connected');
        if (reconnectInterval) {
            clearInterval(reconnectInterval);
            reconnectInterval = null;
        }
        if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
            reconnectTimeout = null;
        }
        showToast('Đã kết nối thành công', 'success');
    };
    
    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            updateUI(data);
        } catch (e) {
            console.error('Failed to parse WebSocket message:', e);
        }
    };
    
    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        updateConnectionStatus('error');
    };
    
    ws.onclose = () => {
        console.log('WebSocket disconnected');
        updateConnectionStatus('disconnected');
        if (!reconnectInterval) {
            reconnectTimeout = setTimeout(() => {
                showToast('Đang kết nối lại...', 'info');
                reconnectInterval = setInterval(() => {
                    if (!ws || ws.readyState === WebSocket.CLOSED) {
                        connectWebSocket();
                    }
                }, 3000);
            }, 1000);
        }
    };
}

// Update connection status
function updateConnectionStatus(status) {
    const statusEl = document.getElementById('connectionStatus');
    const textEl = document.getElementById('connectionText');
    const dotEl = statusEl.querySelector('.connection-dot');
    
    statusEl.className = `connection-status ${status}`;
    
    const statusMap = {
        'connecting': { text: 'Đang kết nối...', color: '#ff9800' },
        'connected': { text: 'Đã kết nối', color: '#4CAF50' },
        'disconnected': { text: 'Mất kết nối', color: '#f44336' },
        'error': { text: 'Lỗi kết nối', color: '#f44336' }
    };
    
    const statusInfo = statusMap[status] || statusMap['disconnected'];
    textEl.textContent = statusInfo.text;
    dotEl.style.backgroundColor = statusInfo.color;
}

// Update UI with progress data
function updateUI(data) {
    // Update status
    const statusIndicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');
    
    statusIndicator.className = `status-indicator ${data.status}`;
    
    const statusMap = {
        'idle': 'Đang chờ',
        'running': 'Đang chạy',
        'completed': 'Hoàn thành',
        'error': 'Lỗi'
    };
    statusText.textContent = statusMap[data.status] || data.status;
    
    // Update progress bar with animation
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const progressPercent = document.getElementById('progressPercent');
    const progress = data.progress || 0;
    
    // Animate progress change
    if (Math.abs(progress - lastProgress) > 0.1) {
        progressFill.style.width = `${progress}%`;
        progressText.textContent = `${Math.round(progress)}%`;
        progressPercent.textContent = `${Math.round(progress)}%`;
        
        // Show notification for significant progress changes
        if (progress - lastProgress >= 5) {
            showToast(`Tiến độ: ${Math.round(progress)}%`, 'info');
        }
        
        lastProgress = progress;
    }
    
    // Update current step
    const currentStep = document.getElementById('currentStep');
    const stepMessage = document.getElementById('stepMessage');
    
    if (data.currentStep) {
        currentStep.textContent = data.currentStep;
        if (data.message) {
            stepMessage.textContent = data.message;
        }
        
        // Show toast for new steps
        if (data.currentStep && data.currentStep !== currentStep.dataset.lastStep) {
            showToast(data.currentStep, 'info');
            currentStep.dataset.lastStep = data.currentStep;
        }
    }
    
    // Update time info
    updateTimeInfo(data);
    
    // Update stats
    updateStats(data);
    
    // Update logs
    updateLogs(data.logs || []);
    
    // Update error section
    const errorSection = document.getElementById('errorSection');
    const errorMessage = document.getElementById('errorMessage');
    
    if (data.error) {
        errorSection.style.display = 'block';
        errorMessage.textContent = data.error;
        showToast(`Lỗi: ${data.error}`, 'error');
    } else {
        errorSection.style.display = 'none';
    }
    
    // Show completion notification
    if (data.status === 'completed' && data.status !== document.body.dataset.lastStatus) {
        showToast('🎉 Cài đặt hoàn tất!', 'success');
        document.body.dataset.lastStatus = 'completed';
    }
}

// Update time information
function updateTimeInfo(data) {
    const startTimeEl = document.getElementById('startTime');
    const elapsedTimeEl = document.getElementById('elapsedTime');
    const elapsedTimeStat = document.getElementById('elapsedTimeStat');
    const estimatedTimeContainer = document.getElementById('estimatedTimeContainer');
    const estimatedTimeEl = document.getElementById('estimatedTime');
    
    if (data.startTime) {
        startTime = new Date(data.startTime);
        startTimeEl.textContent = start.toLocaleString('vi-VN');
        
        if (data.status === 'running') {
            if (!elapsedInterval) {
                elapsedInterval = setInterval(() => {
                    if (startTime) {
                        const elapsed = Math.floor((new Date() - startTime) / 1000);
                        const elapsedStr = formatTime(elapsed);
                        elapsedTimeEl.textContent = elapsedStr;
                        elapsedTimeStat.textContent = elapsedStr;
                        
                        // Estimate remaining time
                        if (data.progress > 0 && data.progress < 100) {
                            const elapsedSeconds = elapsed;
                            const progressDecimal = data.progress / 100;
                            const totalEstimated = elapsedSeconds / progressDecimal;
                            const remaining = totalEstimated - elapsedSeconds;
                            estimatedTimeEl.textContent = formatTime(Math.max(0, Math.round(remaining)));
                            estimatedTimeContainer.style.display = 'flex';
                        }
                    }
                }, 1000);
            }
        } else {
            if (elapsedInterval) {
                clearInterval(elapsedInterval);
                elapsedInterval = null;
            }
            if (data.endTime) {
                const elapsed = Math.floor((new Date(data.endTime) - startTime) / 1000);
                elapsedTimeEl.textContent = formatTime(elapsed);
                elapsedTimeStat.textContent = formatTime(elapsed);
                estimatedTimeContainer.style.display = 'none';
            }
        }
    } else {
        startTimeEl.textContent = '-';
        elapsedTimeEl.textContent = '00:00:00';
        elapsedTimeStat.textContent = '00:00:00';
        estimatedTimeContainer.style.display = 'none';
    }
}

// Update statistics
function updateStats(data) {
    const logCount = document.getElementById('logCount');
    logCount.textContent = (data.logs || []).length;
}

// Format time as HH:MM:SS
function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// Store logs globally for filtering
let storedLogs = [];

// Update logs display
function updateLogs(logs) {
    storedLogs = logs;
    sessionStorage.setItem('currentLogs', JSON.stringify(logs));
    
    const logsContainer = document.getElementById('logsContainer');
    const filterValue = document.getElementById('logFilter').value.toLowerCase();
    
    if (logs.length === 0) {
        logsContainer.innerHTML = '<div class="log-empty">Chưa có nhật ký</div>';
        return;
    }
    
    // Remove empty message
    const emptyMsg = logsContainer.querySelector('.log-empty');
    if (emptyMsg) {
        emptyMsg.remove();
    }
    
    // Filter logs
    let displayLogs = logs;
    if (filterValue) {
        displayLogs = logs.filter(log => {
            const message = typeof log === 'string' ? log : log.message;
            return message.toLowerCase().includes(filterValue);
        });
    }
    
    // Keep last 500 for performance
    displayLogs = displayLogs.slice(-500);
    
    // Build log HTML
    const scrollBefore = logsContainer.scrollHeight - logsContainer.scrollTop;
    logsContainer.innerHTML = displayLogs.map((log, index) => {
        const message = typeof log === 'string' ? log : log.message;
        const timestamp = log.timestamp ? new Date(log.timestamp).toLocaleTimeString('vi-VN') : '';
        let className = 'log-entry';
        
        // Detect log type by content
        if (message.toLowerCase().includes('error') || message.includes('ERROR') || message.includes('***** ERROR')) {
            className += ' error';
        } else if (message.toLowerCase().includes('warn') || message.includes('Warning')) {
            className += ' warning';
        } else if (message.toLowerCase().includes('success') || message.includes('*****') || message.includes('done')) {
            className += ' success';
        } else if (message.toLowerCase().includes('info')) {
            className += ' info';
        }
        
        return `
            <div class="${className}" data-index="${index}">
                ${timestamp ? `<span class="log-timestamp">[${timestamp}]</span>` : ''}
                <span class="log-message">${escapeHtml(message)}</span>
            </div>
        `;
    }).join('');
    
    // Auto scroll to bottom if enabled
    if (autoScroll && !filterValue) {
        logsContainer.scrollTop = logsContainer.scrollHeight;
    } else if (filterValue) {
        // Maintain scroll position when filtering
        logsContainer.scrollTop = logsContainer.scrollHeight - scrollBefore;
    }
}

// Show toast notification
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Remove after delay
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Event listeners
document.getElementById('clearLogs').addEventListener('click', () => {
    if (confirm('Bạn có chắc muốn xóa nhật ký?')) {
        const sessionId = getSessionId();
        if (sessionId) {
            fetch(`${API_URL}/api/reset/${sessionId}`, { method: 'POST' })
                .then(() => {
                    showToast('Đã xóa nhật ký', 'success');
                    setTimeout(() => location.reload(), 500);
                })
                .catch(err => {
                    console.error('Failed to clear logs:', err);
                    showToast('Không thể xóa nhật ký', 'error');
                });
        } else {
            showToast('Không tìm thấy Session ID', 'error');
        }
    }
});

document.getElementById('autoScrollBtn').addEventListener('click', () => {
    autoScroll = !autoScroll;
    const btn = document.getElementById('autoScrollBtn');
    if (autoScroll) {
        btn.classList.add('active');
        const logsContainer = document.getElementById('logsContainer');
        logsContainer.scrollTop = logsContainer.scrollHeight;
    } else {
        btn.classList.remove('active');
    }
});

document.getElementById('logFilter').addEventListener('input', (e) => {
    const logs = storedLogs.length > 0 ? storedLogs : JSON.parse(sessionStorage.getItem('currentLogs') || '[]');
    // Re-render logs with filter
    const logsContainer = document.getElementById('logsContainer');
    const filterValue = e.target.value.toLowerCase();
    
    if (logs.length === 0) {
        logsContainer.innerHTML = '<div class="log-empty">Chưa có nhật ký</div>';
        return;
    }
    
    const emptyMsg = logsContainer.querySelector('.log-empty');
    if (emptyMsg) {
        emptyMsg.remove();
    }
    
    let displayLogs = logs;
    if (filterValue) {
        displayLogs = logs.filter(log => {
            const message = typeof log === 'string' ? log : log.message;
            return message.toLowerCase().includes(filterValue);
        });
    }
    
    displayLogs = displayLogs.slice(-500);
    
    const scrollBefore = logsContainer.scrollHeight - logsContainer.scrollTop;
    logsContainer.innerHTML = displayLogs.map((log, index) => {
        const message = typeof log === 'string' ? log : log.message;
        const timestamp = log.timestamp ? new Date(log.timestamp).toLocaleTimeString('vi-VN') : '';
        let className = 'log-entry';
        
        if (message.toLowerCase().includes('error') || message.includes('ERROR') || message.includes('***** ERROR')) {
            className += ' error';
        } else if (message.toLowerCase().includes('warn') || message.includes('Warning')) {
            className += ' warning';
        } else if (message.toLowerCase().includes('success') || message.includes('*****') || message.includes('done')) {
            className += ' success';
        } else if (message.toLowerCase().includes('info')) {
            className += ' info';
        }
        
        return `
            <div class="${className}" data-index="${index}">
                ${timestamp ? `<span class="log-timestamp">[${timestamp}]</span>` : ''}
                <span class="log-message">${escapeHtml(message)}</span>
            </div>
        `;
    }).join('');
    
    if (autoScroll && !filterValue) {
        logsContainer.scrollTop = logsContainer.scrollHeight;
    } else {
        logsContainer.scrollTop = logsContainer.scrollHeight - scrollBefore;
    }
});

// Fetch initial state and connect WebSocket
const currentSessionId = getSessionId();
if (currentSessionId) {
    // Fetch initial state
    fetch(`${API_URL}/api/progress/${currentSessionId}`)
        .then(res => res.json())
        .then(data => {
            storedLogs = data.logs || [];
            sessionStorage.setItem('currentLogs', JSON.stringify(storedLogs));
            updateUI(data);
        })
        .catch(err => {
            console.error('Failed to fetch initial state:', err);
            showToast('Không thể tải trạng thái ban đầu', 'error');
        });
    
    // Connect WebSocket
    connectWebSocket();
} else {
    // Show message that sessionId is required
    document.body.innerHTML = `
        <div style="text-align: center; padding: 50px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center;">
            <div style="background: white; padding: 40px; border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); max-width: 600px;">
                <h1 style="color: #333; margin-bottom: 20px;">⚠️ Session ID Required</h1>
                <p style="color: #666; margin-bottom: 15px;">Vui lòng truy cập từ link được cung cấp trong script cài đặt.</p>
                <p style="color: #666; margin-bottom: 15px;">Link có dạng: <code style="background: #f5f5f5; padding: 5px 10px; border-radius: 5px; font-family: monospace;">http://SERVER_IP:PORT?sessionId=install-xxx</code></p>
                <p style="margin-top: 30px;"><a href="/" style="color: #667eea; text-decoration: none; font-weight: bold;">← Quay lại danh sách sessions</a></p>
            </div>
        </div>
    `;
}

// Refresh on visibility change
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && (!ws || ws.readyState !== WebSocket.OPEN)) {
        connectWebSocket();
    }
});

