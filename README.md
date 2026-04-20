# LEDGER

[![Expo](https://img.shields.io/badge/Expo-54-0A0A0A?logo=expo&logoColor=white)](https://expo.dev/)
[![React Native](https://img.shields.io/badge/React%20Native-0.81-61DAFB?logo=react&logoColor=0A0A0A)](https://reactnative.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Platform](https://img.shields.io/badge/Platform-Android%20%7C%20iOS%20%7C%20Web-1F2937)](#development)
[![License](https://img.shields.io/badge/License-MIT-166534)](#license)

LEDGER is a private, local-first personal finance application built with Expo and React Native. It is designed for users who want fast expense tracking, clear financial visibility, and strong on-device control without relying on a backend, cloud account, or telemetry stack.

## Why LEDGER

LEDGER is built around a simple operating model:

- Data remains local to the device by default
- Access is protected with a PIN and optional biometric unlock
- Exports and backups can be encrypted
- Day-to-day persistence uses a local SQLite database
- The application works without a remote API or account system

This makes the app suitable for users who prefer offline-first finance tracking with explicit control over storage and sharing.

## Feature Set

- Income and expense tracking
- Savings goals and savings movement history
- Assets and liabilities overview
- Borrowed and lent money tracking
- Budget envelopes
- Recurring entries
- Analytics and reporting views
- Encrypted import and export flows
- Auto-backup to device storage

## Security

- PIN-protected app access
- Optional biometric unlock on supported native devices
- Local SQLite persistence on device
- AES-GCM support for encrypted exports and backups
- No required remote sync or account-based access

## Technology

| Area | Stack |
|---|---|
| App Framework | Expo 54 |
| Runtime | React Native 0.81 |
| Navigation | Expo Router 6 |
| Language | TypeScript |
| Storage | `expo-sqlite` |
| Charts | `react-native-svg` |
| Local Authentication | `expo-local-authentication` |
| File Access | `expo-file-system` |

## Repository Layout

- `app/` — route-based screens and navigation structure
- `components/` — reusable UI components and flows
- `context/` — application state, unlock flow, and persistence orchestration
- `utils/` — crypto, SQLite storage, backup, analytics, and export helpers
- `assets/` — icons, splash assets, and store graphics

## Development

### Prerequisites

- Node.js 18 or newer
- npm
- Android Studio for Android development
- Xcode for iOS development

### Install

```bash
npm install
```

### Start

```bash
npm start
```

Platform-specific commands:

```bash
npm run android
npm run ios
npm run web
```

### Type Check

```bash
npm run typecheck
```

## Documentation

- Build and release instructions: [build.md](./build.md)

## License

This project is licensed under the MIT License.
