---
name: csharp-patterns
description: "C# 12 / .NET 8 patterns: records, primary constructors, pattern matching, repository + CQRS with MediatR, value objects, Result<T> pattern, Minimal API, ASP.NET Core middleware, Entity Framework Core, nullable reference types, async/await with CancellationToken, Roslyn analyzers. Use when writing or reviewing C# code."
---

# C# Patterns

## When to Activate

- Writing C# 12 / .NET 8+ source files (`.cs`, `.razor`)
- Designing domain models with records and value objects
- Building ASP.NET Core Web APIs with MediatR
- Reviewing C# code for idiomatic patterns and async correctness

---

## Records — Immutable Data Transfer

```csharp
// Positional record — equality by value, deconstruction, with-expression
public sealed record User(int Id, string Name, Email Email, DateTimeOffset CreatedAt);

// Usage
var alice = new User(1, "Alice", new Email("alice@example.com"), DateTimeOffset.UtcNow);
var renamed = alice with { Name = "Bob" };  // new record, alice unchanged
var (id, name, email, _) = alice;           // deconstruct

// Record struct — value semantics, stack-allocated
public readonly record struct Point(double X, double Y)
{
    public double Distance => Math.Sqrt(X * X + Y * Y);
}
```

---

## Pattern Matching

```csharp
// Switch expression — exhaustive, returns value
decimal CalculateDiscount(Order order) => order switch
{
    { Status: OrderStatus.Cancelled }        => throw new InvalidOperationException("Order is cancelled"),
    { Total: >= 1000m, IsVip: true }         => 0.20m,
    { Total: >= 1000m }                      => 0.15m,
    { Total: >= 500m  }                      => 0.10m,
    { Total: >= 100m  }                      => 0.05m,
    _                                        => 0.00m
};

// Property pattern in if
if (user is { Email.IsVerified: true, Role: UserRole.Admin })
{
    // admin with verified email
}

// List pattern (C# 11+)
if (args is [var first, var second, ..])
{
    Console.WriteLine($"First: {first}, Second: {second}");
}
```

---

## Nullable Reference Types

```csharp
// Enable in Directory.Build.props: <Nullable>enable</Nullable>

// ? declares nullable
public User? FindById(int id) => _users.GetValueOrDefault(id);

// ! suppresses warning (use sparingly — only when you know it's non-null)
var name = user!.Name;

// Null-coalescing
var name = user?.Name ?? "Anonymous";

// Null-coalescing throw (C# 7+)
var config = env.GetSection("Api:Key")?.Value
    ?? throw new InvalidOperationException("Api:Key not configured");
```

---

## Primary Constructors (C# 12)

```csharp
// Constructor parameters available throughout the class body
public sealed class UserService(
    IUserRepository repository,
    IEmailService email,
    ILogger<UserService> logger)
{
    public async Task<User> RegisterAsync(RegisterUserCommand cmd, CancellationToken ct)
    {
        var existing = await repository.FindByEmailAsync(cmd.Email, ct);
        if (existing is not null)
            throw new DuplicateEmailException(cmd.Email);

        var user = User.Create(cmd.Name, new Email(cmd.Email));
        await repository.SaveAsync(user, ct);
        await email.SendWelcomeAsync(user, ct);
        logger.LogInformation("User {UserId} registered", user.Id);
        return user;
    }
}
```

---

## CQRS with MediatR

```csharp
// Command — immutable record
public sealed record RegisterUserCommand(string Name, string Email, string Password)
    : IRequest<User>;

// Handler
public sealed class RegisterUserHandler(
    IUserRepository users,
    IPasswordHasher hasher,
    IPublisher events) : IRequestHandler<RegisterUserCommand, User>
{
    public async Task<User> Handle(RegisterUserCommand cmd, CancellationToken ct)
    {
        if (await users.FindByEmailAsync(cmd.Email, ct) is not null)
            throw new DuplicateEmailException(cmd.Email);

        var user = User.Create(
            cmd.Name,
            new Email(cmd.Email),
            hasher.Hash(cmd.Password));

        await users.SaveAsync(user, ct);
        await events.Publish(new UserRegistered(user.Id, user.Email.Value), ct);
        return user;
    }
}

// Registration
builder.Services.AddMediatR(cfg =>
    cfg.RegisterServicesFromAssemblyContaining<RegisterUserHandler>());
```

---

## Result Pattern

```csharp
public abstract record Result<T>
{
    public sealed record Ok(T Value) : Result<T>;
    public sealed record Error(string Code, string Message) : Result<T>;

    public bool IsSuccess => this is Ok;

    public TOut Match<TOut>(Func<T, TOut> onOk, Func<string, string, TOut> onError)
        => this switch
        {
            Ok(var v)          => onOk(v),
            Error(var c, var m) => onError(c, m),
            _ => throw new UnreachableException()
        };
}

// Usage in handler
public async Task<Result<User>> RegisterAsync(string name, string email)
{
    if (await users.FindByEmailAsync(email) is not null)
        return new Result<User>.Error("DUPLICATE_EMAIL", "Email already registered");

    var user = User.Create(name, new Email(email));
    await users.SaveAsync(user);
    return new Result<User>.Ok(user);
}
```

---

## ASP.NET Core Minimal API

```csharp
// Program.cs — wires everything together
var builder = WebApplication.CreateBuilder(args);

builder.Services
    .AddDbContext<AppDbContext>(o => o.UseSqlServer(builder.Configuration.GetConnectionString("Default")))
    .AddScoped<IUserRepository, EfUserRepository>()
    .AddMediatR(cfg => cfg.RegisterServicesFromAssembly(typeof(Program).Assembly));

var app = builder.Build();

app.MapPost("/users", async (RegisterUserRequest req, ISender sender, CancellationToken ct) =>
{
    var user = await sender.Send(new RegisterUserCommand(req.Name, req.Email, req.Password), ct);
    return Results.Created($"/users/{user.Id}", new { user.Id, user.Name });
});

app.MapGet("/users/{id:int}", async (int id, ISender sender, CancellationToken ct) =>
{
    var user = await sender.Send(new GetUserQuery(id), ct);
    return user is null ? Results.NotFound() : Results.Ok(user);
});

app.Run();
```

---

## Entity Framework Core

```csharp
// DbContext with proper configuration
public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}

// Separate configuration class
public sealed class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.HasKey(u => u.Id);
        builder.Property(u => u.Name).HasMaxLength(255).IsRequired();
        builder.OwnsOne(u => u.Email, e => e.Property(x => x.Value).HasColumnName("Email").HasMaxLength(255));
        builder.HasIndex(u => u.Email).IsUnique();
    }
}
```

---

## Anti-Patterns

| Anti-Pattern | Problem | Better |
|---|---|---|
| `.Result` / `.Wait()` on async | Deadlock risk | `await` always |
| `async void` (non-event) | Exceptions unobserved | `async Task` |
| No `CancellationToken` on async methods | Can't cancel; timeouts impossible | Always accept `CancellationToken ct = default` |
| `new` keyword on service classes | Untestable, no DI | Register in DI, inject via constructor |
| Mutable domain entity with public setters | Invariants not enforced | Private setters + factory methods |
| `string` for domain concepts (email, id) | No validation | Typed value objects (`Email`, `UserId`) |
| Catching `Exception` broadly | Hides bugs | Catch specific exceptions only |
