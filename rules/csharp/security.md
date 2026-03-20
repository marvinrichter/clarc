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

# C# Security

> This file extends [common/security.md](../common/security.md) with C# specific content.

## SQL Injection Prevention

Use Entity Framework Core or parameterized queries — never concatenate user input into SQL:

```csharp
// WRONG — SQL injection
var users = db.Database.ExecuteSqlRaw($"SELECT * FROM Users WHERE Name = '{name}'");

// CORRECT — EF Core LINQ (parameterized automatically)
var users = await db.Users.Where(u => u.Name == name).ToListAsync(ct);

// CORRECT — raw SQL with parameters
var users = await db.Users
    .FromSqlRaw("SELECT * FROM Users WHERE Name = {0}", name)
    .ToListAsync(ct);
```

## Mass Assignment Prevention

Never bind request models directly to domain entities:

```csharp
// WRONG — exposes all properties including role, isAdmin
[HttpPost]
public async Task<IActionResult> Create([FromBody] User user) { ... }

// CORRECT — use a DTO; map explicitly
[HttpPost]
public async Task<IActionResult> Create([FromBody] CreateUserRequest request)
{
    var user = new User(
        name: request.Name,
        email: request.Email
    );
    // Role is never set from request
}
```

## Secret Management

Never hardcode connection strings, API keys, or tokens:

```csharp
// WRONG
var apiKey = "sk-prod-abc123";

// CORRECT — from configuration
var apiKey = configuration["ExternalApi:Key"]
    ?? throw new InvalidOperationException("ExternalApi:Key is not configured");
```

Use `dotnet user-secrets` for local development:

```bash
dotnet user-secrets set "ExternalApi:Key" "your-key-here"
```

Use Azure Key Vault, AWS Secrets Manager, or HashiCorp Vault in production. Never commit `appsettings.Production.json` with secrets.

## CSRF Protection

ASP.NET Core MVC enables CSRF token validation automatically for form POST requests. For REST APIs using JWT/Bearer tokens, CSRF is not required. Never disable antiforgery for state-changing MVC endpoints.

## Input Validation

Use `[Required]`, `[StringLength]`, `[EmailAddress]` data annotations and validate in controllers:

```csharp
public sealed record CreateUserRequest(
    [Required][StringLength(255, MinimumLength = 1)] string Name,
    [Required][EmailAddress] string Email,
    [Required][StringLength(100, MinimumLength = 12)] string Password
);

// Controller
[HttpPost]
public async Task<IActionResult> Create([FromBody] CreateUserRequest request)
{
    if (!ModelState.IsValid) return ValidationProblem(ModelState);
    // ...
}
```

## Dependency Scanning

```bash
dotnet list package --vulnerable              # scan for known CVEs
dotnet list package --outdated               # identify stale packages
```

Run `dotnet list package --vulnerable` in CI — fail the build if HIGH or CRITICAL vulnerabilities are found.

## Insecure Deserialization

Never use `BinaryFormatter` (removed in .NET 5+) or `JavaScriptSerializer`. Use `System.Text.Json` with strict options:

```csharp
var options = new JsonSerializerOptions
{
    PropertyNameCaseInsensitive = false,
    UnknownTypeHandling = JsonUnknownTypeHandling.JsonElement,
};
var user = JsonSerializer.Deserialize<UserDto>(json, options);
```

Set `JsonSerializerDefaults.Web` for ASP.NET Core API responses; never enable polymorphic deserialization from untrusted sources.
