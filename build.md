# Build Guide

This document covers local builds, static export, and EAS build profiles for LEDGER.

## Prerequisites

- Node.js 18+
- npm
- Android Studio for Android builds
- Xcode for iOS builds
- EAS CLI if you plan to use remote builds:

```bash
npm install -g eas-cli
```

## Install Dependencies

```bash
npm install
```

## Local Development Builds

Start the Expo development server:

```bash
npm start
```

Run directly on a platform:

```bash
npm run android
npm run ios
npm run web
```

## Static Web Export

Create a web export with:

```bash
npm run build
```

This runs:

```bash
expo export
```

## EAS Build Profiles

The project defines these profiles in `eas.json`:

- `development`
  Development client build, internal distribution, Android APK
- `debug`
  Internal Android debug APK
- `release`
  Internal Android release APK
- `production`
  Android App Bundle (`.aab`) for production delivery

## EAS Build Commands

Examples:

```bash
eas build --platform android --profile development
eas build --platform android --profile debug
eas build --platform android --profile release
eas build --platform android --profile production
```

For iOS, add an iOS profile to `eas.json` if you want remote iOS builds.

## App Identifiers

Current native identifiers from `app.json`:

- Android package: `com.ryanshelby.ledger`
- iOS bundle identifier: `com.ryanshelby.ledger`

## Notes

- The app uses Expo Router as the main entry point.
- Native biometric support is configured through `expo-local-authentication`.
- If native configuration changes are made, rebuild the app binary before testing those changes.
