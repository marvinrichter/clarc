---
paths:
  - "**/*.cs"
  - "**/*.csx"
  - "**/*.razor"
globs:
  - "**/*.{cs,csx,razor}"
  - "**/*.csproj"
  - "**/*.sln"
alwaysApply: false
---

# C# Coding Style

> This file extends [common/coding-style.md](../common/coding-style.md) with C# specific content.

## Standard

Use C# 12 / .NET 8+ as the minimum. Enable nullable reference types and implicit usings:

```xml
<!-- Directory.Build.props -->
<PropertyGroup>
  <Nullable>enable</Nullable>
  <ImplicitUsings>enable</ImplicitUsings>
  <LangVersion>12</LangVersion>
  <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
</PropertyGroup>
```

## Naming Conventions

- Classes/Interfaces/Records/Structs: `PascalCase` — `UserService`, `IUserRepository`
- Methods/Properties: `PascalCase` — `FindById`, `UserName`
- Parameters/local variables: `camelCase` — `userId`, `emailAddress`
- Private fields: `_camelCase` — `_repository`, `_logger`
- Constants: `PascalCase` — `MaxRetryCount`
- Interfaces: prefix with `I` — `IUserRepository`

```csharp
public sealed class UserService(IUserRepository repository, ILogger<UserService> logger)
{
    public async Task<User?> FindByIdAsync(int id, CancellationToken ct = default)
    {
        var user = await repository.FindByIdAsync(id, ct);
        if (user is null)
        {
            logger.LogWarning("User {UserId} not found", id);
        }
        return user;
    }
}
```

## Modern C# Features

### Records for Immutable Data

```csharp
// Immutable record — equality by value, with-expression copy
public sealed record User(int Id, string Name, Email Email, DateTimeOffset CreatedAt);

// With-expression creates a copy
var updated = user with { Name = "Bob" };
```

### Pattern Matching

```csharp
var discount = order switch
{
    { Total: >= 1000m } => 0.15m,
    { Total: >= 500m  } => 0.10m,
    { Total: >= 100m  } => 0.05m,
    _                   => 0.00m
};
```

### Primary Constructors (C# 12)

```csharp
// Class with primary constructor — parameters available as fields automatically
public sealed class OrderService(
    IOrderRepository orders,
    IEmailService email,
    ILogger<OrderService> logger)
{
    public async Task<Order> CreateAsync(CreateOrderRequest req, CancellationToken ct)
    {
        var order = Order.Create(req.CustomerId, req.Items);
        await orders.SaveAsync(order, ct);
        await email.SendConfirmationAsync(order, ct);
        logger.LogInformation("Order {OrderId} created", order.Id);
        return order;
    }
}
```

## Formatting

Use `csharpier` for automated formatting:

```bash
dotnet csharpier .
dotnet csharpier --check .   # CI dry-run
```

Standard settings: 120-character line limit, Allman braces.

## Async Conventions

- All async methods must be suffixed with `Async`
- All async methods must accept `CancellationToken ct = default`
- Never use `async void` (except event handlers)
- Prefer `await` over `.Result`/`.Wait()` (deadlock risk)

```csharp
// WRONG
public async Task ProcessAsync() { /* no CancellationToken */ }
public async void HandleAsync() { /* async void */ }

// CORRECT
public async Task ProcessAsync(CancellationToken ct = default) { }
```
