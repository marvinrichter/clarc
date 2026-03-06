---
name: cpp-coding-standards-advanced
description: Advanced C++ standards — concurrency (CP.*), templates & C++20 concepts (T.*), standard library (SL.*), enumerations (Enum.*), source files & naming (SF.*/NL.*), performance (Per.*), and a full quick-reference checklist. Extends cpp-coding-standards.
---

# C++ Coding Standards — Advanced

> This skill extends [cpp-coding-standards](../cpp-coding-standards/SKILL.md) with concurrency, templates/concepts, standard library, enumerations, naming, performance, and the full checklist.

## Concurrency & Parallelism (CP.*)

### Key Rules

| Rule | Summary |
|------|---------|
| **CP.1** | Assume code will run as part of a multi-threaded program |
| **CP.2** | Avoid data races |
| **CP.20** | Use RAII — never `lock()`/`unlock()` directly |
| **CP.21** | Use `std::lock()` to acquire multiple mutexes |
| **CP.22** | Never call unknown code while holding a lock |
| **CP.31** | Pass small amounts of data between threads by value |
| **CP.32** | Don't share owning raw pointers between threads |
| **CP.42** | Don't spuriously `wait` |
| **CP.44** | Remember to name `lock_guard`s and `unique_lock`s |

### RAII Locking

```cpp
// CP.20: Use lock_guard / unique_lock — never raw lock/unlock
class BankAccount {
public:
    void deposit(double amount) {
        std::lock_guard<std::mutex> lock{mutex_};  // CP.44: named
        balance_ += amount;
    }

    bool withdraw(double amount) {
        std::lock_guard<std::mutex> lock{mutex_};
        if (balance_ < amount) return false;
        balance_ -= amount;
        return true;
    }

    double balance() const {
        std::lock_guard<std::mutex> lock{mutex_};
        return balance_;
    }

private:
    mutable std::mutex mutex_;  // mutable: locked in const functions
    double balance_{0.0};
};
```

### Multi-Mutex Lock (deadlock prevention)

```cpp
// CP.21: Acquire multiple mutexes atomically
void transfer(BankAccount& from, BankAccount& to, double amount) {
    // std::lock acquires both or neither — prevents deadlock
    std::unique_lock<std::mutex> lock1{from.mutex_, std::defer_lock};
    std::unique_lock<std::mutex> lock2{to.mutex_,   std::defer_lock};
    std::lock(lock1, lock2);  // CP.21

    from.balance_ -= amount;
    to.balance_   += amount;
}
```

### Async and Futures

```cpp
// CP.31: Pass data by value between threads
std::future<int> compute_async(std::vector<int> data) {
    return std::async(std::launch::async, [data = std::move(data)] {
        return std::accumulate(data.begin(), data.end(), 0);
    });
}

// Structured concurrency: ensure futures complete before leaving scope
void run_parallel() {
    auto f1 = std::async(std::launch::async, task1);
    auto f2 = std::async(std::launch::async, task2);

    auto r1 = f1.get();  // Blocks until done
    auto r2 = f2.get();
    return r1 + r2;
}
```

### Anti-Patterns

- `lock()`/`unlock()` directly — use `lock_guard` (CP.20)
- Holding a lock while calling callbacks or virtual functions (CP.22)
- `shared_ptr` for thread data — prefer value passing (CP.31/CP.32)
- Unnamed `lock_guard` — dies immediately, provides no protection (CP.44)

## Templates & Generic Programming (T.*)

### Key Rules

| Rule | Summary |
|------|---------|
| **T.1** | Use templates to raise abstraction, not just for type parameterization |
| **T.10** | Specify concepts for all template arguments |
| **T.11** | Use standard concepts whenever practical |
| **T.12** | Prefer concept names over `auto` in variable declarations |
| **T.20** | Avoid "concepts" without meaningful semantics |
| **T.41** | Require only essential properties in concepts |
| **T.60** | Minimize template context dependence |

### C++20 Concepts

```cpp
#include <concepts>

// T.10: Constrain all template arguments
template<std::integral T>
T safe_add(T a, T b) {
    if (b > 0 && a > std::numeric_limits<T>::max() - b)
        throw std::overflow_error("overflow");
    return a + b;
}

// Custom concept — T.41: require only essential properties
template<typename T>
concept Printable = requires(T t, std::ostream& os) {
    { os << t } -> std::same_as<std::ostream&>;
};

template<Printable T>
void print_all(const std::vector<T>& items) {
    for (const auto& item : items)
        std::cout << item << '\n';
}

// Concept composition
template<typename T>
concept Sortable = std::ranges::range<T>
    && std::totally_ordered<std::ranges::range_value_t<T>>;

template<Sortable Container>
void sort(Container& c) {
    std::ranges::sort(c);
}
```

### SFINAE vs Concepts (before/after C++20)

```cpp
// Old (C++17): SFINAE — hard to read
template<typename T,
         std::enable_if_t<std::is_integral_v<T>, int> = 0>
T old_style(T x) { return x * 2; }

// New (C++20): Concepts — clear and composable
template<std::integral T>
T new_style(T x) { return x * 2; }

// Alternatively with requires clause
template<typename T>
    requires std::integral<T>
T also_new_style(T x) { return x * 2; }
```

### Variadic Templates

```cpp
// T.1: Raise abstraction level
template<typename... Args>
void log(std::string_view fmt, Args&&... args) {
    std::cout << std::vformat(fmt, std::make_format_args(args...)) << '\n';
}

// Fold expressions (C++17)
template<typename... Ts>
auto sum(Ts... values) {
    return (values + ...);  // Fold expression
}
```

### Anti-Patterns

- Unconstrained `template<typename T>` where a concept applies (T.10)
- Using templates for simple runtime polymorphism (prefer virtual functions)
- Deep template nesting — extract named concepts or helper templates

## Standard Library (SL.*)

### Key Rules

| Rule | Summary |
|------|---------|
| **SL.1** | Use the standard library where possible |
| **SL.con.1** | Prefer `vector` by default; use `array` for fixed size |
| **SL.con.2** | Prefer `vector` over `deque` unless you need front insertion |
| **SL.str.1** | Use `std::string` for owned strings |
| **SL.str.2** | Use `std::string_view` for non-owning string references |

```cpp
// SL.str.2: string_view for read-only string parameters
bool starts_with(std::string_view s, std::string_view prefix) {
    return s.substr(0, prefix.size()) == prefix;
}

// SL.con.1: default to vector
std::vector<int> scores;
scores.reserve(100);  // Avoid reallocations

// Fixed-size: std::array
std::array<double, 3> point{1.0, 2.0, 3.0};

// Use algorithms over raw loops
auto it = std::find_if(scores.begin(), scores.end(),
    [](int s) { return s > 90; });

// C++20 ranges
auto high_scores = scores | std::views::filter([](int s) { return s > 90; })
                          | std::views::take(10);
```

## Enumerations (Enum.*)

### All Rules

| Rule | Summary |
|------|---------|
| **Enum.1** | Prefer enumerations over macros |
| **Enum.2** | Use enumeration to represent sets of named constants |
| **Enum.3** | Prefer `enum class` over plain `enum` |
| **Enum.4** | Define operations on enumerations for safe use |
| **Enum.5** | Don't use `ALL_CAPS` for enumerators |
| **Enum.6** | Avoid unnamed enumerations |
| **Enum.7** | Specify the underlying type only if necessary |
| **Enum.8** | Specify enumerator values only if necessary |

```cpp
// Enum.3: enum class prevents implicit conversion and name collision
enum class Color { Red, Green, Blue };  // NOT: RED, GREEN, BLUE (Enum.5)

// Enum.4: Define operations for safe use
Color operator+(Color c, int n) {
    return static_cast<Color>(static_cast<int>(c) + n);
}

std::ostream& operator<<(std::ostream& os, Color c) {
    switch (c) {
        case Color::Red:   return os << "Red";
        case Color::Green: return os << "Green";
        case Color::Blue:  return os << "Blue";
    }
    return os << "unknown";
}

// Enum.7: Specify underlying type for serialization/interop
enum class Status : uint8_t { Active = 1, Inactive = 2, Deleted = 3 };

// DON'T: plain enum pollutes namespace
enum Direction { North, South };  // Enum.3 violation
int North = 5;  // Name collision!
```

## Source Files & Naming (SF.*, NL.*)

### Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Classes/Structs | `UpperCamelCase` | `BankAccount` |
| Functions | `lower_snake_case` | `get_balance()` |
| Variables | `lower_snake_case` | `account_id` |
| Constants/`constexpr` | `ALL_CAPS` or `k` prefix | `MAX_SIZE`, `kMaxRetries` |
| Template parameters | `UpperCamelCase` | `template<typename ValueType>` |
| Private members | `trailing_underscore_` | `balance_` |
| Macros | `ALL_CAPS` (avoid macros) | `ASSERT_TRUE` |

### Source File Rules

| Rule | Summary |
|------|---------|
| **SF.1** | Use `.cpp` for code files, `.h` or `.hpp` for interfaces |
| **SF.2** | Header files must not contain object definitions or non-inline function definitions |
| **SF.3** | Use `#pragma once` or include guards |
| **SF.4** | Include standard library headers before project headers |
| **SF.7** | Don't write `using namespace` in headers |
| **SF.8** | Use `#include` guards for all header files |

```cpp
// SF.3 + SF.8: pragma once (preferred over guards)
#pragma once

// SF.4: Standard headers first
#include <string>
#include <vector>

// Then project headers
#include "myproject/core.h"

// SF.7: Never in headers
// using namespace std;  // BANNED in headers

// In .cpp files, explicit is still better
// using std::string;  // OK but not necessary

namespace myproject {

class Widget {
public:
    explicit Widget(std::string name);
    std::string name() const;

private:
    std::string name_;
};

} // namespace myproject
```

## Performance Guidelines (Per.*)

### Key Rules

| Rule | Summary |
|------|---------|
| **Per.1** | Don't optimize without reason — measure first |
| **Per.4** | Don't assume that complicated code is necessarily faster |
| **Per.5** | Don't assume that low-level code is necessarily faster |
| **Per.7** | Design to enable optimization |
| **Per.10** | Rely on the static type system |
| **Per.11** | Move computation from run time to compile time |
| **Per.14** | Minimize the number of allocations and deallocations |
| **Per.15** | Do not allocate on a critical branch |
| **Per.19** | Access memory predictably (cache locality) |

```cpp
// Per.11: Move to compile time
constexpr size_t fibonacci(size_t n) {
    return (n <= 1) ? n : fibonacci(n-1) + fibonacci(n-2);
}
constexpr auto fib10 = fibonacci(10);  // Computed at compile time

// Per.14: Minimize allocations — use reserve
std::vector<int> results;
results.reserve(expected_count);  // One allocation instead of many

// Per.19: Cache-friendly access — row-major for 2D arrays
// BAD: column-major (cache unfriendly)
for (int col = 0; col < N; ++col)
    for (int row = 0; row < N; ++row)
        sum += matrix[row][col];

// GOOD: row-major (cache friendly)
for (int row = 0; row < N; ++row)
    for (int col = 0; col < N; ++col)
        sum += matrix[row][col];

// Per.10: Use types to enable compiler optimization
void process(const std::vector<int>& data) {  // const enables LICM
    for (int x : data) use(x);
}
```

## Quick Reference Checklist

### Philosophy & Interfaces

- [ ] All interfaces are explicit and strongly typed (I.1, I.4)
- [ ] No non-`const` global variables (I.2)
- [ ] Ownership transfer uses smart pointers, not raw pointers (I.11)
- [ ] Functions have ≤4 parameters (I.23)

### Functions

- [ ] Each function does one thing (F.2)
- [ ] Functions are short and simple (F.3)
- [ ] `constexpr` where computable at compile time (F.4)
- [ ] `noexcept` where exceptions cannot or must not propagate (F.6)
- [ ] Return by value, not output parameters (F.20)
- [ ] Never return pointer/reference to local (F.43)

### Classes

- [ ] `class` if invariant; `struct` if data only (C.2)
- [ ] Rule of Zero applied where possible (C.20)
- [ ] Rule of Five if any special member is defined (C.21)
- [ ] Single-argument constructors are `explicit` (C.46)
- [ ] Virtual destructor is `public virtual` or `protected non-virtual` (C.35)
- [ ] Overrides use `override` keyword, not `virtual` (C.128)

### Resource Management

- [ ] RAII used for all resources (R.1)
- [ ] No naked `new`/`delete` (R.11)
- [ ] `unique_ptr` by default; `shared_ptr` only for shared ownership (R.21)

### Expressions & Statements

- [ ] All variables initialized (ES.20)
- [ ] `{}` initializer syntax used (ES.23)
- [ ] Objects are `const`/`constexpr` unless mutation required (ES.25)
- [ ] `nullptr` used, not `0` or `NULL` (ES.47)
- [ ] No C-style casts (ES.48)

### Error Handling

- [ ] Custom exception types derived from `std::exception` (E.14)
- [ ] Throw by value, catch by `const` reference (E.15)
- [ ] Destructors never throw (E.16)

### Constants & Immutability

- [ ] Objects `const` by default (Con.1)
- [ ] Member functions `const` by default (Con.2)
- [ ] Pointer/reference parameters are `const` unless mutation needed (Con.3)
- [ ] Compile-time values use `constexpr` (Con.5)

### Concurrency

- [ ] No raw `lock()`/`unlock()` — use RAII (CP.20)
- [ ] Named lock guards (not unnamed temporaries) (CP.44)
- [ ] Data passed between threads by value (CP.31)

### Templates

- [ ] All template parameters constrained with concepts (T.10)
- [ ] Standard concepts used where available (T.11)

### Enumerations

- [ ] `enum class` used, not plain `enum` (Enum.3)
- [ ] No `ALL_CAPS` enumerators (Enum.5)
- [ ] Operations defined for safe enum use (Enum.4)

### Performance

- [ ] Profile before optimizing (Per.1)
- [ ] Memory accessed sequentially (Per.19)
- [ ] `reserve()` called before filling vectors (Per.14)
- [ ] Compile-time computation preferred over runtime (Per.11)
