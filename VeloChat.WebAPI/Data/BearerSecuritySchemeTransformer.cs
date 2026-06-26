using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.OpenApi;

namespace VeloChat.WebAPI.Data;

public class BearerSecuritySchemeTransformer : IOpenApiDocumentTransformer
{
    public Task TransformAsync(OpenApiDocument document, OpenApiDocumentTransformerContext context, CancellationToken cancellationToken)
    {
        document.Components ??= new OpenApiComponents();
        document.Components.SecuritySchemes ??= new Dictionary<string, IOpenApiSecurityScheme>();
        
        var schemeId = "Bearer";
        document.Components.SecuritySchemes[schemeId] = new OpenApiSecurityScheme 
        { 
            Type = SecuritySchemeType.Http, 
            Scheme = "bearer", 
            BearerFormat = "JWT" 
        };

        document.Security ??= new List<OpenApiSecurityRequirement>();
        document.Security.Add(new OpenApiSecurityRequirement 
        { 
            [new OpenApiSecuritySchemeReference(schemeId, document)] = new List<string>() 
        });

        return Task.CompletedTask;
    }
}
