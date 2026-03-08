---
name: flutter-patterns
description: "Flutter architecture patterns: BLoC vs. Riverpod decision framework, Widget composition (Composition over Inheritance, CustomPainter, Implicit/Explicit Animations), go_router navigation, Platform Channels, Isolates for background work, Flutter DevTools profiling, performance patterns (const widgets, RepaintBoundary, ListView.builder, Slivers)."
---

# Flutter Patterns Skill

Flutter turns Dart into a cross-platform UI framework for iOS, Android, Web, and Desktop. This skill covers the architectural patterns and performance techniques that separate production apps from prototypes.

## When to Activate

- Designing state management for a new Flutter feature
- Setting up navigation with deep linking
- Calling native platform code from Flutter
- Running CPU-intensive work without blocking the UI
- Diagnosing Flutter performance issues (jank, rebuilds)
- Reviewing Flutter architecture choices

---

## Widget Composition

Flutter's core paradigm: **Composition over Inheritance**.

```dart
// Build complex UI from small, reusable pieces
class ProductCard extends StatelessWidget {
  const ProductCard({required this.product, super.key});
  final Product product;

  @override
  Widget build(BuildContext context) => Card(
    child: Column(children: [
      ProductImage(url: product.imageUrl),      // separate widget
      ProductTitle(title: product.name),         // separate widget
      ProductPrice(price: product.price),        // separate widget
      AddToCartButton(productId: product.id),    // separate widget
    ]),
  );
}
```

**Never** use widget inheritance for UI variation — use parameters or slots instead.

---

## State Management

### BLoC (flutter_bloc)

Best for: complex features, large teams, explicit event-driven flows.

```dart
// 1. Define events (sealed class — Dart 3)
sealed class CartEvent {}
class AddToCart extends CartEvent { final Product product; AddToCart(this.product); }
class RemoveFromCart extends CartEvent { final String productId; RemoveFromCart(this.productId); }

// 2. Define state (freezed for copyWith + equality)
@freezed
class CartState with _$CartState {
  const factory CartState({
    @Default([]) List<CartItem> items,
    @Default(false) bool isLoading,
    CartError? error,
  }) = _CartState;
}

// 3. BLoC
class CartBloc extends Bloc<CartEvent, CartState> {
  CartBloc(this._repository) : super(const CartState()) {
    on<AddToCart>(_onAddToCart);
    on<RemoveFromCart>(_onRemoveFromCart);
  }

  Future<void> _onAddToCart(AddToCart e, Emitter<CartState> emit) async {
    emit(state.copyWith(isLoading: true, error: null));
    try {
      final items = await _repository.addItem(state.items, e.product);
      emit(state.copyWith(items: items, isLoading: false));
    } on CartException catch (err) {
      emit(state.copyWith(error: CartError(err.message), isLoading: false));
    }
  }
}

// 4. Widget
class CartScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) => BlocBuilder<CartBloc, CartState>(
    builder: (context, state) {
      if (state.isLoading) return const CircularProgressIndicator();
      return ListView(children: state.items.map(CartItemTile.new).toList());
    },
  );
}
```

### Riverpod

Best for: simpler features, reactive providers, less boilerplate.

```dart
// Provider (auto-disposed, reacts to dependencies)
@riverpod
Future<List<Product>> featuredProducts(FeaturedProductsRef ref) {
  return ref.watch(productRepositoryProvider).getFeatured();
}

// Notifier for mutable state
@riverpod
class CartNotifier extends _$CartNotifier {
  @override
  List<CartItem> build() => [];

  void add(Product product) {
    state = [...state, CartItem(product: product, quantity: 1)];
  }
}

// Widget
class FeaturedScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final products = ref.watch(featuredProductsProvider);
    return products.when(
      data: (list) => ProductGrid(items: list),
      loading: () => const SkeletonGrid(),
      error: (err, _) => ErrorCard(message: err.toString()),
    );
  }
}
```

---

## Navigation (go_router)

```dart
final router = GoRouter(
  initialLocation: '/',
  redirect: (context, state) {
    final auth = context.read<AuthBloc>().state;
    final onAuth = state.matchedLocation.startsWith('/auth');
    if (auth is Unauthenticated && !onAuth) return '/auth/login';
    if (auth is Authenticated && onAuth) return '/';
    return null;
  },
  routes: [
    ShellRoute(
      builder: (_, __, child) => AppScaffold(body: child),
      routes: [
        GoRoute(path: '/', builder: (_, __) => const HomeScreen()),
        GoRoute(
          path: '/product/:id',
          builder: (_, s) => ProductScreen(id: s.pathParameters['id']!),
        ),
      ],
    ),
    GoRoute(path: '/auth/login', builder: (_, __) => const LoginScreen()),
  ],
);

// Navigate programmatically
context.go('/product/123');     // replace stack
context.push('/product/123');   // push onto stack
context.pop();                  // back
```

---

## Platform Channels

Call native iOS/Android code from Dart when Flutter APIs don't cover it.

```dart
// Dart side
const _channel = MethodChannel('com.myapp/native');

Future<String> getBiometricType() async {
  try {
    return await _channel.invokeMethod<String>('getBiometricType') ?? 'none';
  } on PlatformException catch (e) {
    debugPrint('Biometric error: ${e.message}');
    return 'error';
  }
}

// iOS Swift side (AppDelegate.swift)
let channel = FlutterMethodChannel(name: "com.myapp/native", binaryMessenger: controller.binaryMessenger)
channel.setMethodCallHandler { call, result in
  if call.method == "getBiometricType" {
    result(LAContext().biometryType == .faceID ? "faceID" : "touchID")
  }
}
```

Channel types:
- `MethodChannel` — request/response (most common)
- `EventChannel` — continuous stream from native (sensors, connectivity)
- `BasicMessageChannel` — bidirectional low-level messaging

---

## Isolates (Background Work)

Flutter's main isolate handles UI. CPU-intensive work must move off it.

```dart
// Simple: compute() for pure functions
final sorted = await compute(sortLargeList, items);

// Complex: Isolate.spawn for long-running work
Future<void> runInBackground() async {
  final receivePort = ReceivePort();
  await Isolate.spawn(_isolateEntryPoint, receivePort.sendPort);

  await for (final message in receivePort) {
    if (message is ProcessingResult) {
      // update UI
    }
  }
}

void _isolateEntryPoint(SendPort sendPort) {
  // This runs in a separate isolate (separate memory, no shared state)
  final result = expensiveComputation();
  sendPort.send(result);
}
```

---

## Performance Patterns

### `const` widgets (highest impact)

Every `const` widget is created once and never rebuilt. Missing `const` is a performance regression.

```dart
// Rule: if widget has no runtime variables, it should be const
return const Column(children: [
  Icon(Icons.star),          // const
  Text('Featured'),          // const
  SizedBox(height: 8),       // const
]);
```

### RepaintBoundary

Isolate expensive widgets from rebuild cascade:

```dart
// Animation inside doesn't trigger parent repaint
RepaintBoundary(
  child: AnimatedProgressRing(value: progress),
)
```

### ListView.builder (never ListView with children for long lists)

```dart
// WRONG: creates all items eagerly (even off-screen)
ListView(children: items.map(ItemTile.new).toList())

// CORRECT: lazy creation (only visible + buffer)
ListView.builder(
  itemCount: items.length,
  itemBuilder: (context, i) => ItemTile(item: items[i]),
)
```

### Slivers for complex scrolling

```dart
CustomScrollView(slivers: [
  const SliverAppBar(expandedHeight: 200, floating: true, pinned: true),
  SliverList(
    delegate: SliverChildBuilderDelegate(
      (context, i) => ProductTile(product: products[i]),
      childCount: products.length,
    ),
  ),
])
```

---

## Flutter DevTools

```bash
flutter run                     # Start app in debug mode
# Press 'd' in terminal or open DevTools URL

flutter pub global activate devtools
flutter pub global run devtools
```

Key DevTools views:
- **Performance**: Frame timeline, identify jank (>16ms frames)
- **Widget Inspector**: Widget tree, layout constraints, repaint highlights
- **Memory**: Heap allocation, detect memory leaks
- **Network**: HTTP requests, response times

---

## Reference Rules

- `rules/flutter/coding-style.md` — dart format, const correctness, naming
- `rules/flutter/patterns.md` — architecture decisions, Clean Architecture layers
- `rules/flutter/testing.md` — widget tests, golden tests, BLoC testing
