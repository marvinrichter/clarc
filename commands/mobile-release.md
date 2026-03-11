---
description: Mobile release workflow — version bump, test, code signing, beta distribution (TestFlight / Firebase), and staged production rollout for iOS and Android.
---

# Mobile Release Workflow

Guide the user through a complete mobile app release cycle. Adapt based on platform (iOS, Android, or both) detected from `$ARGUMENTS` or by inspecting the repository structure.

## Detection

```bash
# Detect platforms
ls ios/ 2>/dev/null && echo "iOS detected"
ls android/ 2>/dev/null && echo "Android detected"
ls eas.json 2>/dev/null && echo "Expo/EAS detected"
ls Fastfile 2>/dev/null || ls fastlane/Fastfile 2>/dev/null && echo "Fastlane configured"
```

## Step 1 — Pre-Release Checks

```bash
# Verify clean working tree
git status

# Ensure on correct branch
git branch --show-current

# Verify tests pass before building
# Android
./gradlew testReleaseUnitTest

# iOS
bundle exec fastlane ios test

# Expo/React Native
npx jest --coverage
```

Abort if tests fail. Never release from a red build.

## Step 2 — Version + Build Number

```bash
# Derive build number from git commit count
BUILD_NUMBER=$(git rev-list HEAD --count)
echo "Build number: $BUILD_NUMBER"

# Android: update versionName in build.gradle.kts if releasing a new version
# iOS: update CFBundleShortVersionString in Info.plist or project.pbxproj
# Expo: update version in app.json / app.config.ts

# Tag the release
VERSION="2.1.0"  # from $ARGUMENTS or ask user
git tag -a "v${VERSION}-build${BUILD_NUMBER}" -m "Release v${VERSION} (build ${BUILD_NUMBER})"
```

## Step 3 — Code Signing Verification

**iOS:**
```bash
# Verify certificates are not expired
bundle exec fastlane match --readonly --type appstore
security find-identity -v -p codesigning | grep "Apple Distribution"
```

**Android:**
```bash
# Verify keystore is accessible
keytool -list -keystore $ANDROID_KEYSTORE_PATH -storepass $ANDROID_KEYSTORE_PASSWORD
```

If certificates are expired (iOS), run:
```bash
bundle exec fastlane match nuke distribution   # Revoke expired
bundle exec fastlane match appstore            # Regenerate
```

## Step 4 — Beta Build + Distribution

**iOS → TestFlight:**
```bash
bundle exec fastlane ios beta
# This runs: sync_signing → build_app → upload_to_testflight
# Wait for processing (~10-15 min) or use skip_waiting_for_build_processing: true
```

**Android → Firebase App Distribution:**
```bash
bundle exec fastlane android beta
# Or directly:
./gradlew bundleRelease
firebase appdistribution:distribute app/build/outputs/bundle/release/app-release.aab \
  --app $FIREBASE_APP_ID \
  --groups "qa-team"
```

**Expo / React Native → EAS:**
```bash
eas build --platform all --profile preview
eas submit --platform all --profile preview  # Submits to TestFlight + internal Play track
```

## Step 5 — Release Notes

Generate from git log since last release:

```bash
LAST_TAG=$(git describe --tags --abbrev=0 HEAD^)
echo "Changes since $LAST_TAG:"
git log ${LAST_TAG}..HEAD --oneline --no-merges

# Or with Fastlane
bundle exec fastlane run changelog_from_git_commits commits_count:20
```

Write release notes following the format:
```
What's new:
• [Feature] Short description of user-facing change
• [Fix] Short description of bug fixed
• [Performance] Short description of improvement
```

## Step 6 — Production Submission

Only proceed after beta testing sign-off from QA team.

**iOS App Store:**
```bash
# Submit binary already on TestFlight for review
bundle exec fastlane ios release
# Configures: phased_release: true (7-day rollout), submit_for_review: true
```

**Google Play — Staged Rollout:**
```bash
# Promote internal → production at 10%
bundle exec fastlane android release
# Uses: rollout: "0.1" (10%)

# After 24h monitoring, increase to 50%
bundle exec fastlane android promote_to_beta  # internal → open beta
# Then:
bundle exec fastlane run upload_to_play_store track:production rollout:0.5

# After successful monitoring, full rollout
bundle exec fastlane run upload_to_play_store track:production rollout:1.0
```

**Expo / React Native — OTA Update:**
```bash
# For JS-only changes (no native code): push OTA update (no store review needed)
eas update --branch production --message "v${VERSION} — hotfix"

# For native changes: full build + submit
eas build --platform all --profile production
eas submit --platform all --profile production
```

## Step 7 — Post-Release Monitoring

```bash
# Watch crash rates in Firebase Crashlytics (first 24h critical)
# Monitor ANR rate in Google Play Console
# Check TestFlight feedback notifications

# If issues detected, pause rollout immediately:
# Android: Play Console → Release → Pause rollout
# iOS: App Store Connect → Phased Release → Pause
```

## Rollback Plan

- **OTA (Expo/CodePush)**: Publish previous bundle version immediately
- **Android**: Halt rollout in Play Console; new fix release within 24h
- **iOS**: Cannot retract from App Store once live; expedite fix as new version

## Reference Skills

- `mobile-cicd-patterns` — code signing, Fastlane setup, build automation
- `flutter-patterns` — Flutter-specific CI/CD with EAS + Fastlane
- `deployment-patterns` — Canary, staged rollout strategy

## After This

- `/tdd` — add regression tests before the next release
- `/release` — cut the release after mobile build passes
