---
name: csharp-testing
description: "C# testing patterns: xUnit with [Fact]/[Theory], FluentAssertions, Moq mocking, NSubstitute, WebApplicationFactory integration tests, Testcontainers for real DB, Bogus fake data generation, Respawn DB reset, Coverlet coverage. Use when writing or reviewing C# tests."
---

# C# Testing

## When to Activate

- Writing C# unit or integration tests with xUnit
- Setting up FluentAssertions and Moq
- Writing WebApplicationFactory integration tests
- Using Testcontainers for database integration tests
- Generating realistic test data with Bogus instead of hand-crafted fixtures
- Enforcing a minimum code coverage threshold via Coverlet in CI
- Migrating from MSTest or NUnit to xUnit and needing idiomatic test structure

---

## xUnit — Unit Tests

```csharp
using FluentAssertions;
using Moq;
using Xunit;

public class UserServiceTests
{
    private readonly Mock<IUserRepository> _repo   = new(MockBehavior.Strict);
    private readonly Mock<IEmailService>   _email  = new(MockBehavior.Loose);
    private readonly Mock<ILogger<UserService>> _logger = new();
    private readonly UserService _sut;

    public UserServiceTests()
    {
        _sut = new UserService(_repo.Object, _email.Object, _logger.Object);
    }

    [Fact]
    public async Task RegisterAsync_CreatesUser_WhenEmailIsUnique()
    {
        // Arrange
        _repo.Setup(r => r.FindByEmailAsync("alice@example.com", default))
             .ReturnsAsync((User?)null);
        _repo.Setup(r => r.SaveAsync(It.IsAny<User>(), default))
             .Returns(Task.CompletedTask);

        // Act
        var user = await _sut.RegisterAsync(
            new RegisterUserCommand("Alice", "alice@example.com", "secure_pass_123"));

        // Assert
        user.Should().NotBeNull();
        user.Name.Should().Be("Alice");
        user.Email.Value.Should().Be("alice@example.com");
        _repo.VerifyAll();
    }

    [Fact]
    public async Task RegisterAsync_ThrowsDuplicateEmailException_WhenEmailTaken()
    {
        _repo.Setup(r => r.FindByEmailAsync("taken@example.com", default))
             .ReturnsAsync(new User(1, "Bob", new Email("taken@example.com"), DateTimeOffset.UtcNow));

        var act = async () => await _sut.RegisterAsync(
            new RegisterUserCommand("Alice", "taken@example.com", "pass"));

        await act.Should().ThrowAsync<DuplicateEmailException>()
            .WithMessage("*taken@example.com*");
    }

    [Theory]
    [InlineData("")]
    [InlineData(" ")]
    [InlineData(null)]
    public async Task RegisterAsync_ThrowsArgumentException_ForEmptyName(string? name)
    {
        var act = async () => await _sut.RegisterAsync(
            new RegisterUserCommand(name!, "alice@example.com", "pass"));

        await act.Should().ThrowAsync<ArgumentException>()
            .WithParameterName("Name");
    }
}
```

---

## FluentAssertions Cheat Sheet

```csharp
// Objects
result.Should().NotBeNull();
result.Should().BeOfType<User>();
result.Should().BeEquivalentTo(expected, opt => opt.ExcludingMissingMembers());

// Strings
name.Should().Be("Alice");
name.Should().StartWith("Al").And.EndWith("ce");
name.Should().Contain("li");
name.Should().MatchRegex(@"^[A-Z][a-z]+$");

// Numbers
count.Should().BeGreaterThan(0);
value.Should().BeInRange(1, 100);
price.Should().BeApproximately(9.99m, 0.01m);

// Collections
list.Should().HaveCount(3);
list.Should().Contain(u => u.Name == "Alice");
list.Should().BeInAscendingOrder(u => u.Name);
list.Should().OnlyContain(u => u.IsActive);
list.Should().BeEmpty();

// Booleans
flag.Should().BeTrue();
flag.Should().BeFalse();

// Exceptions (sync)
act.Should().Throw<ArgumentException>().WithMessage("*positive*");
act.Should().NotThrow();

// Exceptions (async)
await asyncAct.Should().ThrowAsync<InvalidOperationException>();
await asyncAct.Should().NotThrowAsync();

// Date/time
dto.CreatedAt.Should().BeCloseTo(DateTimeOffset.UtcNow, TimeSpan.FromSeconds(5));
```

---

## NSubstitute (alternative to Moq)

```csharp
using NSubstitute;

var repo = Substitute.For<IUserRepository>();
repo.FindByEmailAsync("alice@example.com", Arg.Any<CancellationToken>())
    .Returns(Task.FromResult<User?>(null));

var sut = new UserService(repo, /* ... */);

// Assert call received
await repo.Received(1).SaveAsync(Arg.Is<User>(u => u.Name == "Alice"), Arg.Any<CancellationToken>());
await repo.DidNotReceiveWithAnyArgs().RemoveAsync(default);
```

---

## WebApplicationFactory — Integration Tests

```csharp
public class UserApiTests : IClassFixture<ApiFactory>
{
    private readonly HttpClient _client;

    public UserApiTests(ApiFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task PostUser_Returns201_WhenValid()
    {
        var response = await _client.PostAsJsonAsync("/users", new
        {
            name     = "Alice",
            email    = "alice@example.com",
            password = "super_secure_pass_12"
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var body = await response.Content.ReadFromJsonAsync<UserDto>();
        body!.Name.Should().Be("Alice");
        response.Headers.Location.Should().NotBeNull();
    }
}

// Shared fixture — creates one server for all tests
public sealed class ApiFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<DbContextOptions<AppDbContext>>();
            services.AddDbContext<AppDbContext>(o => o.UseInMemoryDatabase(Guid.NewGuid().ToString()));
        });
    }
}
```

---

## Testcontainers — Real Database Integration Tests

```csharp
public sealed class UserRepositoryTests : IAsyncLifetime
{
    private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder()
        .WithImage("postgres:16-alpine")
        .Build();

    private AppDbContext _db = null!;

    public async Task InitializeAsync()
    {
        await _postgres.StartAsync();

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(_postgres.GetConnectionString())
            .Options;

        _db = new AppDbContext(options);
        await _db.Database.MigrateAsync();
    }

    public async Task DisposeAsync()
    {
        await _db.DisposeAsync();
        await _postgres.DisposeAsync();
    }

    [Fact]
    public async Task SaveAsync_PersistsUser()
    {
        var repo = new EfUserRepository(_db);
        var user = User.Create("Alice", new Email("alice@example.com"));

        await repo.SaveAsync(user, default);

        var found = await repo.FindByEmailAsync("alice@example.com", default);
        found.Should().NotBeNull();
        found!.Name.Should().Be("Alice");
    }
}
```

---

## Bogus — Fake Data Generation

```csharp
using Bogus;

public static class UserFaker
{
    private static readonly Faker<User> _faker = new Faker<User>()
        .RuleFor(u => u.Name,  f => f.Name.FullName())
        .RuleFor(u => u.Email, f => new Email(f.Internet.Email()))
        .RuleFor(u => u.CreatedAt, f => f.Date.RecentOffset(30));

    public static User Generate() => _faker.Generate();
    public static List<User> Generate(int count) => _faker.Generate(count);
}

// In tests
var users = UserFaker.Generate(20);
```

---

## Coverlet — Code Coverage

```bash
dotnet test --collect:"XPlat Code Coverage" -- DataCollectionRunSettings.DataCollectors.DataCollector.Configuration.Format=cobertura

# HTML report with ReportGenerator
reportgenerator -reports:"coverage.cobertura.xml" -targetdir:"coverage-report" -reporttypes:Html
```

`Directory.Build.props` to enforce minimum:

```xml
<PropertyGroup>
  <CollectCoverage>true</CollectCoverage>
  <CoverletOutputFormat>cobertura</CoverletOutputFormat>
  <Threshold>80</Threshold>
  <ThresholdType>line</ThresholdType>
</PropertyGroup>
```
