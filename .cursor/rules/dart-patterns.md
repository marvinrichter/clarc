---
globs: ["**/*.dart"]
---

# Dart Patterns

> See full reference: `skills/dart-patterns/SKILL.md`

## Null Safety

```dart
// Prefer ?. over null checks
final city = user.address?.city;

// Prefer ?? for defaults
String display = user.name ?? 'Anonymous';

// Avoid ! unless non-null is proven
// BAD
final name = user.profile!.name;  // crashes if profile is null

// GOOD — guard first
if (user.profile != null) {
  final name = user.profile!.name;  // safe
}

// BETTER — use ?.
final name = user.profile?.name ?? 'Unknown';
```

## Sealed Classes (Dart 3)

```dart
sealed class AuthState {}
class Unauthenticated extends AuthState {}
class Authenticated extends AuthState {
  final User user;
  const Authenticated(this.user);
}
class AuthLoading extends AuthState {}

// Exhaustive switch — compiler error if case missing
Widget build(AuthState state) => switch (state) {
  Unauthenticated() => const LoginScreen(),
  Authenticated(:final user) => HomeScreen(user: user),
  AuthLoading() => const CircularProgressIndicator(),
};
```

## Result Pattern

```dart
sealed class Result<T> {}
class Ok<T> extends Result<T> {
  final T value;
  const Ok(this.value);
}
class Err<T> extends Result<T> {
  final String message;
  const Err(this.message);
}

// Usage
Future<Result<User>> fetchUser(String id) async {
  try {
    final user = await _repository.findById(id);
    return Ok(user);
  } on NotFoundException {
    return const Err('User not found');
  }
}

// Caller
final result = await fetchUser('123');
switch (result) {
  case Ok(:final value): print('Got user: ${value.name}');
  case Err(:final message): print('Error: $message');
}
```

## Extension Methods

```dart
// String extensions
extension UserDisplayName on String {
  String get initials {
    final parts = trim().split(' ');
    return parts.length >= 2
      ? '${parts.first[0]}${parts.last[0]}'.toUpperCase()
      : this[0].toUpperCase();
  }
}

// Widget extensions
extension WidgetPadding on Widget {
  Widget paddingAll(double value) =>
    Padding(padding: EdgeInsets.all(value), child: this);
}
```

## Async Patterns

```dart
// Parallel futures
final (users, products) = await (
  fetchUsers(),
  fetchProducts(),
).wait;

// Stream
Stream<int> countdown(int from) async* {
  for (var i = from; i >= 0; i--) {
    yield i;
    await Future.delayed(const Duration(seconds: 1));
  }
}

// Cancel subscription in dispose
late StreamSubscription<Event> _sub;

@override
void initState() {
  super.initState();
  _sub = eventStream.listen(_handleEvent);
}

@override
void dispose() {
  _sub.cancel();
  super.dispose();
}
```

## const Correctness

```dart
// WRONG: widget recreated every build
return Padding(
  padding: EdgeInsets.all(16.0),
  child: Text('Hello'),
);

// CORRECT: built once, skips rebuild phase
return const Padding(
  padding: EdgeInsets.all(16.0),
  child: Text('Hello'),
);
```
