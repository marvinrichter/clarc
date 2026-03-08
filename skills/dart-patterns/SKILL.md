---
name: dart-patterns
description: "Idiomatic Dart patterns: Sound Null Safety (?, !, ??, ??=, ?.), Extension Methods, Mixins with constraints, Sealed Classes (Dart 3) with exhaustive pattern matching, async/await/Stream/Future, Result pattern for error handling, Dart Macros (preview)."
---

# Dart Patterns Skill

Dart 3 is a statically typed, null-safe language with a clean async model and powerful meta-programming. This skill covers idiomatic Dart patterns that go beyond the basics.

## When to Activate

- Writing Dart code beyond simple Flutter widgets
- Designing error handling strategy in Dart
- Working with streams or complex async flows
- Using Dart 3 sealed classes and pattern matching
- Extending existing types with extension methods
- Understanding Dart's type system and null safety

---

## Sound Null Safety

Dart's null safety is sound — the compiler guarantees that nullable types are checked before use.

```dart
// Non-nullable by default
String name = 'Alice';       // cannot be null
String? nickname;            // can be null

// Null-aware operators
final display = nickname ?? name;         // fallback if null
final upper = nickname?.toUpperCase();    // null if nickname is null
nickname ??= 'Al';                       // assign if null
final len = nickname!.length;            // assert non-null (throws if null — use sparingly)

// Conditional member access chain
final city = user?.address?.city;

// Null-coalescing assignment
cache ??= {};

// Late initialization (initialized before first use)
late final DatabaseConnection db;
void init() { db = DatabaseConnection(config); }
```

**`!` operator guidelines:**
- Use when null is impossible by invariant (e.g., after null check in same scope)
- Never use in loops or frequently-called code
- Prefer `??` or `?.` in almost all cases

---

## Sealed Classes and Pattern Matching (Dart 3)

Sealed classes enable exhaustive switches — the compiler errors if a case is unhandled.

```dart
// Define result types as a sealed hierarchy
sealed class ApiResult<T> {}
class Success<T> extends ApiResult<T> {
  final T data;
  const Success(this.data);
}
class Failure<T> extends ApiResult<T> {
  final String message;
  final int? statusCode;
  const Failure(this.message, {this.statusCode});
}
class Loading<T> extends ApiResult<T> {}

// Exhaustive switch (compiler enforces all cases)
Widget buildFromResult(ApiResult<User> result) => switch (result) {
  Success(:final data) => UserCard(user: data),
  Failure(:final message) => ErrorText(message),
  Loading() => const CircularProgressIndicator(),
};

// Pattern matching in if
if (result case Success(:final data)) {
  processUser(data);
}
```

**Record patterns:**
```dart
// Records (Dart 3)
(String, int) getUserInfo() => ('Alice', 30);

final (name, age) = getUserInfo();  // destructuring
```

---

## Extension Methods

Extend existing types without subclassing or modifying.

```dart
// String extensions for domain logic
extension EmailValidation on String {
  bool get isValidEmail => RegExp(r'^[^@]+@[^@]+\.[^@]+$').hasMatch(this);

  String get domain => contains('@') ? split('@').last : '';
}

// Usage
'alice@example.com'.isValidEmail  // true
'alice@example.com'.domain        // 'example.com'

// Widget helpers
extension WidgetSpacing on Widget {
  Widget paddingAll(double value) =>
    Padding(padding: EdgeInsets.all(value), child: this);

  Widget withOpacity(double opacity) =>
    Opacity(opacity: opacity, child: this);
}

// DateTime utilities
extension DateFormatting on DateTime {
  String get friendlyDate {
    final now = DateTime.now();
    final diff = now.difference(this);
    if (diff.inDays == 0) return 'Today';
    if (diff.inDays == 1) return 'Yesterday';
    return '${diff.inDays} days ago';
  }
}
```

**When NOT to use extension methods:**
- Complex logic with dependencies → use a dedicated service class
- State-modifying operations → extensions should be pure/side-effect-free
- Operations that need injection → use a class with constructors

---

## Mixins

Add capabilities to classes without inheritance chains.

```dart
// Mixin with constraint
mixin Validatable on Entity {
  List<ValidationError> validate();

  bool get isValid => validate().isEmpty;
}

// Use `on` to constrain what classes can use this mixin
class Order extends Entity with Validatable {
  @override
  List<ValidationError> validate() => [
    if (items.isEmpty) ValidationError('Order must have items'),
    if (total <= 0) ValidationError('Total must be positive'),
  ];
}

// Logging mixin (no constraint)
mixin Logger {
  void log(String message) =>
    debugPrint('[${runtimeType}] $message');
}

class ApiClient with Logger {
  Future<Response> get(String url) {
    log('GET $url');
    return http.get(Uri.parse(url));
  }
}
```

---

## Async / Await / Stream

```dart
// Future: single async value
Future<User> fetchUser(String id) async {
  final response = await http.get(Uri.parse('/users/$id'));
  if (response.statusCode != 200) throw ApiException(response.statusCode);
  return User.fromJson(jsonDecode(response.body));
}

// Stream: multiple values over time
Stream<List<Message>> watchMessages(String chatId) {
  return FirebaseFirestore.instance
    .collection('chats/$chatId/messages')
    .orderBy('timestamp', descending: true)
    .snapshots()
    .map((snap) => snap.docs.map(Message.fromDoc).toList());
}

// StreamController: manual stream creation
class EventBus {
  final _controller = StreamController<AppEvent>.broadcast();
  Stream<AppEvent> get stream => _controller.stream;
  void emit(AppEvent event) => _controller.add(event);
  void dispose() => _controller.close();
}

// Combining Futures
final (user, orders) = await (
  fetchUser(id),
  fetchOrders(id),
).wait;  // Dart 3 — parallel execution with tuple destructuring

// Stream transformations
stream
  .where((e) => e.type == EventType.payment)
  .map((e) => PaymentEvent.fromBase(e))
  .asyncMap((e) => processPayment(e))
  .listen(onEvent, onError: handleError);
```

---

## Error Handling

Dart has `Exception` (recoverable) and `Error` (programming errors — should crash).

```dart
// Custom exceptions
class ApiException implements Exception {
  final int statusCode;
  final String message;
  const ApiException(this.statusCode, this.message);

  @override
  String toString() => 'ApiException($statusCode): $message';
}

// Result pattern (no built-in — use sealed class or package)
sealed class Result<T> {}
class Ok<T> extends Result<T> { final T value; const Ok(this.value); }
class Err<T> extends Result<T> { final Exception error; const Err(this.error); }

Future<Result<User>> tryFetchUser(String id) async {
  try {
    return Ok(await fetchUser(id));
  } on ApiException catch (e) {
    return Err(e);
  }
}

// Caller handles explicitly
final result = await tryFetchUser(id);
switch (result) {
  case Ok(:final value): renderUser(value);
  case Err(:final error): showError(error.toString());
}
```

---

## Dart Macros (Dart 3.x Preview)

Macros enable compile-time code generation without `build_runner`.

```dart
// Planned usage (API subject to change)
@JsonCodable()  // generates fromJson/toJson at compile time
class User {
  final String id;
  final String name;
}

// Currently (Dart 3.x) in experimental preview:
// - No stable release yet
// - Use freezed + build_runner for production code today
// - Watch https://dart.dev/language/macros for stable release
```

---

## Reference

- `rules/flutter/coding-style.md` — dart format, naming, const correctness
- `skills/flutter-patterns` — Flutter-specific architecture (BLoC, Riverpod, go_router)
- `skills/flutter-testing` — test patterns including BLoC testing
