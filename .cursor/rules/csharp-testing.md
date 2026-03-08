---
paths:
  - "**/*.cs"
  - "**/*.csx"
  - "**/*.razor"
---

# C# Testing

> This file extends [common/testing.md](../common/testing.md) with C# specific content.

## Test Framework: xUnit + FluentAssertions + Moq

```csharp
using FluentAssertions;
using Moq;
using Xunit;

public class UserServiceTests
{
    private readonly Mock<IUserRepository> _repository = new();
    private readonly Mock<ILogger<UserService>> _logger = new();
    private readonly UserService _sut;

    public UserServiceTests()
    {
        _sut = new UserService(_repository.Object, _logger.Object);
    }

    [Fact]
    public async Task FindByIdAsync_ReturnsUser_WhenFound()
    {
        // Arrange
        var user = new User(1, "Alice", new Email("alice@example.com"), DateTimeOffset.UtcNow);
        _repository.Setup(r => r.FindByIdAsync(1, default)).ReturnsAsync(user);

        // Act
        var result = await _sut.FindByIdAsync(1);

        // Assert
        result.Should().NotBeNull();
        result!.Name.Should().Be("Alice");
    }

    [Fact]
    public async Task FindByIdAsync_ReturnsNull_WhenNotFound()
    {
        _repository.Setup(r => r.FindByIdAsync(999, default)).ReturnsAsync((User?)null);

        var result = await _sut.FindByIdAsync(999);

        result.Should().BeNull();
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task FindByIdAsync_ThrowsArgumentException_ForInvalidId(int id)
    {
        var act = () => _sut.FindByIdAsync(id);

        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("*must be positive*");
    }
}
```

## FluentAssertions Reference

```csharp
// Equality
result.Should().Be(expected);
result.Should().NotBe(unexpected);

// Null
result.Should().BeNull();
result.Should().NotBeNull();

// Collections
list.Should().HaveCount(3);
list.Should().Contain(x => x.Id == 1);
list.Should().BeEmpty();
list.Should().BeEquivalentTo(expected);

// Strings
name.Should().Be("Alice");
name.Should().StartWith("Al");
name.Should().Contain("ice");

// Exceptions
act.Should().Throw<ArgumentException>().WithMessage("*positive*");
await asyncAct.Should().ThrowAsync<InvalidOperationException>();

// Types
obj.Should().BeOfType<User>();
obj.Should().BeAssignableTo<IEntity>();

// Numeric
value.Should().BeGreaterThan(0);
value.Should().BeInRange(1, 100);
```

## Test Organization

```
MyProject/
  src/
    MyProject.Domain/
    MyProject.Application/
    MyProject.Api/
  tests/
    MyProject.Domain.Tests/
    MyProject.Application.Tests/
    MyProject.Api.Tests/           # integration tests
  MyProject.sln
```

## Integration Tests with WebApplicationFactory

```csharp
public class UserApiTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public UserApiTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureServices(services =>
            {
                // Replace real DB with in-memory
                services.RemoveAll<DbContextOptions<AppDbContext>>();
                services.AddDbContext<AppDbContext>(o => o.UseInMemoryDatabase("TestDb"));
            });
        }).CreateClient();
    }

    [Fact]
    public async Task GetUser_Returns200_WhenUserExists()
    {
        var response = await _client.GetAsync("/api/users/1");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var user = await response.Content.ReadFromJsonAsync<UserDto>();
        user!.Name.Should().Be("Alice");
    }
}
```

## Reference

For patterns and ASP.NET Core: `skills/csharp-patterns`
For testing and Testcontainers: `skills/csharp-testing`
