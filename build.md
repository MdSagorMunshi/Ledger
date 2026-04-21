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
  Internal Android release APKs with ABI splits and a universal APK
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

## Local Android Release APK Outputs

Run the release build from the native Android project:

```bash
cd android
./gradlew assembleRelease
```

With ABI splits enabled, the release output directory will contain APKs for:

- `armeabi-v7a`
- `arm64-v8a`
- `x86`
- `x86_64`
- `universal`

Expected output directory:

```bash
android/app/build/outputs/apk/release/
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

## Android Release Signing

The Android release build now expects `android/key.properties` with:

```properties
storeFile=keystores/ledger-release.jks
storePassword=...
keyAlias=...
keyPassword=...
```

The keystore file should exist at:

```bash
android/keystores/ledger-release.jks
```

If `android/key.properties` is incomplete, release builds will fail with a clear signing error instead of falling back to the debug keystore.
