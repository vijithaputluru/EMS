using EmployeeManagementSystem.Controllers;

using EmployeeManagementSystem.Data;

using EmployeeManagementSystem.Helpers;

using EmployeeManagementSystem.Interfaces;

using EmployeeManagementSystem.Services;

using Microsoft.AspNetCore.Authentication.JwtBearer;

using Microsoft.EntityFrameworkCore;

using Microsoft.IdentityModel.Tokens;

using Microsoft.OpenApi.Models;

using System.IdentityModel.Tokens.Jwt;

using System.Security.Claims;

using System.Text;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.ResponseCompression;

using Pomelo.EntityFrameworkCore.MySql.Infrastructure;
using System.IO.Compression;

var builder = WebApplication.CreateBuilder(args);

// ================= SERVICES =================

builder.Services.AddControllers();

builder.Services.AddHttpContextAccessor();

builder.Services.AddScoped<IEmailService, EmailService>();

builder.Services.AddScoped<JwtHelper>();

// Optimization: pool DbContext instances to reduce per-request allocations without changing query behavior.
builder.Services.AddDbContextPool<AppDbContext>(options =>

    options.UseMySql(

        builder.Configuration.GetConnectionString("DefaultConnection"),

        new MySqlServerVersion(new Version(8, 0, 36))

    )

);

// Optimization: enable gzip/brotli for JSON APIs and static assets behind IIS/nginx/AWS proxies.
builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
    options.Providers.Add<BrotliCompressionProvider>();
    options.Providers.Add<GzipCompressionProvider>();
});

builder.Services.Configure<BrotliCompressionProviderOptions>(options =>
{
    options.Level = CompressionLevel.Fastest;
});

builder.Services.Configure<GzipCompressionProviderOptions>(options =>
{
    options.Level = CompressionLevel.Fastest;
});

builder.Services.AddScoped<IOfferLetterService, OfferLetterService>();

builder.Services.AddScoped<IPaySlipService, PaySlipService>();

builder.Services.AddScoped<IDashboardService, DashboardService>();

builder.Services.AddScoped<IAttendanceService, AttendanceService>();

builder.Services.AddScoped<IEmployeeService, EmployeeService>();

builder.Services.AddScoped<IEmployeeLeaveService, EmployeeLeaveService>();

builder.Services.AddScoped<ITaskManagementService, TaskManagementService>();

builder.Services.AddScoped<IAssetService, AssetService>();

builder.Services.AddScoped<IUserNotificationService, UserNotificationService>();

builder.Services.AddScoped<IUserDashboardService, UserDashboardService>();

builder.Services.AddScoped<IAdminNotificationService, AdminNotificationService>();

builder.Services.AddScoped<IRolePermissionService, RolePermissionService>();

builder.Services.AddScoped<IRoleService, RoleService>();

builder.Services.AddScoped<ReportsService>();

builder.Services.AddScoped<IManualPayslipService, ManualPayslipService>();

builder.Services.AddHostedService<AutoCheckoutService>();

builder.Services.AddScoped<ExperienceOfferLetterService>();

builder.Services.AddScoped<ModuleSearchService>();

// ================= CORS =================

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy
            .WithOrigins(
                "http://3.108.78.39",
                "https://3.108.78.39",
                "http://localhost:5173",
                "http://localhost:4200"
            )
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

// ================= JWT =================

JwtSecurityTokenHandler.DefaultInboundClaimTypeMap.Clear();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)

    .AddJwtBearer(options =>

    {
        options.RequireHttpsMetadata = false;
        options.SaveToken = true;

        options.TokenValidationParameters = new TokenValidationParameters

        {

            ValidateIssuer = true,

            ValidateAudience = true,

            ValidateLifetime = true,

            ValidateIssuerSigningKey = true,

            ValidIssuer = builder.Configuration["Jwt:Issuer"],

            ValidAudience = builder.Configuration["Jwt:Audience"],

            IssuerSigningKey = new SymmetricSecurityKey(

                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!)

            ),

            RoleClaimType = ClaimTypes.Role,

            NameClaimType = "EmployeeId"

        };

    });

builder.Services.AddAuthorization();

// ================= SWAGGER =================

builder.Services.AddEndpointsApiExplorer();

builder.Services.AddSwaggerGen(options =>

{

    options.SwaggerDoc("v1", new OpenApiInfo

    {

        Title = "Employee Management System API",

        Version = "v1"

    });

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme

    {

        Name = "Authorization",

        Type = SecuritySchemeType.Http,

        Scheme = "bearer",

        BearerFormat = "JWT",

        In = ParameterLocation.Header,

        Description = "Enter: Bearer {your JWT token}"

    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement

    {

        {

            new OpenApiSecurityScheme

            {

                Reference = new OpenApiReference

                {

                    Type = ReferenceType.SecurityScheme,

                    Id = "Bearer"

                }

            },

            new string[] {}

        }

    });

});

// ================= BUILD =================

var app = builder.Build();
app.UseForwardedHeaders(new ForwardedHeadersOptions
{
    ForwardedHeaders =
        ForwardedHeaders.XForwardedFor |
        ForwardedHeaders.XForwardedProto
});

app.UseHttpsRedirection();

app.UseResponseCompression();

// Optimization: cache immutable generated/static assets while keeping generated documents revalidatable.
app.UseStaticFiles(new StaticFileOptions
{
    OnPrepareResponse = context =>
    {
        var path = context.File.PhysicalPath ?? string.Empty;

        if (
            path.Contains("GeneratedPayslips", StringComparison.OrdinalIgnoreCase) ||
            path.Contains("GeneratedLetters", StringComparison.OrdinalIgnoreCase)
        )
        {
            context.Context.Response.Headers.CacheControl = "no-cache";
            return;
        }

        context.Context.Response.Headers.CacheControl = "public,max-age=604800";
    }
});

app.UseRouting();

app.UseCors("AllowAll");

app.UseSwagger();

app.UseSwaggerUI();

app.UseAuthentication();

app.UseAuthorization();

app.MapControllers();

app.Run();
