package com.smartlegal.backend.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@RestController
@RequestMapping("/api/chatbot")
public class ChatbotController {

    private static final Logger log = LoggerFactory.getLogger(ChatbotController.class);

    @Autowired
    private RestTemplate restTemplate;

    @Value("${ai.service.url:http://localhost:8000}")
    private String aiServiceBaseUrl;

    @PostMapping("/chat")
    public ResponseEntity<?> chat(@RequestBody Map<String, Object> payload) {
        try {
            String aiUrl = aiServiceBaseUrl.replaceAll("/$", "") + "/api/v1/chatbot/chat";
            log.info("Proxying chatbot request to: {}", aiUrl);
            
            ResponseEntity<Map> response = restTemplate.postForEntity(aiUrl, payload, Map.class);
            return ResponseEntity.status(response.getStatusCode()).body(response.getBody());
        } catch (Exception e) {
            log.error("Chatbot proxy failed: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of("response", "Error connecting to AI service"));
        }
    }
}
