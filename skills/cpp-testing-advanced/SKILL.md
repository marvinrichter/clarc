---
name: cpp-testing-advanced
description: Advanced C++ testing patterns — parameterized tests, death tests, advanced gmock, matchers, test data factories, async/concurrent testing, CI/CD integration, Catch2, and anti-patterns. Use after mastering the basics in cpp-testing.
---

# C++ Testing — Advanced Patterns

Advanced GoogleTest/GoogleMock patterns for teams with the basics established. For first-time setup, test fixtures, basic mocks, and sanitizers, see `cpp-testing` first.

## When to Use

- Parameterized or type-parameterized tests across many inputs
- Advanced mock expectations (InSequence, DoAll, SaveArg, Throw)
- Async or concurrent code verification
- CI/CD with sanitizer matrix builds
- Property-based or fuzz testing
- Catch2 as an alternative to GoogleTest

## Optional Appendix: Fuzzing / Property Testing

Only use if the project already supports LLVM/libFuzzer or a property-testing library.

- **libFuzzer**: best for pure functions with minimal I/O.
- **RapidCheck**: property-based tests to validate invariants.

Minimal libFuzzer harness (pseudocode: replace ParseConfig):

```cpp
#include <cstddef>
#include <cstdint>
#include <string>

extern "C" int LLVMFuzzerTestOneInput(const uint8_t *data, size_t size) {
    std::string input(reinterpret_cast<const char *>(data), size);
    // ParseConfig(input); // project function
    return 0;
}
```

## Parameterized Tests

Test the same logic across many inputs without duplication:

```cpp
// Value-parameterized test
class ClampTest : public ::testing::TestWithParam<std::tuple<int, int, int, int>> {};

TEST_P(ClampTest, ClampsBetweenMinAndMax) {
    auto [value, lo, hi, expected] = GetParam();
    EXPECT_EQ(Clamp(value, lo, hi), expected);
}

INSTANTIATE_TEST_SUITE_P(ClampValues, ClampTest,
    ::testing::Values(
        std::make_tuple(-5, 0, 10, 0),
        std::make_tuple( 5, 0, 10, 5),
        std::make_tuple(15, 0, 10, 10),
        std::make_tuple( 0, 0,  0, 0)
    )
);

// Type-parameterized tests — run the same test for multiple types
template <typename T>
class NumericTest : public ::testing::Test {};

using NumericTypes = ::testing::Types<int, long, float, double>;
TYPED_TEST_SUITE(NumericTest, NumericTypes);

TYPED_TEST(NumericTest, DefaultIsZero) {
    TypeParam value{};
    EXPECT_EQ(value, static_cast<TypeParam>(0));
}
```

## Death Tests

Verify precondition violations and assertions:

```cpp
void divide(int a, int b) {
    assert(b != 0 && "Division by zero");
    // ...
}

TEST(DivideTest, AssertsOnZeroDivisor) {
    EXPECT_DEATH(divide(10, 0), "Division by zero");
}

// EXPECT_DEATH — continues on failure
// ASSERT_DEATH — stops test on failure

// For functions that should throw instead
TEST(ParseTest, ThrowsOnInvalidInput) {
    EXPECT_THROW(parse("!!!"), std::invalid_argument);
    EXPECT_NO_THROW(parse("valid"));
}
```

## Advanced gmock

```cpp
using ::testing::_;
using ::testing::An;
using ::testing::AtLeast;
using ::testing::DoAll;
using ::testing::InSequence;
using ::testing::Invoke;
using ::testing::Return;
using ::testing::SaveArg;
using ::testing::SetArgPointee;
using ::testing::Throw;

class MockDatabase : public Database {
public:
    MOCK_METHOD(bool, Connect, (const std::string& url), (override));
    MOCK_METHOD(std::vector<Row>, Query, (const std::string& sql), (override));
    MOCK_METHOD(void, Execute, (const std::string& sql), (override));
};

// Ordered expectations
TEST(ServiceTest, ConnectsThenQueries) {
    MockDatabase db;
    InSequence seq;  // Enforces call order

    EXPECT_CALL(db, Connect(_)).Times(1).WillOnce(Return(true));
    EXPECT_CALL(db, Query("SELECT 1")).Times(1).WillOnce(Return(std::vector<Row>{}));

    Service svc(db);
    svc.Run();
}

// Capture argument
TEST(ServiceTest, PassesCorrectQuery) {
    MockDatabase db;
    std::string captured_sql;

    EXPECT_CALL(db, Execute(_))
        .WillOnce(SaveArg<0>(&captured_sql));

    Service svc(db);
    svc.UpdateStatus(42, "active");

    EXPECT_THAT(captured_sql, ::testing::HasSubstr("UPDATE"));
    EXPECT_THAT(captured_sql, ::testing::HasSubstr("42"));
}

// DoAll — multiple actions
EXPECT_CALL(db, Query(_))
    .WillOnce(DoAll(
        SaveArg<0>(&captured_sql),
        Return(fake_rows)
    ));

// Throw from mock
EXPECT_CALL(db, Connect(_))
    .WillOnce(Throw(std::runtime_error("connection refused")));

// At least N times
EXPECT_CALL(db, Query(_)).Times(AtLeast(1));
```

## Matchers Reference

```cpp
using ::testing::AllOf;
using ::testing::AnyOf;
using ::testing::Contains;
using ::testing::Each;
using ::testing::ElementsAre;
using ::testing::Ge;
using ::testing::HasSubstr;
using ::testing::IsEmpty;
using ::testing::Le;
using ::testing::Not;
using ::testing::SizeIs;
using ::testing::StartsWith;
using ::testing::StrEq;
using ::testing::UnorderedElementsAre;

// Collection matchers
EXPECT_THAT(vec, ElementsAre(1, 2, 3));
EXPECT_THAT(vec, UnorderedElementsAre(3, 1, 2));
EXPECT_THAT(vec, Contains(42));
EXPECT_THAT(vec, Each(Ge(0)));
EXPECT_THAT(vec, SizeIs(5));
EXPECT_THAT(vec, IsEmpty());

// String matchers
EXPECT_THAT(str, StartsWith("prefix"));
EXPECT_THAT(str, HasSubstr("middle"));
EXPECT_THAT(str, StrEq("exact"));

// Combining matchers
EXPECT_THAT(value, AllOf(Ge(0), Le(100)));  // 0 <= value <= 100
EXPECT_THAT(value, AnyOf(Eq(1), Eq(2)));
EXPECT_THAT(value, Not(IsEmpty()));
```

## Test Data Factories

```cpp
// Factory function — named after the test scenario
namespace test_data {

Market ActiveMarket(std::string_view slug = "test-market") {
    return Market{
        .id = 1,
        .slug = std::string{slug},
        .status = Market::Status::Active,
        .created_at = std::chrono::system_clock::now(),
    };
}

Market DraftMarket(std::string_view slug = "draft") {
    auto m = ActiveMarket(slug);
    m.status = Market::Status::Draft;
    return m;
}

User AdminUser() {
    return User{.id = 1, .role = User::Role::Admin, .name = "Admin"};
}

}  // namespace test_data

// Usage
TEST(MarketServiceTest, CannotPublishAlreadyActiveMarket) {
    auto market = test_data::ActiveMarket();
    // ...
}
```

## Testing Async / Concurrent Code

```cpp
#include <gtest/gtest.h>
#include <atomic>
#include <chrono>
#include <condition_variable>
#include <mutex>
#include <thread>

// Use condition variables, not sleep
TEST(AsyncServiceTest, EventuallyPublishesEvent) {
    std::mutex mu;
    std::condition_variable cv;
    bool received = false;

    AsyncService svc;
    svc.OnEvent([&](const Event& e) {
        std::lock_guard<std::mutex> lock{mu};
        received = true;
        cv.notify_one();
    });

    svc.Trigger();

    std::unique_lock<std::mutex> lock{mu};
    bool signaled = cv.wait_for(lock, std::chrono::seconds{2},
                                [&] { return received; });
    EXPECT_TRUE(signaled) << "Timed out waiting for event";
}

// Thread safety test with many concurrent operations
TEST(AtomicCounterTest, CorrectUnderConcurrency) {
    AtomicCounter counter;
    constexpr int kThreads = 10;
    constexpr int kIncrementsPerThread = 1000;

    std::vector<std::thread> threads;
    for (int i = 0; i < kThreads; ++i) {
        threads.emplace_back([&] {
            for (int j = 0; j < kIncrementsPerThread; ++j) {
                counter.Increment();
            }
        });
    }
    for (auto& t : threads) t.join();

    EXPECT_EQ(counter.Value(), kThreads * kIncrementsPerThread);
}
```

## CI/CD Integration

```yaml
# .github/workflows/test.yml
name: C++ Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-24.04
    strategy:
      matrix:
        compiler: [gcc, clang]
        sanitizer: [none, asan, ubsan]

    steps:
      - uses: actions/checkout@v4

      - name: Configure
        run: |
          cmake -S . -B build \
            -DCMAKE_BUILD_TYPE=Debug \
            -DENABLE_ASAN=${{ matrix.sanitizer == 'asan' && 'ON' || 'OFF' }} \
            -DENABLE_UBSAN=${{ matrix.sanitizer == 'ubsan' && 'ON' || 'OFF' }} \
            -DENABLE_COVERAGE=${{ matrix.sanitizer == 'none' && 'ON' || 'OFF' }}

      - name: Build
        run: cmake --build build -j$(nproc)

      - name: Test
        run: ctest --test-dir build --output-on-failure -j$(nproc)

      - name: Coverage Report
        if: matrix.sanitizer == 'none' && matrix.compiler == 'gcc'
        run: |
          lcov --capture --directory build --output-file coverage.info
          lcov --remove coverage.info '/usr/*' --output-file coverage.info
          genhtml coverage.info --output-directory coverage
```

## Catch2 Example (Alternative)

```cmake
# Catch2 with CMake FetchContent
FetchContent_Declare(
  Catch2
  GIT_REPOSITORY https://github.com/catchorg/Catch2.git
  GIT_TAG v3.7.1
)
FetchContent_MakeAvailable(Catch2)

add_executable(catch2_tests tests/catch2_tests.cpp)
target_link_libraries(catch2_tests PRIVATE Catch2::Catch2WithMain)

include(CTest)
include(Catch)
catch_discover_tests(catch2_tests)
```

```cpp
// tests/catch2_tests.cpp
#include <catch2/catch_all.hpp>

TEST_CASE("Add function", "[calculator]") {
    SECTION("adds positive numbers") {
        REQUIRE(Add(2, 3) == 5);
    }
    SECTION("handles negative numbers") {
        REQUIRE(Add(-1, 1) == 0);
    }
}

// Parameterized with GENERATE
TEST_CASE("Clamp function", "[calculator]") {
    auto [value, lo, hi, expected] = GENERATE(table<int, int, int, int>({
        {-5, 0, 10, 0},
        { 5, 0, 10, 5},
        {15, 0, 10, 10},
    }));
    REQUIRE(Clamp(value, lo, hi) == expected);
}
```

## Anti-Patterns

### Using `sleep` for Async Synchronization

**Wrong:**
```cpp
TEST(AsyncServiceTest, EventuallyPublishesEvent) {
    AsyncService svc;
    svc.Trigger();
    std::this_thread::sleep_for(std::chrono::milliseconds{200}); // arbitrary wait
    EXPECT_TRUE(svc.DidPublish());
}
```

**Correct:**
```cpp
TEST(AsyncServiceTest, EventuallyPublishesEvent) {
    std::mutex mu;
    std::condition_variable cv;
    bool received = false;

    AsyncService svc;
    svc.OnPublish([&] {
        std::lock_guard lock{mu};
        received = true;
        cv.notify_one();
    });
    svc.Trigger();

    std::unique_lock lock{mu};
    EXPECT_TRUE(cv.wait_for(lock, std::chrono::seconds{2}, [&] { return received; }));
}
```

**Why:** Fixed sleeps are both slow and still flaky; condition variables provide a deterministic, bounded wait.

### Mocking Simple Value Objects

**Wrong:**
```cpp
class MockPoint : public Point {
public:
    MOCK_METHOD(double, X, (), (const, override));
    MOCK_METHOD(double, Y, (), (const, override));
};

TEST(DistanceTest, ComputesCorrectly) {
    MockPoint a, b;
    ON_CALL(a, X()).WillByDefault(Return(0.0));
    ON_CALL(b, X()).WillByDefault(Return(3.0));
    // ... overly complex setup for a trivial struct
}
```

**Correct:**
```cpp
TEST(DistanceTest, ComputesCorrectly) {
    Point a{0.0, 0.0};
    Point b{3.0, 4.0};
    EXPECT_DOUBLE_EQ(Distance(a, b), 5.0);
}
```

**Why:** Mocking simple value types adds boilerplate with no isolation benefit; use real instances directly.

### Using a Fixed Temporary Directory Path

**Wrong:**
```cpp
TEST(FileParserTest, ParsesValidFile) {
    std::ofstream out("/tmp/test_input.txt");  // shared path, collides between tests
    out << "data";
    out.close();
    EXPECT_TRUE(ParseFile("/tmp/test_input.txt").ok());
}
```

**Correct:**
```cpp
TEST(FileParserTest, ParsesValidFile) {
    auto tmp = std::filesystem::temp_directory_path() /
               ("test_" + std::to_string(::testing::UnitTest::GetInstance()->random_seed()));
    std::filesystem::create_directories(tmp);
    std::ofstream out(tmp / "input.txt");
    out << "data";
    out.close();
    EXPECT_TRUE(ParseFile((tmp / "input.txt").string()).ok());
    std::filesystem::remove_all(tmp);
}
```

**Why:** Shared temp paths cause test interference when tests run in parallel; use unique directories per test.

### Using `EXPECT_*` for Preconditions That Should Abort the Test

**Wrong:**
```cpp
TEST(UserStoreTest, FindsUser) {
    auto user = store->Find("alice");
    EXPECT_TRUE(user.has_value());         // test continues even if nullopt
    EXPECT_EQ(user->name, "alice");        // dereferences nullopt — UB crash
}
```

**Correct:**
```cpp
TEST(UserStoreTest, FindsUser) {
    auto user = store->Find("alice");
    ASSERT_TRUE(user.has_value());         // stops test immediately on failure
    EXPECT_EQ(user->name, "alice");        // only reached when user is valid
}
```

**Why:** `EXPECT_*` continues execution after failure; use `ASSERT_*` for preconditions whose failure would cause a crash or invalid state.

### Relying on Global State Between Tests

**Wrong:**
```cpp
static std::vector<std::string> g_log;

TEST(ServiceTest, LogsOnStart) {
    Service svc;
    svc.Start();
    EXPECT_EQ(g_log.size(), 1);
}

TEST(ServiceTest, LogsOnStop) {
    // g_log already has 1 entry from previous test — order-dependent
    Service svc;
    svc.Stop();
    EXPECT_EQ(g_log.size(), 2);
}
```

**Correct:**
```cpp
class ServiceTest : public ::testing::Test {
protected:
    void SetUp() override { g_log.clear(); }  // reset before each test
    std::vector<std::string> g_log;
};

TEST_F(ServiceTest, LogsOnStart) {
    Service svc{g_log};
    svc.Start();
    EXPECT_EQ(g_log.size(), 1);
}

TEST_F(ServiceTest, LogsOnStop) {
    Service svc{g_log};
    svc.Stop();
    EXPECT_EQ(g_log.size(), 1);
}
```

**Why:** Global state makes test execution order matter; fixtures with `SetUp`/`TearDown` ensure each test starts clean.

## Alternatives to GoogleTest

- **Catch2**: expressive syntax, BDD-style sections, built-in parameterized tests
- **doctest**: header-only, minimal compile overhead, compatible with GoogleTest assertions
