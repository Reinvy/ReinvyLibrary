---
title: "React Native CI CD Guide"
description: "A practical guide to shipping React Native apps with EAS Build, fastlane, managed code signing, beta channels, OTA updates, and release monitoring that catches regressions before users do."
category: "frontend"
technology: "react-native"
difficulty: "advanced"
type: "guide"
locale: "en"
---

# React Native CI CD Guide

## Introduction

A React Native release is not one artifact but four: an iOS binary, an Android binary, the JavaScript bundle each of them loads, and the metadata that tells testers and stores what changed. Most release pain comes from letting these drift — a build signed with the wrong keystore, an OTA update pushed to a channel no build reads, or a `versionCode` rejected by Play Console after a forty-minute build.

This guide keeps them in lockstep: EAS Build for compiled artifacts, fastlane where you need native lanes or store metadata, credentials held in one managed place, and EAS Update for JavaScript-only fixes behind an explicit runtime version contract. The result is a release you can repeat on a Friday afternoon without holding your breath.

## Best Practices

### Encode Environments as Build Profiles

Every release problem that starts with "it worked on the preview build" is a configuration problem. `eas.json` profiles should map one-to-one to environments — `development` (dev client, internal), `preview` (internal testers, staging API), `production` (store binaries) — and each profile owns its own `env`, channel, and distribution mode — see the production and preview profiles in Step 2. Nothing about an environment should live in a developer's shell.

### Keep Signing Credentials in Exactly One Place

A keystore in the repo, a provisioning profile on a laptop, and a CI secret that disagrees with both is the classic three-way signing failure. Pick one owner: EAS-managed credentials (`eas credentials`) or your own keystore uploaded once as a base64 CI secret. The rule that matters is that no human needs signing material locally to cut a release — CI must build with only a token.

```bash
# Store the Android keystore once, as CI secrets
base64 -i release.keystore | pbcopy   # -> ANDROID_KEYSTORE_BASE64
# Never commit *.keystore, *.jks, *.p12, or *.mobileprovision
```

### Derive Version and Build Numbers Mechanically

Hand-edited `versionCode` and `buildNumber` cause rejected uploads and duplicate-build confusion. Set `appVersionSource: "remote"` so EAS tracks them, let `autoIncrement` bump on every production build, and tag the commit with the marketing version you intend to ship. If a build number must be reproducible, compute it from the commit count — compute it, never type it.

### Ship JavaScript Through OTA, Guarded by Runtime Version

EAS Update can deliver a JS fix in minutes, and it can also brick an app that expects a native module it does not have. Pin `runtimeVersion.policy` to `appVersion` (or `fingerprint` for stricter guarantees) so an update only reaches binaries whose native surface matches. Treat OTA as a fast lane for fixes, not a substitute for store review when permissions or native code change.

```bash
# Safe: JS-only fix on the production channel
eas update --branch production --message "fix: correct checkout total rounding"
```

### Gate Promotion on Checks and Instrument the Release

Build only what passed typecheck, lint, and tests, and promote by submitting the same artifact rather than rebuilding — a production rebuild means the binary testers approved is not the binary users receive. And a release without crash reporting is a blind rollout. Upload source maps and debug symbols at build time, tag events with app version and OTA channel, and use staged rollout (Play Console percentages, phased release on App Store Connect) so a bad build reaches five percent of users rather than all of them.

## Implementation Steps

### Step 1: Prepare the Project

Install the EAS CLI, link the project, and add `expo-updates`. The project ID is what CI authenticates against, so it belongs in `app.config.ts`.

```bash
npm install --global eas-cli
eas init
npx expo install expo-updates
```

```typescript
// app.config.ts
export default {
    expo: {
        name: 'Reinvy',
        slug: 'reinvy',
        version: '2.4.0',
        runtimeVersion: { policy: 'appVersion' },
        updates: { url: 'https://u.expo.dev/00000000-0000-0000-0000-000000000000' },
        extra: { eas: { projectId: '00000000-0000-0000-0000-000000000000' } },
    },
};
```

### Step 2: Define Build, Submit, and Update Profiles

`eas.json` is the contract CI reads. Include a `submit` block so store upload is one command, and set `appVersionSource` at the top level.

```json
{
    "cli": { "version": ">= 12.0.0", "appVersionSource": "remote" },
    "build": {
        "development": { "developmentClient": true, "distribution": "internal" },
        "preview": { "distribution": "internal", "channel": "preview" },
        "production": { "channel": "production", "autoIncrement": true }
    },
    "submit": { "production": {} }
}
```

### Step 3: Authenticate CI Without a Laptop

Create an Expo access token, store it as `EXPO_TOKEN`, and let the pipeline act as a machine identity. For stores, `eas submit` accepts an App Store Connect API key and a Play service account JSON, both injected as secrets.

### Step 4: Build the Pipeline

One workflow, one job, conditional steps: checks on every run, a preview build on pull requests, a production build plus submit on a version tag. `concurrency` stops two releases racing over the same build number.

```yaml
name: release
on:
    push: { tags: ['v*'] }
    pull_request:

concurrency:
    group: release-${{ github.ref }}
    cancel-in-progress: false

jobs:
    release:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v4
            - uses: actions/setup-node@v4
              with: { node-version: 20, cache: npm }
            - run: npm ci
            - run: npx tsc --noEmit && npm test -- --ci
            - if: github.event_name == 'pull_request'
              run: npx eas-cli build --profile preview --platform all --non-interactive
              env: { EXPO_TOKEN: '${{ secrets.EXPO_TOKEN }}' }
            - if: startsWith(github.ref, 'refs/tags/v')
              run: npx eas-cli build --profile production --platform all --non-interactive --auto-submit
              env: { EXPO_TOKEN: '${{ secrets.EXPO_TOKEN }}' }
```

### Step 5: Add fastlane Where Native Lanes Are Required

EAS covers most needs, but fastlane still wins for store metadata, screenshots, and multi-target iOS projects. Keep the Fastfile thin — build and upload — and let the workflow own orchestration.

```ruby
# fastlane/Fastfile
platform :ios do
  lane :beta do
    upload_to_testflight(ipa: ENV.fetch("IPA_PATH"), skip_waiting_for_build_processing: true)
  rescue => e
    UI.user_error!("TestFlight upload failed: #{e.message}")
  end
end
```

### Step 6: Publish and Verify OTA Updates

Publish to the channel the build actually reads, then confirm the update is visible on that channel before announcing it. A channel typo fails silently: the upload succeeds and nothing reaches users.

```bash
eas update --branch production --message "fix: cart total rounding" --non-interactive
eas channel:view production --json | jq '.updateBranch.name, .runtimeVersion'
```

### Step 7: Wire Monitoring to the Release

Connect Sentry in the same commit that changes build config, stamp the OTA channel into the release tag, and upload source maps on every build so stack traces are readable. Then watch three numbers: crash-free sessions (above 99.5%), new-version adoption within 48 hours, and OTA success rate — a rollout stuck at five percent usually means a broken update check, not slow users.

```typescript
// src/monitoring.ts
import * as Sentry from '@sentry/react-native';
import * as Updates from 'expo-updates';

Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    release: `${Updates.runtimeVersion}@${Updates.updateId ?? 'embedded'}`,
    environment: __DEV__ ? 'development' : 'production',
    tracesSampleRate: 0.2,
});
```
