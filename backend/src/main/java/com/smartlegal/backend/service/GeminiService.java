package com.smartlegal.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class GeminiService {

    private static final Logger log = LoggerFactory.getLogger(GeminiService.class);
    private static final String GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=";

    @Value("${ai.api.key:}")
    private String apiKey;

    @Value("${ai.provider:gemini}")
    private String provider;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public GeminiService(RestTemplate restTemplate, ObjectMapper objectMapper) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
    }

    public boolean isConfigured() {
        return apiKey != null && !apiKey.trim().isEmpty() && !apiKey.equals("YOUR_API_KEY");
    }

    /**
     * Generates a response from Gemini using text and optional file data (Base64).
     * @param prompt Text prompt.
     * @param base64Data Optional base64 encoded file data.
     * @param mimeType Mime type of the file (e.g., application/pdf, image/jpeg).
     * @param expectJson Whether to instruct the model to return JSON.
     * @return Raw text response (or JSON string).
     */
    public String generateContent(String prompt, String base64Data, String mimeType, boolean expectJson) {
        if (!isConfigured()) {
            throw new RuntimeException("AI service is not configured. Please configure the AI API key.");
        }

        String url = GEMINI_API_URL + apiKey;

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> requestBody = new HashMap<>();
        List<Map<String, Object>> contents = new ArrayList<>();
        Map<String, Object> partsContainer = new HashMap<>();
        List<Map<String, Object>> parts = new ArrayList<>();

        // Add text prompt
        Map<String, Object> textPart = new HashMap<>();
        textPart.put("text", prompt);
        parts.add(textPart);

        // Add optional file data (inlineData)
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

        // Configuration for JSON if expected
        if (expectJson) {
            Map<String, Object> generationConfig = new HashMap<>();
            generationConfig.put("responseMimeType", "application/json");
            requestBody.put("generationConfig", generationConfig);
        }

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);
            return parseGeminiResponse(response.getBody());
        } catch (Exception e) {
            log.error("Gemini API call failed", e);
            throw new RuntimeException("AI service unavailable: " + e.getMessage());
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
            throw new RuntimeException("Invalid response format from AI service");
        } catch (Exception e) {
            log.error("Failed to parse Gemini response: {}", responseBody, e);
            throw new RuntimeException("Failed to parse AI response");
        }
    }
}
