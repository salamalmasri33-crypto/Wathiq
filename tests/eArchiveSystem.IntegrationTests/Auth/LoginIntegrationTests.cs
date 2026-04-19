using System.Net.Http.Json;
using System.Text.Json;
using eArchiveSystem.IntegrationTests.Infrastructure;
using Microsoft.AspNetCore.Mvc.Testing;

namespace eArchiveSystem.IntegrationTests.Auth;

public class LoginIntegrationTests : IClassFixture<IntegrationWebApplicationFactory>
{
    private readonly IntegrationWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public LoginIntegrationTests(IntegrationWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost")
        });
    }

    [Fact]
    public async Task Login_WithValidCredentials_ReturnsJwtAndUserPayload()
    {
        await _factory.ResetDatabaseAsync();
        var seededUser = await _factory.SeedUserAsync(
            email: "integration-user@example.com",
            password: "Password@123");

        var response = await _client.PostAsJsonAsync("/api/auth/login", new
        {
            Email = "integration-user@example.com",
            Password = "Password@123"
        });

        response.EnsureSuccessStatusCode();

        await using var contentStream = await response.Content.ReadAsStreamAsync();
        using var payload = await JsonDocument.ParseAsync(contentStream);

        Assert.True(payload.RootElement.TryGetProperty("token", out var tokenElement));
        Assert.False(string.IsNullOrWhiteSpace(tokenElement.GetString()));

        var userElement = payload.RootElement.GetProperty("user");
        Assert.Equal(seededUser.Email, userElement.GetProperty("email").GetString());
        Assert.Equal(seededUser.Role, userElement.GetProperty("role").GetString());
        Assert.False(payload.RootElement.GetProperty("requires2FA").GetBoolean());
    }
}
