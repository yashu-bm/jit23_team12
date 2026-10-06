package com.smartlegal.backend.controller;

import com.smartlegal.backend.service.GeminiService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
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
            String language = (String) payload.getOrDefault("language", "en");
            
            StringBuilder promptBuilder = new StringBuilder();
            promptBuilder.append("You are a helpful and knowledgeable legal assistant. Answer the user's question clearly and concisely.\n");
            
            if ("hi".equals(language)) {
                promptBuilder.append("Please provide your response in Hindi.\n");
            } else if ("kn".equals(language)) {
                promptBuilder.append("Please provide your response in Kannada.\n");
            } else {
                promptBuilder.append("Please provide your response in English.\n");
            }
            
            promptBuilder.append("\nConversation History:\n");
            Object historyObj = payload.get("history");
            if (historyObj instanceof List) {
                List<?> history = (List<?>) historyObj;
                for (Object item : history) {
                    if (item instanceof Map) {
                        @SuppressWarnings("unchecked")
                        Map<String, Object> msg = (Map<String, Object>) item;
                        String role = (String) msg.getOrDefault("role", "user");
                        String content = (String) msg.getOrDefault("content", "");
                        promptBuilder.append("user".equals(role) ? "User: " : "Assistant: ").append(content).append("\n");
                    }
                }
            }
            
            promptBuilder.append("User: ").append(message).append("\nAssistant:");
            String prompt = promptBuilder.toString();
            
            log.info("Processing generic chatbot request natively in language: {}", language);
            
            String aiResponse = geminiService.generateContent(prompt, null, null, false);
            return ResponseEntity.ok(Map.of("response", aiResponse));
        } catch (Exception e) {
            log.error("Chatbot failed: {}", e.getMessage(), e);
            // Return OK so the frontend displays the actual error message in the chat instead of falling back to a generic message
            return ResponseEntity.ok(Map.of("response", e.getMessage()));
        }
    }
}
