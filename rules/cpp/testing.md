> This file extends [common/testing.md](../common/testing.md) with C++ specific content.

# C++ Testing

## Framework: Google Test (primary)

```cmake
find_package(GTest REQUIRED)
target_link_libraries(tests GTest::gtest_main)
```

```cpp
#include <gtest/gtest.h>

TEST(MathTest, AddsTwoNumbers) {
    EXPECT_EQ(add(2, 3), 5);
}

TEST_F(DatabaseFixture, InsertsRecord) {
    ASSERT_TRUE(db.insert({.id = 1, .name = "test"}));
    EXPECT_EQ(db.count(), 1);
}
```

## Mocking: Google Mock

```cpp
#include <gmock/gmock.h>

class MockRepository : public IRepository {
public:
    MOCK_METHOD(std::optional<User>, findById, (int id), (override));
    MOCK_METHOD(bool, save, (const User& user), (override));
};

TEST(UserServiceTest, ReturnsUserWhenFound) {
    MockRepository repo;
    EXPECT_CALL(repo, findById(42)).WillOnce(Return(User{42, "Alice"}));
    UserService svc(repo);
    EXPECT_EQ(svc.getUser(42)->name, "Alice");
}
```

## Alternative: Catch2

Preferred for header-only or simpler projects:

```cpp
#include <catch2/catch_test_macros.hpp>

TEST_CASE("Vector operations", "[vector]") {
    std::vector<int> v{1, 2, 3};
    SECTION("size") { REQUIRE(v.size() == 3); }
    SECTION("push_back") { v.push_back(4); REQUIRE(v.back() == 4); }
}
```

## Build and Run

```bash
cmake -B build -DCMAKE_BUILD_TYPE=Debug
cmake --build build
ctest --test-dir build --output-on-failure
```

## Coverage

```bash
cmake -B build -DCMAKE_BUILD_TYPE=Debug -DCMAKE_CXX_FLAGS="--coverage"
cmake --build build && ctest --test-dir build
gcov src/*.cpp   # or use lcov/genhtml for HTML report
```

Target: **80%+ line coverage** minimum.

## TDD Workflow (see [common/testing.md](../common/testing.md))

1. Write failing test
2. Run: `ctest --test-dir build -R TestName`
3. Implement minimal code
4. Run again — must pass
5. Refactor
