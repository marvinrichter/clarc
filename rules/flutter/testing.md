---
paths:
  - "**/*_test.dart"
  - "**/test/**/*.dart"
  - "**/integration_test/**/*.dart"
globs:
  - "**/*.dart"
  - "**/pubspec.{yaml,lock}"
alwaysApply: false
---
# Flutter / Dart Testing

> This file extends [common/testing.md](../common/testing.md) with Flutter/Dart specific content.

## Test Types

```
Unit Tests:        test/unit/          — pure Dart, no widgets, fast
Widget Tests:      test/widget/        — single widget, no devices
Integration Tests: integration_test/   — full app on device/emulator
```

## Unit Tests

```dart
import 'package:test/test.dart';
import 'package:myapp/domain/use_cases/calculate_total.dart';

void main() {
  group('CalculateTotal', () {
    late CalculateTotal useCase;

    setUp(() {
      useCase = CalculateTotal();
    });

    test('returns sum of item prices', () {
      final items = [Item(price: 10.0), Item(price: 20.0)];
      expect(useCase(items), equals(30.0));
    });

    test('returns 0 for empty list', () {
      expect(useCase([]), equals(0.0));
    });
  });
}
```

## Widget Tests

```dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:myapp/features/auth/presentation/login_screen.dart';

void main() {
  testWidgets('LoginScreen shows email and password fields', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(home: LoginScreen()),
    );

    expect(find.byKey(const Key('email_field')), findsOneWidget);
    expect(find.byKey(const Key('password_field')), findsOneWidget);
    expect(find.text('Sign In'), findsOneWidget);
  });

  testWidgets('shows error message on invalid email', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: LoginScreen()));

    await tester.enterText(find.byKey(const Key('email_field')), 'invalid');
    await tester.tap(find.text('Sign In'));
    await tester.pump();  // Trigger rebuild

    expect(find.text('Enter a valid email'), findsOneWidget);
  });
}
```

Key finders:
- `find.byType(MyWidget)` — by widget type
- `find.byKey(const Key('my_key'))` — by key (preferred for test stability)
- `find.text('label')` — by text content
- `find.byIcon(Icons.close)` — by icon

Key pump methods:
- `tester.pump()` — one frame tick (for immediate rebuilds)
- `tester.pumpAndSettle()` — ticks until no more frames (for animations, async)
- `tester.pump(const Duration(seconds: 1))` — simulate time passing

## Mocking with mocktail

```dart
import 'package:mocktail/mocktail.dart';
import 'package:myapp/data/repositories/user_repository.dart';

class MockUserRepository extends Mock implements UserRepository {}

void main() {
  late MockUserRepository mockRepo;

  setUp(() {
    mockRepo = MockUserRepository();
    // Required for non-nullable return types
    registerFallbackValue(const User(id: '', name: ''));
  });

  test('loads user on success', () async {
    when(() => mockRepo.findById('user-1'))
      .thenAnswer((_) async => User(id: 'user-1', name: 'Alice'));

    final result = await mockRepo.findById('user-1');
    expect(result.name, 'Alice');
    verify(() => mockRepo.findById('user-1')).called(1);
  });
}
```

## BLoC Testing (bloc_test)

```dart
import 'package:bloc_test/bloc_test.dart';

void main() {
  group('AuthBloc', () {
    late MockAuthRepository mockRepo;

    setUp(() => mockRepo = MockAuthRepository());

    blocTest<AuthBloc, AuthState>(
      'emits [loading, authenticated] when login succeeds',
      build: () => AuthBloc(repository: mockRepo),
      setUp: () => when(() => mockRepo.login(any(), any()))
          .thenAnswer((_) async => User(id: '1', name: 'Alice')),
      act: (bloc) => bloc.add(LoginRequested(email: 'a@b.com', password: 'pass')),
      expect: () => [AuthLoading(), const Authenticated(User(id: '1', name: 'Alice'))],
    );
  });
}
```

## Golden File Tests (Visual Regression)

```dart
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('UserCard matches golden', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: UserCard(user: User(id: '1', name: 'Alice')),
        ),
      ),
    );

    await expectLater(
      find.byType(UserCard),
      matchesGoldenFile('goldens/user_card.png'),
    );
  });
}

// Update goldens:
// flutter test --update-goldens
```

## Coverage

```bash
flutter test --coverage
# Report at: coverage/lcov.info

# HTML report
genhtml coverage/lcov.info --output-directory coverage/html
open coverage/html/index.html

# CI gate (fail if coverage < 80%)
lcov --summary coverage/lcov.info | grep "lines......"
```

## Running Tests

```bash
flutter test                         # All unit + widget tests
flutter test test/unit/              # Specific directory
flutter test --name "LoginScreen"    # By test name pattern
flutter drive --target=integration_test/app_test.dart  # Integration tests
```
