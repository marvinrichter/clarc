---
paths:
  - "**/*.dart"
  - "**/pubspec.yaml"
  - "**/pubspec.lock"
---
# Flutter / Dart Coding Style

> This file extends [common/coding-style.md](../common/coding-style.md) with Flutter/Dart specific content.

## Formatting

`dart format` is the single authoritative formatter — no configuration, no discussion. Run automatically on every save (hook installed via `install.sh`).

```bash
dart format .               # Format all Dart files
dart format lib/ test/      # Specific directories
dart format --set-exit-if-changed .  # CI gate
```

## Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Variables / parameters | `lowerCamelCase` | `userName`, `isLoading` |
| Methods / functions | `lowerCamelCase` | `fetchUser()`, `buildHeader()` |
| Classes / Widgets / Enums | `UpperCamelCase` | `UserProfile`, `LoginButton` |
| Constants | `lowerCamelCase` | `maxRetries`, `defaultTimeout` |
| Files / directories | `snake_case` | `user_profile.dart`, `auth_service.dart` |
| Private members | `_lowerCamelCase` | `_userId`, `_buildCard()` |
| Libraries | `snake_case` | `library user_repository;` |

## Null Safety Idioms

```dart
// Prefer ?? over null checks
String display = user.name ?? 'Anonymous';

// Prefer ??= for lazy initialization
_cache ??= Cache();

// Prefer ?. for conditional access
final city = user.address?.city;

// Avoid ! operator except where non-null is proven by type system or invariant
// BAD: indirect null assertion without guarantee
final city = user.address!.city;  // crashes if address is null

// GOOD: explicit guard
if (user.address != null) {
  final city = user.address!.city;  // safe — just checked
}

// BETTER: use ?.
final city = user.address?.city;
```

## `const` Correctness (Performance Critical)

In Flutter, `const` widgets skip the rebuild phase entirely. Missing `const` is a performance bug.

```dart
// WRONG: Widget will be recreated every build
return Padding(
  padding: EdgeInsets.all(16.0),
  child: Text('Hello'),
);

// CORRECT: const = built once, never rebuilt
return const Padding(
  padding: EdgeInsets.all(16.0),
  child: Text('Hello'),
);

// Use const for all compile-time constant constructors
const duration = Duration(milliseconds: 300);
const color = Color(0xFF1976D2);
```

Run `dart analyze` to catch missing `const` warnings.

## Sealed Classes and Pattern Matching (Dart 3)

```dart
// Define exhaustive state types
sealed class AuthState {}
class Unauthenticated extends AuthState {}
class Authenticated extends AuthState {
  final User user;
  const Authenticated(this.user);
}
class AuthLoading extends AuthState {}

// Exhaustive switch — compiler errors if case is missing
Widget build(AuthState state) => switch (state) {
  Unauthenticated() => const LoginScreen(),
  Authenticated(:final user) => HomeScreen(user: user),
  AuthLoading() => const CircularProgressIndicator(),
};
```

## Extension Methods

```dart
// Good use: domain-specific operations on existing types
extension UserDisplayName on String {
  String get initials {
    final parts = trim().split(' ');
    return parts.length >= 2
      ? '${parts.first[0]}${parts.last[0]}'.toUpperCase()
      : this[0].toUpperCase();
  }
}

// Good use: Widget helpers
extension WidgetPadding on Widget {
  Widget paddingAll(double value) =>
    Padding(padding: EdgeInsets.all(value), child: this);
}

// Avoid: complex logic in extensions — use dedicated classes instead
```

## File Organization

```
lib/
├── core/           # Shared: constants, extensions, theme, utils
│   ├── constants/
│   ├── extensions/
│   └── theme/
├── features/       # Feature modules (Clean Architecture)
│   └── auth/
│       ├── data/       # Repository implementations, data sources, DTOs
│       ├── domain/     # Entities, use cases, repository interfaces
│       └── presentation/  # BLoC/Riverpod, screens, widgets
└── main.dart
```

## Immutability

Use `final` and `const` everywhere possible:

```dart
// WRONG: mutable when it doesn't need to be
class UserCard extends StatelessWidget {
  String name;  // mutable field in immutable widget

// CORRECT
class UserCard extends StatelessWidget {
  final String name;  // immutable
  const UserCard({required this.name, super.key});
```

Use `copyWith()` for state updates:

```dart
// With freezed (recommended)
@freezed
class UserState with _$UserState {
  const factory UserState({
    required User user,
    @Default(false) bool isLoading,
  }) = _UserState;
}

// Usage
state.copyWith(isLoading: true);
```
