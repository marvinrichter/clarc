---
paths:
  - "**/*.dart"
  - "**/pubspec.yaml"
globs:
  - "**/*.dart"
  - "**/pubspec.{yaml,lock}"
alwaysApply: false
---
# Flutter Architecture Patterns

> This file extends [common/patterns.md](../common/patterns.md) with Flutter/Dart specific content.

## State Management

### BLoC Pattern (recommended for complex features)

```dart
// Event
abstract class CartEvent {}
class AddItem extends CartEvent {
  final Product product;
  const AddItem(this.product);
}

// State (use freezed)
@freezed
class CartState with _$CartState {
  const factory CartState({
    @Default([]) List<CartItem> items,
    @Default(false) bool isLoading,
    String? error,
  }) = _CartState;
}

// BLoC
class CartBloc extends Bloc<CartEvent, CartState> {
  CartBloc({required CartRepository repository})
    : super(const CartState()) {
    on<AddItem>(_onAddItem);
  }

  Future<void> _onAddItem(AddItem event, Emitter<CartState> emit) async {
    emit(state.copyWith(isLoading: true));
    try {
      final updated = await _addToCart(state.items, event.product);
      emit(state.copyWith(items: updated, isLoading: false));
    } catch (e) {
      emit(state.copyWith(error: e.toString(), isLoading: false));
    }
  }
}
```

### Riverpod (recommended for simpler features and providers)

```dart
// Provider
final userProvider = AsyncNotifierProvider<UserNotifier, User>(() {
  return UserNotifier();
});

class UserNotifier extends AsyncNotifier<User> {
  @override
  Future<User> build() => ref.read(userRepositoryProvider).getCurrentUser();

  Future<void> updateName(String name) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(
      () => ref.read(userRepositoryProvider).updateName(name),
    );
  }
}

// Widget usage
class UserScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(userProvider);
    return user.when(
      data: (u) => Text(u.name),
      loading: () => const CircularProgressIndicator(),
      error: (e, _) => Text('Error: $e'),
    );
  }
}
```

### Decision Framework

| Factor | BLoC | Riverpod |
|--------|------|---------|
| Team size | Large teams (explicit events) | Any size |
| Feature complexity | Complex flows, many events | Simple to medium |
| Testing | Excellent (blocTest) | Excellent |
| Boilerplate | More (events + states) | Less |
| Learning curve | Steeper | Gentler |

## Navigation (go_router)

```dart
// Route configuration
final router = GoRouter(
  initialLocation: '/',
  redirect: (context, state) {
    final isLoggedIn = context.read<AuthBloc>().state is Authenticated;
    if (!isLoggedIn && !state.matchedLocation.startsWith('/auth')) {
      return '/auth/login';
    }
    return null;
  },
  routes: [
    GoRoute(path: '/', builder: (_, __) => const HomeScreen()),
    ShellRoute(
      builder: (context, state, child) => ScaffoldWithNavBar(child: child),
      routes: [
        GoRoute(
          path: '/profile/:userId',
          builder: (context, state) =>
            ProfileScreen(userId: state.pathParameters['userId']!),
        ),
      ],
    ),
    GoRoute(path: '/auth/login', builder: (_, __) => const LoginScreen()),
  ],
);
```

## Dependency Injection (get_it + injectable)

```dart
// Service locator setup
@InjectableInit()
void configureDependencies() => getIt.init();

// Register dependencies
@injectable
class UserRepository {
  UserRepository(this._client);
  final ApiClient _client;
}

@lazySingleton
class ApiClient {
  ApiClient(@Named('baseUrl') String baseUrl) : _baseUrl = baseUrl;
  final String _baseUrl;
}

// Usage
final repo = getIt<UserRepository>();
```

## Repository Pattern

```dart
// Domain: abstract interface
abstract class UserRepository {
  Future<User> findById(String id);
  Future<void> update(User user);
  Stream<User> watchUser(String id);
}

// Data: concrete implementation
class RemoteUserRepository implements UserRepository {
  RemoteUserRepository(this._api, this._cache);
  final ApiClient _api;
  final CacheService _cache;

  @override
  Future<User> findById(String id) async {
    final cached = await _cache.get('user:$id');
    if (cached != null) return User.fromJson(cached);
    final user = await _api.getUser(id);
    await _cache.set('user:$id', user.toJson());
    return user;
  }
}
```

## Clean Architecture Layer Rules

```
Presentation → Domain ← Data

domain/:      No Flutter dependencies. Pure Dart. Entities, use cases, repo interfaces.
data/:        Implements domain interfaces. Has Flutter dependencies (http, sqflite).
presentation/: Has Flutter UI dependencies. Uses BLoC/Riverpod. No direct data access.
```
