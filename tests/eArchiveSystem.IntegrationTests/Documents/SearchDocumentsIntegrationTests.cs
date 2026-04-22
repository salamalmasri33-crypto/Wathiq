using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using eArchiveSystem.Application.DTOs;
using eArchiveSystem.Domain.Models;
using eArchiveSystem.IntegrationTests.Infrastructure;
using Microsoft.AspNetCore.Mvc.Testing;

namespace eArchiveSystem.IntegrationTests.Documents;

public class SearchDocumentsIntegrationTests : IClassFixture<IntegrationWebApplicationFactory>
{
    private readonly IntegrationWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public SearchDocumentsIntegrationTests(IntegrationWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost")
        });
    }

    [Fact]
    public async Task Search_AsRegularUser_ReturnsOnlyOwnedMatchingDocuments_AndOmitsHeavyContentPayload()
    {
        await _factory.ResetDatabaseAsync();

        var owner = await _factory.SeedUserAsync("owner@example.com", "Password@123");
        var otherUser = await _factory.SeedUserAsync("other@example.com", "Password@123");

        await _factory.SeedDocumentAsync(
            userId: owner.Id,
            title: "Quarterly Finance Report",
            metadata: new Metadata
            {
                Description = "Detailed finance report for Q1",
                Category = "Finance",
                DocumentType = "Report",
                Tags = new List<string> { "finance", "quarterly" },
                Department = "Finance"
            },
            department: "Finance",
            content: new string('A', 12_000));

        await _factory.SeedDocumentAsync(
            userId: otherUser.Id,
            title: "Quarterly Finance Report",
            metadata: new Metadata
            {
                Description = "Other user's report",
                Category = "Finance",
                DocumentType = "Report",
                Tags = new List<string> { "finance" },
                Department = "Finance"
            },
            department: "Finance");

        _client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", _factory.GenerateJwtToken(owner));

        var searchResponse = await _client.PostAsJsonAsync("/api/documents/search", new
        {
            Query = "Finance"
        });

        searchResponse.EnsureSuccessStatusCode();

        var json = await searchResponse.Content.ReadAsStringAsync();
        var documents = JsonSerializer.Deserialize<SearchDocumentsResponseDto>(json, new JsonSerializerOptions(JsonSerializerDefaults.Web));

        Assert.NotNull(documents);
        Assert.DoesNotContain("\"content\":", json, StringComparison.OrdinalIgnoreCase);
        Assert.Equal(1, documents!.Total);
        Assert.Single(documents.Items);
        Assert.Equal(owner.Id, documents.Items[0].OwnerId);
        Assert.Equal("Quarterly Finance Report", documents.Items[0].Title);
        Assert.Equal("Finance", documents.Items[0].Metadata?.Category);
    }
}
