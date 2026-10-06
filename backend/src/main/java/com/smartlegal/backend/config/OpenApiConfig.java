package com.smartlegal.backend.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.info.Contact;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.info.License;
import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * OpenAPI / Swagger 3 configuration.
 * <ul>
 *   <li>Exposes API metadata (title, version, description, contact)</li>
 *   <li>Registers a Bearer JWT security scheme</li>
 *   <li>Applies that scheme globally so every endpoint shows the padlock icon</li>
 * </ul>
 */
@Configuration
@OpenAPIDefinition(
        info = @Info(
                title = "Smart Legal Assistance API",
                version = "1.0.0",
                description = "REST API for the Smart Legal Assistance and Lawyer Recommendation System. " +
                        "Provides endpoints for user authentication, document analysis, lawyer discovery, " +
                        "appointment management, and real-time chat.",
                contact = @Contact(
                        name = "Smart Legal Team",
                        email = "support@smartlegal.com"
                ),
                license = @License(name = "Proprietary")
        )
)
public class OpenApiConfig {

    private static final String BEARER_SCHEME_NAME = "bearerAuth";

    @Bean
    public OpenAPI openAPI() {
        SecurityScheme bearerScheme = new SecurityScheme()
                .name(BEARER_SCHEME_NAME)
                .type(SecurityScheme.Type.HTTP)
                .scheme("bearer")
                .bearerFormat("JWT")
                .description("Provide your JWT token obtained from /api/auth/login. " +
                        "Format: Bearer <token>");

        SecurityRequirement globalSecurityRequirement =
                new SecurityRequirement().addList(BEARER_SCHEME_NAME);

        return new OpenAPI()
                .components(new Components()
                        .addSecuritySchemes(BEARER_SCHEME_NAME, bearerScheme))
                .addSecurityItem(globalSecurityRequirement);
    }
}
