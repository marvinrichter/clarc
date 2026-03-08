---
name: flutter-testing
description: "Flutter testing: Widget Tests (testWidgets, WidgetTester, pump, pumpAndSettle, finders), Integration Tests (flutter_test driver), mocking with mocktail, Golden File Tests (visual regression, --update-goldens), BLoC testing (bloc_test package), coverage measurement and CI integration."
---

# Flutter Testing Skill

Flutter provides three test levels built into the framework. This skill covers the patterns for each, from unit-testing pure Dart logic to visual regression golden tests.

## When to Activate

- Writing tests for a new Flutter widget or feature
- Setting up visual regression testing with golden files
- Testing BLoC state machines
- Debugging flaky widget tests
- Setting up CI test pipeline for Flutter

---

## Test Pyramid

```
┌──────────────────────────┐
│   Integration Tests       │  Few — slow, real device/emulator
│   (flutter_test driver)   │
├──────────────────────────┤
│   Widget Tests            │  Many — fast, no device needed
│   (testWidgets)           │
├──────────────────────────┤
│   Unit Tests              │  Most — pure Dart, fastest
│   (test package)          │
└──────────────────────────┘
```

---

## Unit Tests

Pure Dart — no widgets, no Flutter framework.

```dart
// test/unit/domain/cart_service_test.dart
import 'package:test/test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:myapp/domain/services/cart_service.dart';

class MockCartRepository extends Mock implements CartRepository {}

void main() {
  group('CartService.addItem', () {
    late CartService service;
    late MockCartRepository mockRepo;

    setUp(() {
      mockRepo = MockCartRepository();
      service = CartService(repository: mockRepo);
      registerFallbackValue(CartItem.empty());
    });

    test('adds item to cart', () async {
      when(() => mockRepo.save(any())).thenAnswer((_) async {});
      when(() => mockRepo.load()).thenAnswer((_) async => []);

      final result = await service.addItem(Product(id: 'p1', price: 10.0));

      expect(result, hasLength(1));
      expect(result.first.productId, 'p1');
      verify(() => mockRepo.save(any())).called(1);
    });

    test('throws CartFullException when cart has 100 items', () async {
      when(() => mockRepo.load()).thenAnswer(
        (_) async => List.generate(100, (_) => CartItem.empty()),
      );

      expect(
        () => service.addItem(Product(id: 'p1', price: 10.0)),
        throwsA(isA<CartFullException>()),
      );
    });
  });
}
```

---

## Widget Tests

```dart
// test/widget/features/product/product_card_test.dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('ProductCard', () {
    testWidgets('displays product name and price', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ProductCard(
              product: Product(id: 'p1', name: 'Widget Pro', price: 49.99),
            ),
          ),
        ),
      );

      expect(find.text('Widget Pro'), findsOneWidget);
      expect(find.text('\$49.99'), findsOneWidget);
    });

    testWidgets('calls onAddToCart when button tapped', (tester) async {
      var tapped = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ProductCard(
              product: Product(id: 'p1', name: 'Test', price: 9.99),
              onAddToCart: () => tapped = true,
            ),
          ),
        ),
      );

      await tester.tap(find.byKey(const Key('add_to_cart_button')));
      await tester.pump();

      expect(tapped, isTrue);
    });

    testWidgets('shows loading state during async operation', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(home: CheckoutScreen()),
      );

      await tester.tap(find.text('Place Order'));
      await tester.pump();  // Start the async operation

      expect(find.byType(CircularProgressIndicator), findsOneWidget);

      await tester.pumpAndSettle();  // Wait for async completion

      expect(find.text('Order Confirmed'), findsOneWidget);
    });
  });
}
```

### Key Finders

```dart
find.byType(ProductCard)              // by widget type
find.byKey(const Key('submit'))        // by key (most stable)
find.text('Add to Cart')               // by exact text
find.textContaining('Cart')            // partial text
find.byIcon(Icons.shopping_cart)       // by icon
find.descendant(of: find.byType(Card), matching: find.byType(Text))
find.ancestor(of: find.text('price'), matching: find.byType(Card))
```

### pump vs. pumpAndSettle

```dart
await tester.pump();                            // one frame
await tester.pump(const Duration(seconds: 1)); // simulate time
await tester.pumpAndSettle();                   // wait for all frames (animations, futures)
await tester.pumpAndSettle(const Duration(seconds: 5));  // with timeout
```

---

## mocktail

Preferred over mockito — no code generation required.

```dart
import 'package:mocktail/mocktail.dart';

// Create mock
class MockUserRepository extends Mock implements UserRepository {}

// Setup
setUp(() {
  mock = MockUserRepository();
  // Required for non-nullable types used as arguments
  registerFallbackValue(User.empty());
});

// Stub
when(() => mock.findById('1')).thenReturn(User(id: '1', name: 'Alice'));
when(() => mock.findById('missing')).thenThrow(NotFoundException('1'));
when(() => mock.save(any())).thenAnswer((_) async {});

// Async stubs
when(() => mock.fetchAll())
  .thenAnswer((_) async => [User(id: '1', name: 'Alice')]);

// Verify
verify(() => mock.findById('1')).called(1);
verifyNever(() => mock.delete(any()));
```

---

## BLoC Testing (bloc_test)

```dart
import 'package:bloc_test/bloc_test.dart';

void main() {
  group('CartBloc', () {
    late MockCartRepository repo;

    setUp(() => repo = MockCartRepository());

    blocTest<CartBloc, CartState>(
      'emits [loading, withItem] when AddToCart succeeds',
      build: () => CartBloc(repository: repo),
      setUp: () => when(() => repo.addItem(any(), any()))
        .thenAnswer((_) async => [CartItem(productId: 'p1')]),
      act: (bloc) => bloc.add(AddToCart(product: Product(id: 'p1'))),
      expect: () => [
        const CartState(isLoading: true),
        CartState(items: [CartItem(productId: 'p1')]),
      ],
    );

    blocTest<CartBloc, CartState>(
      'emits [loading, error] when repository throws',
      build: () => CartBloc(repository: repo),
      setUp: () => when(() => repo.addItem(any(), any()))
        .thenThrow(CartException('Out of stock')),
      act: (bloc) => bloc.add(AddToCart(product: Product(id: 'p1'))),
      expect: () => [
        const CartState(isLoading: true),
        const CartState(error: CartError('Out of stock')),
      ],
    );

    blocTest<CartBloc, CartState>(
      'emits nothing when same item added twice rapidly',
      build: () => CartBloc(repository: repo),
      act: (bloc) => bloc
        ..add(AddToCart(product: Product(id: 'p1')))
        ..add(AddToCart(product: Product(id: 'p1'))),
      expect: () => [/* whatever your deduplication logic produces */],
    );
  });
}
```

---

## Golden File Tests (Visual Regression)

```dart
// test/golden/product_card_golden_test.dart
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('ProductCard - default state', (tester) async {
    await tester.binding.setSurfaceSize(const Size(400, 200));

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: ProductCard(product: Product.sample()),
        ),
      ),
    );

    await expectLater(
      find.byType(ProductCard),
      matchesGoldenFile('goldens/product_card_default.png'),
    );
  });
}
```

```bash
# Create/update baseline images
flutter test --update-goldens test/golden/

# Run comparison (fail on visual diff)
flutter test test/golden/

# CI: always run comparison, never auto-update
```

**Golden test best practices:**
- Use fixed `Surface Size` for consistent output across machines
- Use deterministic data (no timestamps, random values)
- Commit golden files to git — they're your visual baseline
- Group golden tests separately from functional tests (different run frequency)

---

## Coverage

```bash
# Run tests with coverage
flutter test --coverage

# Coverage report in: coverage/lcov.info
# View HTML report
genhtml coverage/lcov.info --output-directory coverage/html
open coverage/html/index.html

# CI gate
lcov --summary coverage/lcov.info
# Check "lines......" percentage
```

```yaml
# .github/workflows/flutter.yml
- name: Test with coverage
  run: flutter test --coverage

- name: Upload to Codecov
  uses: codecov/codecov-action@v3
  with:
    file: coverage/lcov.info
```

---

## Testability Patterns

Make code testable from the start:

```dart
// WRONG: hardwired dependency
class OrderService {
  final repo = OrderRepository();  // can't mock

// CORRECT: constructor injection
class OrderService {
  const OrderService(this._repository);
  final OrderRepository _repository;
}

// CORRECT: abstract interface for mocking
abstract class OrderRepository {
  Future<Order> create(OrderRequest request);
}

class RemoteOrderRepository implements OrderRepository { /* ... */ }
class MockOrderRepository extends Mock implements OrderRepository {}
```

---

## Reference

- `rules/flutter/testing.md` — test conventions, tooling setup
- `skills/flutter-patterns` — BLoC/Riverpod architecture patterns
- `skills/dart-patterns` — sealed classes, Result pattern for error handling
