---
paths:
  - "**/*.cs"
  - "**/*.csx"
  - "**/*.razor"
---

# C# Patterns

> This file extends [common/patterns.md](../common/patterns.md) with C# specific content.

## Repository Pattern

```csharp
public interface IUserRepository
{
    Task<User?> FindByIdAsync(int id, CancellationToken ct = default);
    Task<User?> FindByEmailAsync(string email, CancellationToken ct = default);
    Task<IReadOnlyList<User>> FindAllAsync(int skip, int take, CancellationToken ct = default);
    Task SaveAsync(User user, CancellationToken ct = default);
    Task RemoveAsync(int id, CancellationToken ct = default);
}

public sealed class EfUserRepository(AppDbContext db) : IUserRepository
{
    public async Task<User?> FindByIdAsync(int id, CancellationToken ct = default)
        => await db.Users.FindAsync([id], ct);

    public async Task SaveAsync(User user, CancellationToken ct = default)
    {
        db.Users.Update(user);
        await db.SaveChangesAsync(ct);
    }
}
```

## CQRS with MediatR

```csharp
// Command
public sealed record CreateUserCommand(string Name, string Email) : IRequest<User>;

// Handler
public sealed class CreateUserHandler(
    IUserRepository users,
    IPublisher publisher) : IRequestHandler<CreateUserCommand, User>
{
    public async Task<User> Handle(CreateUserCommand cmd, CancellationToken ct)
    {
        var email = new Email(cmd.Email);

        if (await users.FindByEmailAsync(email.Value, ct) is not null)
            throw new DuplicateEmailException(email);

        var user = User.Create(cmd.Name, email);
        await users.SaveAsync(user, ct);
        await publisher.Publish(new UserCreated(user.Id), ct);

        return user;
    }
}

// Controller stays thin
[HttpPost]
public async Task<IActionResult> Create(
    CreateUserRequest request,
    [FromServices] ISender mediator,
    CancellationToken ct)
{
    var user = await mediator.Send(new CreateUserCommand(request.Name, request.Email), ct);
    return CreatedAtAction(nameof(GetById), new { id = user.Id }, user.ToDto());
}
```

## Value Objects

```csharp
public sealed record Email
{
    public string Value { get; }

    public Email(string value)
    {
        var normalized = value.Trim().ToLowerInvariant();
        if (!IsValid(normalized))
            throw new ArgumentException($"Invalid email: {value}", nameof(value));
        Value = normalized;
    }

    private static bool IsValid(string v)
        => v.Contains('@') && v.Contains('.');
}
```

## Result Pattern (no exceptions for business errors)

```csharp
public sealed class Result<T>
{
    public T? Value { get; }
    public string? Error { get; }
    public bool IsSuccess { get; }

    private Result(T value)          { Value = value; IsSuccess = true; }
    private Result(string error)     { Error = error; IsSuccess = false; }

    public static Result<T> Ok(T value)      => new(value);
    public static Result<T> Fail(string err) => new(err);
}

// Usage
public async Task<Result<User>> RegisterAsync(string name, string email)
{
    if (await users.FindByEmailAsync(email) is not null)
        return Result<User>.Fail("Email already registered");

    var user = User.Create(name, new Email(email));
    await users.SaveAsync(user);
    return Result<User>.Ok(user);
}
```

## ASP.NET Core Minimal API

```csharp
// Program.cs
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDbContext<AppDbContext>(o => o.UseSqlServer(builder.Configuration.GetConnectionString("Default")));
builder.Services.AddScoped<IUserRepository, EfUserRepository>();
builder.Services.AddMediatR(cfg => cfg.RegisterServicesFromAssemblyContaining<Program>());

var app = builder.Build();

app.MapPost("/users", async (CreateUserRequest req, ISender mediator, CancellationToken ct) =>
{
    var user = await mediator.Send(new CreateUserCommand(req.Name, req.Email), ct);
    return Results.Created($"/users/{user.Id}", user);
});

app.Run();
```

## Reference

For detailed patterns and skills: `skills/csharp-patterns`
For testing with xUnit/FluentAssertions/Testcontainers: `skills/csharp-testing`
