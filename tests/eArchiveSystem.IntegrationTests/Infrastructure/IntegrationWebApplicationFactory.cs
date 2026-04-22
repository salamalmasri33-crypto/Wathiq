using eArchiveSystem.Domain.Models;
using eArchiveSystem.Application.Interfaces.Security;
using eArchiveSystem.Infrastructure.Security;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using MongoDB.Driver;

namespace eArchiveSystem.IntegrationTests.Infrastructure;

public sealed class IntegrationWebApplicationFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly string _connectionString =
        Environment.GetEnvironmentVariable("WATHIQ_TEST_MONGODB_CONNECTION")
        ?? "mongodb://localhost:27017";

    public string DatabaseName { get; } = $"WathiqIntegrationTests_{Guid.NewGuid():N}";

    protected override void ConfigureWebHost(Microsoft.AspNetCore.Hosting.IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        builder.ConfigureAppConfiguration((_, configBuilder) =>
        {
            var testSettings = new Dictionary<string, string?>
            {
                ["MongoDB:ConnectionString"] = _connectionString,
                ["MongoDB:DatabaseName"] = DatabaseName,
                ["ConnectionStrings:DefaultConnection"] = _connectionString,
                ["Jwt:Key"] = "THIS_IS_A_SUPER_SECRET_KEY_CHANGE_IT",
                ["Jwt:Issuer"] = "eArchiveSystem",
                ["Jwt:Audience"] = "eArchiveSystemUsers",
                ["BootstrapAdmin:Name"] = "Integration Admin",
                ["BootstrapAdmin:Email"] = "integration-admin@example.com",
                ["BootstrapAdmin:Password"] = "Admin@123",
                ["EmailSettings:From"] = "integration@example.com",
                ["EmailSettings:Password"] = "not-used-in-tests",
                ["EmailSettings:Host"] = "localhost",
                ["EmailSettings:Port"] = "2525",
                ["OcrService:BaseUrl"] = "http://localhost:1",
                ["App:BaseUrl"] = "http://localhost"
            };

            configBuilder.AddInMemoryCollection(testSettings);
        });
    }

    public async Task InitializeAsync()
    {
        await ResetDatabaseAsync();
    }

    public new async Task DisposeAsync()
    {
        await ResetDatabaseAsync();
        Dispose();
    }

    public async Task ResetDatabaseAsync()
    {
        using var scope = Services.CreateScope();
        var client = scope.ServiceProvider.GetRequiredService<IMongoClient>();
        await client.DropDatabaseAsync(DatabaseName);
    }

    public async Task<User> SeedUserAsync(
        string email,
        string password,
        string role = "User",
        string department = "IT",
        bool twoFactorEnabled = false)
    {
        using var scope = Services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<IMongoDatabase>();
        var users = database.GetCollection<User>("Users");
        var hasher = new BCryptPasswordHasher();

        var user = new User
        {
            Name = "Integration Test User",
            Email = email,
            Password = hasher.Hash(password),
            Role = role,
            Department = department,
            TwoFactorEnabled = twoFactorEnabled
        };

        await users.InsertOneAsync(user);
        return user;
    }

    public async Task<Document> SeedDocumentAsync(
        string userId,
        string title,
        string department = "IT",
        Metadata? metadata = null,
        string? fileHash = null,
        string? content = null)
    {
        using var scope = Services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<IMongoDatabase>();
        var documents = database.GetCollection<Document>("Documents");

        var document = new Document
        {
            Title = title,
            Content = content,
            FileName = $"{title}.pdf",
            FilePath = $"uploads/{Guid.NewGuid():N}.pdf",
            ContentType = "application/pdf",
            Size = 1024,
            FileHash = fileHash ?? Guid.NewGuid().ToString("N"),
            UserId = userId,
            Department = department,
            Metadata = metadata,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await documents.InsertOneAsync(document);
        return document;
    }

    public async Task<Document?> GetDocumentAsync(string documentId)
    {
        using var scope = Services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<IMongoDatabase>();
        var documents = database.GetCollection<Document>("Documents");

        return await documents.Find(document => document.Id == documentId).FirstOrDefaultAsync();
    }

    public async Task<Metadata?> GetMetadataAsync(string documentId)
    {
        using var scope = Services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<IMongoDatabase>();
        var metadataCollection = database.GetCollection<Metadata>("Metadata");

        return await metadataCollection.Find(metadata => metadata.Id == documentId).FirstOrDefaultAsync();
    }

    public string GenerateJwtToken(User user)
    {
        using var scope = Services.CreateScope();
        var tokenService = scope.ServiceProvider.GetRequiredService<ITokenService>();
        return tokenService.GenerateJwtToken(user);
    }
}
