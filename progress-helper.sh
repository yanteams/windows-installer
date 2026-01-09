#!/bin/bash
# Helper script to report progress to the backend server

PROGRESS_PORT=${PROGRESS_PORT:-8080}
PROGRESS_SESSION_ID=${PROGRESS_SESSION_ID:-}
PROGRESS_URL="http://localhost:${PROGRESS_PORT}/api/progress"

# Report progress update
report_progress() {
    local step="$1"
    local progress="$2"
    local status="${3:-running}"
    local message="$4"
    
    # Skip if no session ID
    [ -z "$PROGRESS_SESSION_ID" ] && return 0
    
    local payload="{\"sessionId\":\"$PROGRESS_SESSION_ID\""
    [ -n "$step" ] && payload="${payload},\"step\":\"$step\""
    [ -n "$progress" ] && payload="${payload},\"progress\":$progress"
    [ -n "$status" ] && payload="${payload},\"status\":\"$status\""
    [ -n "$message" ] && payload="${payload},\"message\":\"$message\""
    payload="${payload}}"
    
    curl -s -X POST "$PROGRESS_URL" \
        -H "Content-Type: application/json" \
        -d "$payload" >/dev/null 2>&1 || true
}

# Report error
report_error() {
    local error_msg="$1"
    report_progress "" 0 "error" "$error_msg"
}

# Report log message
report_log() {
    local message="$1"
    [ -z "$PROGRESS_SESSION_ID" ] && return 0
    
    curl -s -X POST "${PROGRESS_URL}/log" \
        -H "Content-Type: application/json" \
        -d "{\"sessionId\":\"$PROGRESS_SESSION_ID\",\"message\":\"$message\"}" >/dev/null 2>&1 || true
}

# Initialize progress tracking
init_progress() {
    local total_steps="$1"
    report_progress "Khởi tạo" 0 "running" "Bắt đầu quá trình cài đặt..."
}

