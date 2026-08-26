# ==============================================================================
# Exilium Switch - Windows TCP/IP & Network Latency Optimizer
# Run in Administrator PowerShell to apply optimal TCP stack parameters
# ==============================================================================

Write-Host ">>> Applying Windows TCP/IP Network Optimizations..." -ForegroundColor Cyan

# 1. Enable TCP Auto-Tuning (Normal) - Dynamic sliding window for high speed & low jitter
netsh int tcp set global autotuninglevel=normal

# 2. Enable Receive Side Scaling (RSS) - Distribute network packet processing across CPU cores
netsh int tcp set global rss=enabled

# 3. Enable Fast Open (TCP Fast Open)
netsh int tcp set global fastopen=enabled
netsh int tcp set global fastopenfallback=enabled

# 4. Disable TCP Timestamps (Reduces 12-byte header overhead per packet)
netsh int tcp set global timestamps=disabled

# 5. Set Initial Retransmission Timeout (RTO) to 2000ms for stable high-RTT recovery
netsh int tcp set global initialRto=2000

# 6. Optimize Congestion Provider (CTCP on Windows 10/11)
try {
    netsh int tcp set supplemental template=custom congestionprovider=ctcp
} catch {
    Write-Host "Custom congestion provider template already configured or not supported on this build." -ForegroundColor Yellow
}

# 7. Disable Large Send Offload (LSO) fragmentation issues if needed (optional)
# 8. Flush DNS Cache
ipconfig /flushdns

Write-Host ">>> Windows TCP/IP Stack Successfully Optimized for High-Stability VPN!" -ForegroundColor Green
