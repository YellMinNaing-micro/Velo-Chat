using System.Collections.Generic;
using System.Security.Claims;
using VeloChat.WebAPI.Models;

namespace VeloChat.WebAPI.Services;

public interface ITokenService
{
    string GenerateAccessToken(ApplicationUser user, IList<string> roles);
    string GenerateRefreshToken();
    ClaimsPrincipal? GetPrincipalFromExpiredToken(string token);
}
