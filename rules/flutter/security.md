---
paths:
  - "**/*.dart"
  - "**/pubspec.yaml"
  - "**/AndroidManifest.xml"
  - "**/Info.plist"
globs:
  - "**/*.dart"
  - "**/pubspec.{yaml,lock}"
alwaysApply: false
---
# Flutter / Dart Security

> This file extends [common/security.md](../common/security.md) with Flutter/Dart specific content.

## Secrets Management

**Never** store secrets in:
- `pubspec.yaml`
- Dart source files
- `assets/` directory
- `AndroidManifest.xml` or `Info.plist` as plaintext values

### flutter_dotenv

```dart
import 'package:flutter_dotenv/flutter_dotenv.dart';

await dotenv.load(fileName: '.env');
final apiKey = dotenv.env['API_KEY']!;
```

Add `.env` to `.gitignore`. Use `.env.example` with dummy values.

### envied (compile-time encryption — recommended for production)

```dart
// env.g.dart is generated, values obfuscated in binary
part 'env.g.dart';

@Envied(path: '.env', obfuscate: true)
abstract class Env {
  @EnviedField(varName: 'API_KEY')
  static final String apiKey = _Env.apiKey;
}
```

Run `dart run build_runner build` to generate. Secrets are XOR-obfuscated in the binary.

## Secure Storage

For tokens, keys, and sensitive user data:

```dart
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

const storage = FlutterSecureStorage(
  aOptions: AndroidOptions(encryptedSharedPreferences: true),
  iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
);

// Write
await storage.write(key: 'access_token', value: token);

// Read
final token = await storage.read(key: 'access_token');

// Delete on logout
await storage.deleteAll();
```

**Never** use `SharedPreferences` for tokens or sensitive data.

## Certificate Pinning

```dart
import 'package:dio/dio.dart';

final dio = Dio()
  ..options.baseUrl = 'https://api.myapp.com'
  ..httpClientAdapter = IOHttpClientAdapter(
    onHttpClientCreate: (client) {
      client.badCertificateCallback = (cert, host, port) {
        // Validate against pinned certificate
        return cert.pem == pinnedCertificate;
      };
      return client;
    },
  );
```

## Release Build Security

```bash
# Obfuscate + split debug symbols for release builds
flutter build apk --release --obfuscate --split-debug-info=debug-symbols/
flutter build ios --release --obfuscate --split-debug-info=debug-symbols/

# Upload debug symbols to crash reporting service (Sentry, Firebase Crashlytics)
```

## Deep Link Validation

```dart
// Validate incoming deep links — never trust path parameters blindly
GoRouter(
  routes: [
    GoRoute(
      path: '/payment/:transactionId',
      builder: (context, state) {
        final id = state.pathParameters['transactionId']!;
        // Validate format before processing
        if (!RegExp(r'^[a-zA-Z0-9_-]{8,64}$').hasMatch(id)) {
          return const ErrorScreen(message: 'Invalid transaction ID');
        }
        return PaymentScreen(transactionId: id);
      },
    ),
  ],
);
```

## Security Checklist

Before release:
- [ ] No secrets in source code or assets
- [ ] Tokens stored in `flutter_secure_storage`, not `SharedPreferences`
- [ ] Release build uses `--obfuscate --split-debug-info`
- [ ] Certificate pinning for sensitive API calls
- [ ] Deep link parameters validated before use
- [ ] `android:debuggable="false"` in release `AndroidManifest.xml`
- [ ] `NSAppTransportSecurity` not set to allow all in `Info.plist`
- [ ] Third-party SDK permissions reviewed in `AndroidManifest.xml`
