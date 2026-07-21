package com.smartlegal.backend.controller;

import com.smartlegal.backend.service.GeminiService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/chatbot")
public class ChatbotController {

    private static final Logger log = LoggerFactory.getLogger(ChatbotController.class);

    @Autowired
    private GeminiService geminiService;

    @PostMapping("/chat")
    public ResponseEntity<?> chat(@RequestBody Map<String, Object> payload) {
        try {
            if (!geminiService.isConfigured()) {
                return ResponseEntity.badRequest().body(Map.of("response", "AI service is not configured. Please configure the AI API key."));
            }

            String message = (String) payload.getOrDefault("message", "");
            log.info("Processing generic chatbot request natively");
            
            String prompt = "You are a helpful and knowledgeable legal assistant. Answer the user's question clearly and concisely.\n\n" +
                            "User: " + message;
            
            String aiResponse = geminiService.generateContent(prompt, null, null, false);
            return ResponseEntity.ok(Map.of("response", aiResponse));
        } catch (Exception e) {
            log.error("Chatbot failed: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of("response", "AI chat failed: " + e.getMessage()));
        }
    }
}
