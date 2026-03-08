---
globs: ["**/*.dart", "**/pubspec.yaml"]
---

# Flutter Patterns

> See full reference: `skills/flutter-patterns/SKILL.md`

## Widget Composition

Extract sub-widgets instead of nesting deeply:

```dart
// WRONG: monolithic build method
class ProductScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(/* ... */),
      body: Column(children: [
        // 200 lines of nested widgets
      ]),
    );
  }
}

// CORRECT: composed from focused widgets
class ProductScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: const ProductAppBar(),
    body: const ProductBody(),
  );
}
```

## BLoC Pattern

```dart
// Events — sealed class
sealed class CartEvent {}
class AddToCart extends CartEvent {
  const AddToCart(this.product);
  final Product product;
}

// State — freezed
@freezed
class CartState with _$CartState {
  const factory CartState({
    @Default([]) List<CartItem> items,
    @Default(false) bool isLoading,
    CartError? error,
  }) = _CartState;
}

// BLoC
class CartBloc extends Bloc<CartEvent, CartState> {
  CartBloc({required CartRepository repository})
      : _repository = repository,
        super(const CartState()) {
    on<AddToCart>(_onAddToCart);
  }

  final CartRepository _repository;

  Future<void> _onAddToCart(AddToCart event, Emitter<CartState> emit) async {
    emit(state.copyWith(isLoading: true));
    try {
      final items = await _repository.addItem(event.product);
      emit(state.copyWith(items: items, isLoading: false));
    } on CartException catch (e) {
      emit(state.copyWith(error: CartError(e.message), isLoading: false));
    }
  }
}
```

## BlocBuilder with buildWhen

```dart
// Narrow rebuild scope
BlocBuilder<CartBloc, CartState>(
  buildWhen: (prev, curr) => prev.items.length != curr.items.length,
  builder: (context, state) => CartBadge(count: state.items.length),
);
```

## Riverpod (AsyncNotifier)

```dart
@riverpod
class CartNotifier extends _$CartNotifier {
  @override
  Future<List<CartItem>> build() => ref.read(cartRepositoryProvider).getItems();

  Future<void> addItem(Product product) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(
      () => ref.read(cartRepositoryProvider).addItem(product),
    );
  }
}

// Widget
class CartScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return ref.watch(cartNotifierProvider).when(
      data: (items) => CartList(items: items),
      loading: () => const CircularProgressIndicator(),
      error: (err, _) => ErrorView(message: err.toString()),
    );
  }
}
```

## go_router Navigation

```dart
final router = GoRouter(
  initialLocation: '/home',
  redirect: (context, state) {
    final isAuth = context.read<AuthBloc>().state is Authenticated;
    if (!isAuth && !state.location.startsWith('/login')) return '/login';
    return null;
  },
  routes: [
    GoRoute(path: '/home',    builder: (_, __) => const HomeScreen()),
    GoRoute(path: '/product/:id', builder: (_, state) => ProductScreen(
      id: state.pathParameters['id']!,
    )),
  ],
);
```

## Performance Patterns

```dart
// RepaintBoundary — isolate heavy sub-trees from parent rebuilds
RepaintBoundary(child: HeavyAnimationWidget())

// ListView.builder — lazy, O(1) memory for large lists
ListView.builder(
  itemCount: items.length,
  itemBuilder: (context, index) => ProductTile(item: items[index]),
)

// const — prevents widget rebuilds entirely
const SizedBox(height: 16)
const EdgeInsets.all(16)
```
