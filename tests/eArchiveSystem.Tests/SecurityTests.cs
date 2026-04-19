using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using eArchiveSystem.Domain.Models;
using eArchiveSystem.Infrastructure.Security;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;

namespace eArchiveSystem.Tests;

public class JwtTokenServiceTests
{
    [Fact]
    public void GenerateJwtToken_ShouldEmbedIssuerAudienceAndIdentityClaims()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Key"] = "UnitTests_Super_Secret_Key_1234567890",
                ["Jwt:Issuer"] = "Wathiq.UnitTests",
                ["Jwt:Audience"] = "Wathiq.UnitTests.Users"
            })
            .Build();

        var service = new JwtTokenService(config);
        var user = new User
        {
            Id = "507f1f77bcf86cd799439011",
            Email = "security@example.com",
            Role = "Manager"
        };

        var token = service.GenerateJwtToken(user);
        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);

        Assert.Equal("Wathiq.UnitTests", jwt.Issuer);
        Assert.Equal("Wathiq.UnitTests.Users", jwt.Audiences.Single());
        Assert.Equal(user.Id, jwt.Claims.Single(c => c.Type == ClaimTypes.NameIdentifier).Value);
        Assert.Equal(user.Email, jwt.Claims.Single(c => c.Type == "email").Value);
        Assert.Equal(user.Role, jwt.Claims.Single(c => c.Type == ClaimTypes.Role).Value);
        Assert.True(jwt.ValidTo > DateTime.UtcNow.AddHours(2));
    }
}

public class Sha256FileHashCalculatorTests
{
    [Fact]
    public async Task ComputeHashAsync_ShouldReturnDeterministicSha256Hash()
    {
        var content = Encoding.UTF8.GetBytes("wathiq-test-file");
        using var stream = new MemoryStream(content);
        IFormFile file = new FormFile(stream, 0, content.Length, "file", "sample.txt");

        var calculator = new Sha256FileHashCalculator();
        var expectedHash = Convert.ToHexString(SHA256.HashData(content)).ToLowerInvariant();

        var actualHash = await calculator.ComputeHashAsync(file);

        Assert.Equal(expectedHash, actualHash);
    }
}
