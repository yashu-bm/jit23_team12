package com.smartlegal.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.BufferingClientHttpRequestFactory;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestTemplate;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class GeminiService {

    private static final Logger log = LoggerFactory.getLogger(GeminiService.class);

    @Value("${ai.model:gemini-3.5-flash}")
    private String modelName;

    @Value("${ai.api.key:}")
    private String apiKey;

    @Value("${ai.provider:gemini}")
    private String provider;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public GeminiService(RestTemplate ignoredRestTemplate, ObjectMapper objectMapper) {
        // Create a new RestTemplate with buffering to allow logging interceptors
        this.restTemplate = new RestTemplate(new BufferingClientHttpRequestFactory(new SimpleClientHttpRequestFactory()));
        this.restTemplate.getInterceptors().add((request, body, execution) -> {
            log.info("--- RestTemplate Request ---");
            log.info("URI: {}", request.getURI());
            log.info("Method: {}", request.getMethod());
            org.springframework.http.HttpHeaders safeHeaders = new org.springframework.http.HttpHeaders();
            safeHeaders.putAll(request.getHeaders());
            if (safeHeaders.containsKey("x-goog-api-key")) {
                safeHeaders.set("x-goog-api-key", "[PROTECTED]");
            }
            log.info("Headers: {}", safeHeaders);
            log.info("Body: {}", new String(body));
            log.info("----------------------------");
            org.springframework.http.client.ClientHttpResponse response = execution.execute(request, body);
            log.info("--- RestTemplate Response ---");
            log.info("Status: {}", response.getStatusCode());
            log.info("Headers: {}", response.getHeaders());
            
            // Read body
            String responseBody = new BufferedReader(new InputStreamReader(response.getBody()))
                    .lines().collect(Collectors.joining("\n"));
            log.info("Body: {}", responseBody);
            log.info("-----------------------------");
            return response;
        });
        this.objectMapper = objectMapper;
    }

    @PostConstruct
    public void initDebug() {
        log.info("=== STARTING GEMINI DEBUG CHECKS ===");
        log.info("1. Config Values:");
        log.info("   ai.provider: {}", provider);
        log.info("   ai.model: {}", modelName);
        log.info("   ai.api.key present: {}", (apiKey != null && !apiKey.trim().isEmpty()));
        
        // Removed the synchronous internet connectivity checks and fallback loops 
        // to prevent Spring Boot from blocking for 155 seconds during startup.
        log.info("=== END GEMINI DEBUG CHECKS ===");
    }

    public boolean isConfigured() {
        return apiKey != null && !apiKey.trim().isEmpty() && !apiKey.equals("YOUR_API_KEY");
    }

    public String generateContent(String prompt, String base64Data, String mimeType, boolean expectJson) {
        if (!isConfigured()) {
            throw new RuntimeException("AI service is not configured. Please configure the AI API key.");
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("x-goog-api-key", apiKey);

        Map<String, Object> requestBody = new HashMap<>();
        List<Map<String, Object>> contents = new ArrayList<>();
        Map<String, Object> partsContainer = new HashMap<>();
        List<Map<String, Object>> parts = new ArrayList<>();

        Map<String, Object> textPart = new HashMap<>();
        textPart.put("text", prompt);
        parts.add(textPart);

        if (base64Data != null && !base64Data.isEmpty() && mimeType != null) {
            Map<String, Object> inlineDataPart = new HashMap<>();
            Map<String, Object> inlineData = new HashMap<>();
            inlineData.put("mimeType", mimeType);
            inlineData.put("data", base64Data);
            inlineDataPart.put("inlineData", inlineData);
            parts.add(inlineDataPart);
        }

        partsContainer.put("parts", parts);
        contents.add(partsContainer);
        requestBody.put("contents", contents);

        if (expectJson) {
            Map<String, Object> generationConfig = new HashMap<>();
            generationConfig.put("responseMimeType", "application/json");
            requestBody.put("generationConfig", generationConfig);
        }

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        int[] backoffs = {1000, 2000, 4000, 8000};
        String[] models = {modelName, modelName, modelName, modelName, modelName};
        
        for (int i = 0; i < models.length; i++) {
            String currentModel = models[i];
            try {
                return executeApi(currentModel, entity);
            } catch (RestClientResponseException e) {
                log.error("API Error with model {}: Status: {}, Body: {}", currentModel, e.getStatusCode(), e.getResponseBodyAsString());
                if (e.getStatusCode().value() == 429) {
                    throw new RuntimeException("AI service quota has been temporarily reached. Please try again later.");
                }
                if (i < models.length - 1 && e.getStatusCode().value() == 503) {
                    long waitTime = backoffs[i];
                    log.warn("Model {} returned 503. Retrying in {} ms...", currentModel, waitTime);
                    try { Thread.sleep(waitTime); } catch (InterruptedException ie) { Thread.currentThread().interrupt(); }
                    continue;
                }
                if (e.getStatusCode().value() == 503) {
                    throw new RuntimeException("AI service is temporarily busy. Please try again later.");
                }
                throw new RuntimeException("AI API error: " + e.getStatusCode() + " " + e.getResponseBodyAsString());
            } catch (ResourceAccessException e) {
                log.error("I/O Error with model {}: {}", currentModel, getRootCause(e), e);
                if (i < models.length - 1) {
                    long waitTime = backoffs[i];
                    try { Thread.sleep(waitTime); } catch (InterruptedException ie) { Thread.currentThread().interrupt(); }
                    continue;
                }
                throw new RuntimeException("AI I/O Error: " + getRootCause(e), e);
            } catch (Exception e) {
                log.error("Unexpected error with model {}: {}", currentModel, e.getMessage(), e);
                if (e.getMessage() != null && e.getMessage().contains("response parsing failed")) {
                    throw new RuntimeException(e.getMessage());
                }
                throw new RuntimeException("Unexpected AI error: " + e.getMessage(), e);
            }
        }
        throw new RuntimeException("AI service is temporarily busy. Please try again in a moment.");
    }

    private String getRootCause(Throwable t) {
        Throwable cause = t;
        while (cause.getCause() != null && cause.getCause() != cause) {
            cause = cause.getCause();
        }
        return cause.getClass().getName() + ": " + cause.getMessage();
    }

    private String executeApi(String currentModel, HttpEntity<Map<String, Object>> entity) {
        String cleanModel = currentModel.trim();
        if (cleanModel.startsWith("models/")) {
            cleanModel = cleanModel.substring(7);
        }
        String url = "https://generativelanguage.googleapis.com/v1beta/models/" + cleanModel + ":generateContent";
        
        log.info("--- EXACT GEMINI RUNTIME CONFIGURATION ---");
        log.info("Model actually used by GeminiService at runtime: '{}'", cleanModel);
        log.info("Actual Gemini endpoint being called: '{}'", url);
        log.info("------------------------------------------");
        
        try {
            log.info("Request Body: {}", objectMapper.writeValueAsString(entity.getBody()));
        } catch (Exception e) {}
        
        long startTime = System.currentTimeMillis();
        try {
            ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);
            long duration = System.currentTimeMillis() - startTime;
            log.info("Gemini request SUCCESS:\nModel: {}\nStatus: {}\nDuration: {} ms", cleanModel, response.getStatusCode(), duration);
            return parseGeminiResponse(response.getBody());
        } catch (RestClientResponseException e) {
            long duration = System.currentTimeMillis() - startTime;
            log.error("Gemini error:\nModel: {}\nHTTP status: {}\nDuration: {} ms\nMessage: {}", 
                     cleanModel, e.getStatusCode(), duration, e.getResponseBodyAsString());
            throw e;
        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            log.error("Gemini request failed unexpectedly. Model: {}. Duration: {} ms. Error: {}", cleanModel, duration, e.getMessage(), e);
            throw new RuntimeException("Gemini request failed unexpectedly", e);
        }
    }

    private String parseGeminiResponse(String responseBody) {
        try {
            JsonNode rootNode = objectMapper.readTree(responseBody);
            JsonNode candidates = rootNode.path("candidates");
            if (candidates.isArray() && candidates.size() > 0) {
                JsonNode content = candidates.get(0).path("content");
                JsonNode parts = content.path("parts");
                if (parts.isArray() && parts.size() > 0) {
                    return parts.get(0).path("text").asText();
                }
            }
            throw new RuntimeException("Gemini request succeeded but response parsing failed. Invalid format. Body: " + responseBody);
        } catch (Exception e) {
            log.error("Failed to parse Gemini response: {}", responseBody, e);
            throw new RuntimeException("Gemini request succeeded but response parsing failed. Error: " + e.getMessage());
        }
    }
}
