package com.smartlegal.backend.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.hibernate6.Hibernate6Module;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

/**
 * Application-wide Spring beans:
 *  - {@link RestTemplate}  — for calling the Python AI microservice, with configured timeouts
 *  - {@link ObjectMapper}  — Jackson mapper with Java 8 time support + Hibernate 6 proxy support
 */
@Configuration
public class AppConfig {

    @Value("${ai.service.timeout-ms:60000}")
    private long aiServiceTimeoutMs;

    /**
     * {@link RestTemplate} pre-configured with connect and read timeouts from application.properties.
     * Used by {@code DocumentService} to communicate with the Python AI microservice.
     */
    @Bean
    public RestTemplate restTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout((int) aiServiceTimeoutMs);
        factory.setReadTimeout((int) aiServiceTimeoutMs);
        return new RestTemplate(factory);
    }

    /**
     * Primary {@link ObjectMapper} with:
     *  1. JavaTimeModule  — serialize LocalDateTime as ISO-8601 strings (not epoch arrays)
     *  2. Hibernate6Module — handle Hibernate lazy-load proxy objects without throwing exceptions.
     *     FORCE_LAZY_LOADING is intentionally OFF to avoid N+1 queries;
     *     SERIALIZE_IDENTIFIER_FOR_LAZY_NOT_LOADED_OBJECTS is ON so unloaded relationships
     *     still emit their ID instead of crashing.
     */
    @Bean
    @Primary
    public ObjectMapper objectMapper() {
        Hibernate6Module hibernate6Module = new Hibernate6Module();
        // Do NOT force lazy loading — use EAGER on relationships you need in the API
        hibernate6Module.configure(Hibernate6Module.Feature.FORCE_LAZY_LOADING, false);
        // Emit the ID for any lazy object that wasn't loaded, instead of failing
        hibernate6Module.configure(Hibernate6Module.Feature.SERIALIZE_IDENTIFIER_FOR_LAZY_NOT_LOADED_OBJECTS, true);

        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());
        mapper.registerModule(hibernate6Module);
        mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        return mapper;
    }
}
