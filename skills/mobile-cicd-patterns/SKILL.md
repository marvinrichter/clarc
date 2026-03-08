# Skill: Mobile CI/CD Patterns

## When to Activate

- Setting up automated iOS or Android builds in CI
- Configuring code signing for TestFlight or App Store submission
- Implementing beta distribution via TestFlight or Firebase App Distribution
- Managing certificates and provisioning profiles with Fastlane match
- Setting up OTA (Over-the-Air) updates with Expo EAS or CodePush
- Automating App Store / Google Play submission
- Configuring release versioning from Git tags

---

## Code Signing — iOS

### Why It's Complex

Apple requires every iOS binary to be signed with a certificate (proving identity) tied to a provisioning profile (proving the app is authorized for specific devices or the App Store). In CI, you need these without a GUI.

### Fastlane match (recommended for teams)

`match` stores certificates and profiles in a Git repository (or S3/Google Cloud Storage), encrypted with a password. Any CI machine or developer can sync them with one command.

```ruby
# Matchfile
git_url("https://github.com/myorg/ios-certificates")
storage_mode("git")
type("appstore")  # or "development", "adhoc"
app_identifier(["com.myapp.ios"])
username("ci@myorg.com")

# Fastfile
lane :sync_signing do
  match(
    type: "appstore",
    readonly: is_ci,           # CI: read-only; developers: can update
    keychain_name: "build.keychain",
    keychain_password: ENV["MATCH_KEYCHAIN_PASSWORD"],
  )
end

lane :build_ios do
  sync_signing
  build_app(
    scheme: "MyApp",
    export_method: "app-store",
    output_directory: "./build",
    output_name: "MyApp.ipa",
  )
end
```

**GitHub Actions: temporary keychain for CI**

```yaml
- name: Install certificates via match
  env:
    MATCH_PASSWORD: ${{ secrets.MATCH_PASSWORD }}
    MATCH_GIT_BASIC_AUTHORIZATION: ${{ secrets.MATCH_GIT_TOKEN }}
    KEYCHAIN_PASSWORD: ${{ secrets.KEYCHAIN_PASSWORD }}
  run: |
    security create-keychain -p "$KEYCHAIN_PASSWORD" build.keychain
    security default-keychain -s build.keychain
    security unlock-keychain -p "$KEYCHAIN_PASSWORD" build.keychain
    security set-keychain-settings -lut 21600 build.keychain
    bundle exec fastlane sync_signing
```

### Manual Certificate Install (simpler for small teams)

```yaml
# GitHub Actions: using apple-actions/import-codesign-certs
- uses: apple-actions/import-codesign-certs@v3
  with:
    p12-file-base64: ${{ secrets.CERTIFICATES_P12 }}
    p12-password: ${{ secrets.CERTIFICATES_P12_PASSWORD }}

- uses: apple-actions/download-provisioning-profiles@v3
  with:
    bundle-id: com.myapp.ios
    issuer-id: ${{ secrets.APPSTORE_ISSUER_ID }}
    api-key-id: ${{ secrets.APPSTORE_KEY_ID }}
    api-private-key: ${{ secrets.APPSTORE_PRIVATE_KEY }}
```

---

## Code Signing — Android

```kotlin
// app/build.gradle.kts — release signing from environment variables
android {
    signingConfigs {
        create("release") {
            storeFile = file(System.getenv("ANDROID_KEYSTORE_PATH") ?: "debug.keystore")
            storePassword = System.getenv("ANDROID_KEYSTORE_PASSWORD") ?: ""
            keyAlias = System.getenv("ANDROID_KEY_ALIAS") ?: ""
            keyPassword = System.getenv("ANDROID_KEY_PASSWORD") ?: ""
        }
    }
    buildTypes {
        release {
            signingConfig = signingConfigs.getByName("release")
            isMinifyEnabled = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }
}
```

**GitHub Actions: decode base64 keystore secret**

```yaml
- name: Decode Android keystore
  run: |
    echo "${{ secrets.ANDROID_KEYSTORE_BASE64 }}" | base64 -d > app/release.keystore
  env:
    ANDROID_KEYSTORE_PATH: app/release.keystore
    ANDROID_KEYSTORE_PASSWORD: ${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
    ANDROID_KEY_ALIAS: ${{ secrets.ANDROID_KEY_ALIAS }}
    ANDROID_KEY_PASSWORD: ${{ secrets.ANDROID_KEY_PASSWORD }}

- name: Build release AAB
  run: ./gradlew bundleRelease
```

**Play App Signing (recommended since 2021):** Upload a `.aab` signed with your upload keystore. Google re-signs with the final distribution keystore. Protects against key loss — Google holds the distribution key.

---

## Fastlane — Core Workflow

```ruby
# Fastfile — shared lanes for both platforms

# ──── iOS Lanes ────────────────────────────────────────────────────────────────
platform :ios do
  lane :test do
    run_tests(scheme: "MyAppTests", devices: ["iPhone 16"])
  end

  lane :beta do
    test
    sync_signing
    increment_build_number(
      build_number: number_of_commits,  # auto-increment from git
    )
    build_app(scheme: "MyApp", export_method: "app-store")
    upload_to_testflight(
      skip_waiting_for_build_processing: true,  # faster CI
      changelog: changelog_from_git_commits(commits_count: 10),
    )
    slack(message: "iOS beta uploaded to TestFlight ✅", slack_url: ENV["SLACK_URL"])
  end

  lane :release do
    beta
    upload_to_app_store(
      submit_for_review: false,          # manual review trigger
      phased_release: true,              # 7-day phased rollout
      automatic_release: false,
    )
  end
end

# ──── Android Lanes ────────────────────────────────────────────────────────────
platform :android do
  lane :test do
    gradle(task: "test", flavor: "staging", build_type: "Debug")
  end

  lane :beta do
    test
    gradle(task: "bundle", flavor: "production", build_type: "Release")
    upload_to_play_store(
      track: "internal",
      aab: "app/build/outputs/bundle/productionRelease/app-production-release.aab",
      json_key: ENV["PLAY_STORE_SERVICE_ACCOUNT_JSON"],
    )
  end

  lane :promote_to_beta do
    upload_to_play_store(track_promote_to: "beta", version_code: ENV["VERSION_CODE"])
  end

  lane :release do
    upload_to_play_store(
      track: "production",
      rollout: "0.1",  # 10% staged rollout
      aab: ENV["AAB_PATH"],
    )
  end
end
```

---

## Beta Distribution

### TestFlight (iOS)

- Up to 10,000 external testers, 90-day expiry
- Internal testers (App Store Connect users): available immediately, no review
- External testers: requires brief Apple review (~24h first time, faster after)
- Groups: organize testers by role (QA, stakeholders, public beta)

```ruby
# Fastlane pilot (TestFlight)
upload_to_testflight(
  api_key_path: "fastlane/api_key.json",  # App Store Connect API key (not password)
  distribute_external: true,
  groups: ["QA Team", "Beta Users"],
  notify_external_testers: true,
  changelog: "Bug fixes and performance improvements",
)
```

### Firebase App Distribution (cross-platform)

```ruby
# Fastlane plugin: fastlane-plugin-firebase_app_distribution
firebase_app_distribution(
  app: "1:123456:android:abcdef",  # Firebase App ID
  firebase_cli_token: ENV["FIREBASE_CLI_TOKEN"],
  groups: "qa-team,stakeholders",
  release_notes: changelog_from_git_commits(commits_count: 5),
  android_artifact_type: "AAB",
  android_artifact_path: "app/build/outputs/bundle/release/app-release.aab",
)
```

---

## OTA (Over-the-Air) Updates

### Expo EAS Update (React Native / Expo)

OTA updates push JavaScript bundle changes without going through App Store review. Only JS/asset changes — native code changes still require a full build.

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure
eas update:configure

# Push OTA update to production branch
eas update --branch production --message "Fix checkout bug"

# Staged rollout: 20% of users first
eas update --branch production --rollout-percentage 20
```

```json
// eas.json — build and update profiles
{
  "cli": { "version": ">= 5.0.0" },
  "build": {
    "production": {
      "channel": "production",
      "android": { "buildType": "app-bundle" },
      "ios": { "simulator": false }
    },
    "preview": {
      "channel": "preview",
      "distribution": "internal"
    }
  },
  "submit": {
    "production": {
      "ios": { "appleId": "dev@myorg.com", "ascAppId": "1234567890" },
      "android": { "serviceAccountKeyPath": "./service-account.json", "track": "internal" }
    }
  }
}
```

### CodePush (Microsoft, React Native)

```javascript
// App.tsx — check for updates on launch
import codePush from 'react-native-code-push';

const codePushOptions = {
  checkFrequency: codePush.CheckFrequency.ON_APP_RESUME,
  installMode: codePush.InstallMode.ON_NEXT_RESTART,
  minimumBackgroundDuration: 60, // Only install if app was in background > 1 min
};

export default codePush(codePushOptions)(App);
```

---

## GitHub Actions — Full Mobile CI Matrix

```yaml
# .github/workflows/mobile-ci.yml
name: Mobile CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  # ──── Android ────────────────────────────────────────────────────────────────
  android-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with: { java-version: '21', distribution: 'temurin' }

      - name: Cache Gradle
        uses: actions/cache@v4
        with:
          path: |
            ~/.gradle/caches
            ~/.gradle/wrapper
          key: gradle-${{ hashFiles('**/*.gradle.kts', '**/gradle-wrapper.properties') }}

      - name: Run unit tests
        run: ./gradlew testDebugUnitTest

      - name: Run Paparazzi screenshot tests
        run: ./gradlew verifyPaparazziRelease

      - name: Build release AAB
        if: github.ref == 'refs/heads/main'
        run: ./gradlew bundleRelease
        env:
          ANDROID_KEYSTORE_BASE64: ${{ secrets.ANDROID_KEYSTORE_BASE64 }}
          ANDROID_KEYSTORE_PASSWORD: ${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
          ANDROID_KEY_ALIAS: ${{ secrets.ANDROID_KEY_ALIAS }}
          ANDROID_KEY_PASSWORD: ${{ secrets.ANDROID_KEY_PASSWORD }}

  # ──── iOS (requires macOS runner) ──────────────────────────────────────────
  ios-test:
    runs-on: macos-15
    steps:
      - uses: actions/checkout@v4

      - name: Cache CocoaPods
        uses: actions/cache@v4
        with:
          path: Pods
          key: pods-${{ hashFiles('Podfile.lock') }}

      - name: Install dependencies
        run: cd ios && pod install

      - name: Run tests
        run: bundle exec fastlane ios test

      - name: Upload to TestFlight
        if: github.ref == 'refs/heads/main'
        run: bundle exec fastlane ios beta
        env:
          MATCH_PASSWORD: ${{ secrets.MATCH_PASSWORD }}
          MATCH_GIT_BASIC_AUTHORIZATION: ${{ secrets.MATCH_GIT_TOKEN }}
          APP_STORE_CONNECT_API_KEY_ID: ${{ secrets.ASC_KEY_ID }}
          APP_STORE_CONNECT_API_ISSUER_ID: ${{ secrets.ASC_ISSUER_ID }}
          APP_STORE_CONNECT_API_KEY_CONTENT: ${{ secrets.ASC_PRIVATE_KEY }}
```

---

## Build Number Automation

Always derive build numbers from git — never manually edit them:

```bash
# Build number = total git commit count (monotonically increasing)
BUILD_NUMBER=$(git rev-list HEAD --count)

# iOS (using agvtool or fastlane)
agvtool new-version -all $BUILD_NUMBER
# or in Fastfile:
increment_build_number(build_number: number_of_commits)

# Android: pass to Gradle
./gradlew bundleRelease -PversionCode=$BUILD_NUMBER
```

```kotlin
// app/build.gradle.kts
val buildNumber = System.getenv("BUILD_NUMBER")?.toIntOrNull()
    ?: ("git rev-list HEAD --count".runCommand()?.trim()?.toIntOrNull() ?: 1)

android {
    defaultConfig {
        versionCode = buildNumber
        versionName = "2.1.0"  // update manually on significant releases
    }
}
```

---

## App Store Submission Checklist

Before submitting to App Store / Play Store:

```
iOS App Store:
- [ ] Marketing screenshots for all required device sizes (6.9", 6.5", 5.5" for iPhone; iPad Pro 12.9")
- [ ] App preview video (optional but increases conversion)
- [ ] Privacy manifest (PrivacyInfo.xcprivacy) updated
- [ ] Export compliance (uses encryption beyond HTTPS?)
- [ ] NSUserTrackingUsageDescription if using IDFA (App Tracking Transparency)
- [ ] All Info.plist usage descriptions present for requested permissions
- [ ] Age rating correctly set
- [ ] Phased release enabled (7 days, manual pause available)

Google Play Store:
- [ ] AAB format (not APK)
- [ ] Feature graphic (1024×500 banner)
- [ ] Screenshots for phone + 7" tablet + 10" tablet
- [ ] Content rating questionnaire completed
- [ ] Data safety section filled in
- [ ] Staged rollout: start at 10% for production releases
- [ ] Release notes in all supported locales
```

---

## Reference

- Skill: `flutter-patterns` — Flutter CI/CD with Fastlane + EAS
- Skill: `ci-cd-patterns` — General GitHub Actions CI patterns
- Skill: `deployment-patterns` — Release strategies (canary, blue-green)
- Skill: `android-patterns` — Android build tooling (Gradle, Hilt, Room)
- Command: `mobile-release` — Mobile release workflow command
