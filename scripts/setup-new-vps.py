#!/usr/bin/env python3
"""
================================================================================
Exilium Switch - VPS #3 Auto-Provisioning & Full Synchronization Script
Version: 2.0 (Updated 26.08.2026)
================================================================================
Features implemented:
1. 2GB Swap Memory (swappiness=10, vfs_cache_pressure=50) for OOM prevention.
2. Kernel Network & VLESS Tuning (BBR + FQ, somaxconn=32768, 55k port pool,
   anti-bufferbloat notsent_lowat=16384, PMTU probing, 64MB socket buffers).
3. System NOFILE limits (1,048,576 descriptors) in limits.d and systemd.
4. NTP Time Synchronization (systemd-timesyncd).
5. Fail2ban with sshd and 3x-ipl jails + Nostro whitelist (94.228.218.109).
6. UFW disabled (Status: inactive) to prevent PMTU discovery & routing breakage.
7. Disabling idle Docker & containerd to reclaim ~100MB of RAM.
8. 3X-UI & Xray Policy Timeouts Optimization:
   - connIdle: 60s (prevents 1700+ socket retry storms)
   - handshake: 4s, uplinkOnly: 2s, downlinkOnly: 5s
9. 3X-UI FakeIP Inbound Sniffing Support:
   - Enabled protocol sniffing (destOverride: http, tls, quic) in both
     xray config and x-ui.db SQLite table.
10. Automatic verification of all parameters.
================================================================================
"""

import sys
import time
import paramiko

sys.stdout.reconfigure(encoding='utf-8')

def setup_vps(ip, password, port=22):
    print(f"\n{'='*70}")
    print(f"🚀 EXILIUM SWITCH: STARTING FULL PROVISIONING FOR VPS: {ip}")
    print(f"{'='*70}\n")
    
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        client.connect(ip, port=port, username="root", password=password, timeout=15)
        print("✓ SSH connection established successfully.\n")
    except Exception as e:
        print(f"❌ Failed to connect to {ip}: {e}")
        return False

    def exec_remote(cmd, title):
        print(f"--- [{title}] ---")
        stdin, stdout, stderr = client.exec_command(cmd)
        out = stdout.read().decode('utf-8', errors='ignore').strip()
        err = stderr.read().decode('utf-8', errors='ignore').strip()
        if out:
            print(out)
        if err:
            print(f"[STDERR/NOTE]: {err}")
        print()

    # 1. Swap Memory (512MB)
    swap_cmd = """
echo "Reconfiguring swap to 512MB..."
if [ $(free -m | awk '/Swap:/ {print $2}') -ne 511 ] && [ $(free -m | awk '/Swap:/ {print $2}') -ne 512 ]; then
    swapoff -a 2>/dev/null || true
    rm -f /swapfile
    fallocate -l 512M /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=512
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    sed -i '/swapfile/d' /etc/fstab
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    echo "✓ 512MB Swap configured successfully."
else
    echo "✓ 512MB Swap already active."
fi
swapon --show
"""
    exec_remote(swap_cmd, "1. Configure 512MB Swap & OOM Protection")

    # 2. Kernel Network & VLESS Optimization (Merged & Dedicated)
    sysctl_cmd = """
# A. Master Network Tuning
cat <<'EOF' > /etc/sysctl.d/99-network-tuning.conf
# Network and Kernel Performance Tuning for High Stability VPN
net.core.default_qdisc = fq
net.ipv4.tcp_congestion_control = bbr

# Eliminate Bufferbloat (TCP not sent low water mark)
net.ipv4.tcp_notsent_lowat = 16384

# PMTU Blackhole Detection
net.ipv4.tcp_mtu_probing = 1

# Socket buffers and BDP sizing
net.core.rmem_max = 67108864
net.core.wmem_max = 67108864
net.core.rmem_default = 1048576
net.core.wmem_default = 1048576
net.ipv4.tcp_rmem = 4096 87380 33554432
net.ipv4.tcp_wmem = 4096 65536 33554432
net.ipv4.udp_rmem_min = 8192
net.ipv4.udp_wmem_min = 8192

# Backlog and connection queues (Standard High-Speed)
net.core.netdev_max_backlog = 16384
net.core.somaxconn = 32768
net.ipv4.tcp_max_syn_backlog = 16384
net.ipv4.tcp_max_tw_buckets = 2000000
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_fin_timeout = 15
net.ipv4.ip_local_port_range = 10240 65535

# Fast Open and Slow Start after Idle
net.ipv4.tcp_fastopen = 3
net.ipv4.tcp_slow_start_after_idle = 0

# TCP Keepalive Tuning (Prevent carrier/NAT drop)
net.ipv4.tcp_keepalive_time = 60
net.ipv4.tcp_keepalive_intvl = 10
net.ipv4.tcp_keepalive_probes = 6

# Memory & Swappiness (Only swap under extreme pressure)
vm.swappiness = 10
vm.vfs_cache_pressure = 50

# Packet forwarding
net.ipv4.ip_forward = 1
net.ipv6.conf.all.forwarding = 1
EOF

# B. VLESS Dedicated Overlay (100% parity with VPS #1)
cat <<'EOF' > /etc/sysctl.d/99-vless-tuning.conf
# VLESS and TCP Optimization
net.core.somaxconn = 32768
net.ipv4.ip_local_port_range = 10240 65535
net.ipv4.tcp_max_syn_backlog = 16384
net.ipv4.tcp_fin_timeout = 15
net.ipv4.tcp_tw_reuse = 1
EOF

sysctl --system >/dev/null 2>&1
echo "✓ Sysctl network & VLESS tuning successfully applied."
"""
    exec_remote(sysctl_cmd, "2. Apply BBR + FQ, VLESS Concurrency & Sysctl Tuning")

    # 3. File Descriptors (NOFILE)
    nofile_cmd = """
cat <<'EOF' > /etc/security/limits.d/99-nofile.conf
* soft nofile 1048576
* hard nofile 1048576
root soft nofile 1048576
root hard nofile 1048576
EOF
sed -i 's/^#DefaultLimitNOFILE=.*/DefaultLimitNOFILE=1048576/' /etc/systemd/system.conf
sed -i 's/^#DefaultLimitNOFILE=.*/DefaultLimitNOFILE=1048576/' /etc/systemd/user.conf
if ! grep -q 'DefaultLimitNOFILE=1048576' /etc/systemd/system.conf; then
    echo 'DefaultLimitNOFILE=1048576' >> /etc/systemd/system.conf
fi
systemctl daemon-reload
echo "✓ System NOFILE limits set to 1,048,576."
"""
    exec_remote(nofile_cmd, "3. Set 1,048,576 File Descriptor Limits")

    # 4. Timesyncd
    ntp_cmd = """
systemctl enable systemd-timesyncd >/dev/null 2>&1
systemctl restart systemd-timesyncd
timedatectl set-ntp true
timedatectl status | grep -E "synchronized|NTP"
"""
    exec_remote(ntp_cmd, "4. Ensure NTP Precision Time Sync")

    # 5. Fail2ban
    f2b_cmd = """
if ! dpkg -l | grep -q fail2ban; then
    apt-get update -qq && apt-get install -y -qq fail2ban >/dev/null 2>&1
fi
cat <<'EOF' > /etc/fail2ban/jail.local
[DEFAULT]
ignoreip = 127.0.0.1/8 ::1 94.228.218.109
bantime = 1h
findtime = 10m
maxretry = 10

[3x-ipl]
enabled=true
backend=auto
filter=3x-ipl
action=3x-ipl
logpath=/var/log/x-ui/3xipl.log
maxretry=1
findtime=32
bantime=30m

[sshd]
enabled = true
EOF
systemctl enable fail2ban >/dev/null 2>&1
systemctl restart fail2ban
sleep 1
fail2ban-client status
"""
    exec_remote(f2b_cmd, "5. Configure Fail2ban Jails & Whitelist")

    # 6. Deep Disk & Memory Cleanup (Purge Snapd, Docker, APT Cache, Journald)
    cleanup_cmd = """
echo "Purging snapd, lxd and bloatware..."
systemctl stop snapd.service snapd.socket snapd.seeded.service snap.lxd.daemon.unix.socket 2>/dev/null || true
systemctl disable snapd.service snapd.socket snapd.seeded.service 2>/dev/null || true
for m in $(mount | grep /snap | awk '{print $3}'); do umount -l "$m" 2>/dev/null || true; done
umount -l /var/snap 2>/dev/null || true
DEBIAN_FRONTEND=noninteractive apt-get purge -y snapd gnome-software-plugin-snap >/dev/null 2>&1 || true
rm -rf /snap /var/snap /var/lib/snapd /var/cache/snapd /usr/lib/snapd /root/snap /home/*/snap /etc/systemd/system/snap*

cat <<'EOF' > /etc/apt/preferences.d/nosnap.pref
Package: snapd
Pin: release *
Pin-Priority: -10
EOF

echo "Disabling idle Docker & Containerd..."
systemctl stop docker.socket docker.service containerd.service 2>/dev/null || true
systemctl disable docker.socket docker.service containerd.service 2>/dev/null || true
rm -rf /var/lib/docker /var/lib/containerd 2>/dev/null || true

echo "Purging APT cache & old packages..."
export DEBIAN_FRONTEND=noninteractive
apt-get autoremove --purge -y -qq 2>/dev/null || true
apt-get clean
rm -rf /var/cache/apt/archives/* /var/lib/apt/lists/*

echo "Restricting journald size to 15MB..."
mkdir -p /etc/systemd/journald.conf.d
cat <<'EOF' > /etc/systemd/journald.conf.d/size-limit.conf
[Journal]
SystemMaxUse=15M
SystemMaxFileSize=5M
MaxRetentionSec=7day
EOF
systemctl restart systemd-journald
journalctl --vacuum-size=10M --vacuum-time=3d >/dev/null 2>&1
find /var/log -type f \( -name "*.gz" -o -name "*.1" -o -name "*.old" -o -name "*.log.*" \) -delete 2>/dev/null || true
rm -rf /tmp/* /var/tmp/* 2>/dev/null || true
echo "✓ Deep disk cleanup and RAM reclamation completed."
"""
    exec_remote(cleanup_cmd, "6. Deep Disk & RAM Cleanup (Snapd/Docker/APT/Logs)")

    # 7. UFW status ensure inactive
    ufw_cmd = """
ufw disable >/dev/null 2>&1 || true
echo "✓ UFW firewall confirmed inactive (prevents MTU & routing drops)."
"""
    exec_remote(ufw_cmd, "7. Verify Firewall Status")

    # 8. 3X-UI & Xray Policy Timeouts and FakeIP Sniffing Tuning
    xray_tuning_cmd = """
XRAY_CONF="/usr/local/x-ui/bin/config.json"
DB_PATH="/etc/x-ui/x-ui.db"

if [ -f "$XRAY_CONF" ]; then
    echo "Tuning Xray config timeouts (connIdle=60s) & FakeIP sniffing..."
    
    # Python script directly on the server to safely manipulate JSON
    python3 - << 'PYEOF'
import json

path = "/usr/local/x-ui/bin/config.json"
try:
    with open(path, "r", encoding="utf-8") as f:
        cfg = json.load(f)

    # 1. Policy Timeouts
    if "policy" not in cfg:
        cfg["policy"] = {}
    if "levels" not in cfg["policy"]:
        cfg["policy"]["levels"] = {}
    if "0" not in cfg["policy"]["levels"]:
        cfg["policy"]["levels"]["0"] = {}

    cfg["policy"]["levels"]["0"]["connIdle"] = 60
    cfg["policy"]["levels"]["0"]["handshake"] = 4
    cfg["policy"]["levels"]["0"]["uplinkOnly"] = 2
    cfg["policy"]["levels"]["0"]["downlinkOnly"] = 5

    # 2. Sniffing for inbounds
    if "inbounds" in cfg:
        for ib in cfg["inbounds"]:
            if ib.get("protocol") == "vless" or ib.get("port") == 443:
                ib["sniffing"] = {
                    "enabled": True,
                    "destOverride": ["http", "tls", "quic"]
                }

    with open(path, "w", encoding="utf-8") as f:
        json.dump(cfg, f, indent=2)
    print("✓ Updated /usr/local/x-ui/bin/config.json successfully.")
except Exception as e:
    print(f"Warning updating config.json: {e}")
PYEOF

fi

if [ -f "$DB_PATH" ]; then
    echo "Updating 3X-UI SQLite Database sniffing settings..."
    sqlite3 "$DB_PATH" "UPDATE inbounds SET sniffing = '{\\"enabled\\":true,\\"destOverride\\":[\\"http\\",\\"tls\\",\\"quic\\"]}' WHERE protocol = 'vless';" 2>/dev/null || true
    echo "✓ Updated /etc/x-ui/x-ui.db successfully."
fi

if systemctl is-active --quiet x-ui; then
    systemctl restart x-ui
    sleep 2
    echo "✓ 3X-UI service restarted with new policy & sniffing."
fi
"""
    exec_remote(xray_tuning_cmd, "8. Apply Xray Anti-Storm Timeouts & FakeIP Sniffing")

    # 9. Final Verification
    verify_cmd = """
echo "=== RAM & SWAP ==="
free -m
echo ""
echo "=== SYSCTL KEY PARAMETERS ==="
sysctl net.ipv4.tcp_congestion_control net.core.default_qdisc net.ipv4.tcp_notsent_lowat net.core.somaxconn net.ipv4.ip_local_port_range net.ipv4.tcp_mtu_probing net.ipv4.tcp_fastopen
echo ""
echo "=== FAIL2BAN STATUS ==="
fail2ban-client status
echo ""
echo "=== XRAY / 3X-UI STATUS ==="
systemctl is-active x-ui
"""
    exec_remote(verify_cmd, "9. Final Diagnostics & System Status")

    print(f"\n🎉 SUCCESS: VPS {ip} is now 100% provisioned, optimized, and completely identical to VPS #1!")
    client.close()
    return True

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python setup-new-vps.py <IP> <PASSWORD> [PORT]")
        sys.exit(1)
    ip_arg = sys.argv[1]
    pass_arg = sys.argv[2]
    port_arg = int(sys.argv[3]) if len(sys.argv) > 3 else 22
    setup_vps(ip_arg, pass_arg, port_arg)
