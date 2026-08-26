# Exilium Switch

<div align="center">

![Exilium Switch Banner](build/icon.png)

**Personal Use VPN Controller & Windows Resident Shield**  
*Built with Electron, React, TypeScript, Tailwind CSS, and sing-box Core*

[![Release](https://img.shields.io/badge/Release-v1.3-6366f1.svg?style=flat-square)]()
[![Platform](https://img.shields.io/badge/Platform-Windows%2010%20%7C%2011-0078d7.svg?style=flat-square)]()
[![Core](https://img.shields.io/badge/Engine-sing--box%20v1.11+-10b981.svg?style=flat-square)]()
[![License](https://img.shields.io/badge/License-MIT-gray.svg?style=flat-square)]()

</div>

---

## 🌟 Key Features

- 🛡️ **Amsterdam Resident Mode**: Automatic timezone masking to `W. Europe Standard Time` and complete Windows Geolocation service (`lfsvc`) lockdown.
- 🔒 **Zero-Leak DNS & IPv6 Isolation**: Physical interface loopback stubs (`127.0.0.1`), Smart Multi-Homed Name Resolution (SMHNR) prevention, and strict IPv6 cable isolation while preserving local `::1` loopbacks.
- ⚡ **sing-box TUN Architecture**: Direct kernel Wintun routing, split tunneling, and low-latency proxy forwarding.
- 📊 **Real-time Latency Monitor**: Dual-sample low-jitter European ping telemetry.
- 🎨 **Sleek Windows 11 Fluent UI**: Dark mode glassmorphism interface, custom glowing typography, real-time log console, and system tray integration.
- 📂 **100% User Managed Profiles**: Dynamic JSON profile importing and switching without bundled credentials.

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** >= 18.0.0
- **Windows 10 / 11** (64-bit)

### Installation

```bash
# Clone the repository
git clone https://github.com/nostro1337/Exilium-Switch.git

# Navigate to project directory
cd Exilium-Switch

# Install dependencies
npm install

# Run in development mode
npm run dev
```

### Production Build

```bash
# Compile and build standalone portable executable
npm run build
npx electron-builder --win portable
```

The output executable will be created in `release/Exilium Switch.exe`.

---

## 🛠️ Tech Stack

- **Desktop Framework**: Electron 34
- **Frontend**: React 18, TypeScript, Tailwind CSS, Framer Motion, Lucide Icons
- **Core Proxy Engine**: sing-box with Wintun driver
- **Build System**: Vite 6, electron-builder

---

<div align="center">
<sub>Designed & Developed with precision by <b>Nostro</b></sub>
</div>
