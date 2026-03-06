> This file extends [common/patterns.md](../common/patterns.md) with C++ specific design patterns.

# C++ Patterns

## RAII (Resource Acquisition Is Initialization)

The foundational C++ pattern — tie resource lifetime to object lifetime:

```cpp
class FileHandle {
    FILE* m_fp;
public:
    explicit FileHandle(const char* path) : m_fp(fopen(path, "r")) {
        if (!m_fp) throw std::runtime_error("cannot open file");
    }
    ~FileHandle() { if (m_fp) fclose(m_fp); }
    // Disable copy, enable move
    FileHandle(const FileHandle&) = delete;
    FileHandle& operator=(const FileHandle&) = delete;
    FileHandle(FileHandle&& o) noexcept : m_fp(std::exchange(o.m_fp, nullptr)) {}
};
```

## Builder Pattern

For objects with many optional parameters (avoids telescoping constructors):

```cpp
class QueryBuilder {
    std::string m_table;
    std::vector<std::string> m_conditions;
    int m_limit = 100;
public:
    QueryBuilder& from(std::string table) { m_table = std::move(table); return *this; }
    QueryBuilder& where(std::string cond) { m_conditions.push_back(std::move(cond)); return *this; }
    QueryBuilder& limit(int n) { m_limit = n; return *this; }
    std::string build() const;
};

auto q = QueryBuilder{}.from("users").where("active = 1").limit(50).build();
```

## Repository Pattern

Abstract data access behind an interface:

```cpp
struct User { int id; std::string name; };

class IUserRepository {
public:
    virtual ~IUserRepository() = default;
    virtual std::optional<User> findById(int id) = 0;
    virtual bool save(const User& user) = 0;
};

class PostgresUserRepository : public IUserRepository {
    // concrete implementation
};
```

## Type-Safe Newtype (Strong Typedef)

Prevent mixing semantically different values of the same underlying type:

```cpp
template<typename Tag, typename T>
class StrongType {
    T m_value;
public:
    explicit StrongType(T v) : m_value(std::move(v)) {}
    T get() const { return m_value; }
};

using UserId = StrongType<struct UserIdTag, int>;
using OrderId = StrongType<struct OrderIdTag, int>;

void process(UserId uid); // won't accidentally accept an OrderId
```

## Policy-Based Design (Static Strategy)

Use template parameters for zero-cost abstraction:

```cpp
template<typename LogPolicy = ConsoleLogger>
class DataProcessor {
    LogPolicy m_logger;
public:
    void process(const Data& d) {
        m_logger.log("processing...");
        // ...
    }
};

DataProcessor<FileLogger> prod;   // compile-time selection
DataProcessor<>           dev;    // default
```

## Module Structure

```
src/
  domain/         # Core business logic (no dependencies)
    models.h
    repository.h  # Interfaces only
  application/    # Use cases
    services/
  infrastructure/ # Implementations (DB, HTTP, files)
    repositories/
  presentation/   # CLI/API entry points
CMakeLists.txt
```
