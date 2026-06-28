package com.smartlegal.backend.controller;

import com.smartlegal.backend.dto.ChatMessageDto;
import com.smartlegal.backend.entity.ChatMessage;
import com.smartlegal.backend.entity.ChatSession;
import com.smartlegal.backend.entity.User;
import com.smartlegal.backend.repository.ChatMessageRepository;
import com.smartlegal.backend.repository.ChatSessionRepository;
import com.smartlegal.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.transaction.annotation.Transactional;

@Controller
@RequiredArgsConstructor
@Slf4j
public class ChatWebSocketController {

    private final SimpMessagingTemplate messagingTemplate;
    private final ChatMessageRepository chatMessageRepository;
    private final UserRepository userRepository;
    private final ChatSessionRepository chatSessionRepository;

    @MessageMapping("/chat.send")
    @Transactional
    public void processMessage(@Payload ChatMessageDto chatMessageDto) {
        try {
            User sender = userRepository.findById(chatMessageDto.getSenderId())
                    .orElseThrow(() -> new RuntimeException("Sender not found"));
            
            User receiver = userRepository.findById(chatMessageDto.getReceiverId())
                    .orElseThrow(() -> new RuntimeException("Receiver not found"));

            ChatSession session = chatSessionRepository.findById(chatMessageDto.getSessionId())
                    .orElseThrow(() -> new RuntimeException("Session not found"));

            ChatMessage chatMessage = ChatMessage.builder()
                    .sender(sender)
                    .receiver(receiver)
                    .session(session)
                    .message(chatMessageDto.getMessage())
                    .fileUrl(chatMessageDto.getFileUrl())
                    .fileName(chatMessageDto.getFileName())
                    .messageType(chatMessageDto.getMessageType() != null ? chatMessageDto.getMessageType() : "TEXT")
                    .build();

            ChatMessage savedMessage = chatMessageRepository.save(chatMessage);

            // Send to receiver's specific queue
            messagingTemplate.convertAndSendToUser(
                    String.valueOf(receiver.getId()),
                    "/queue/messages",
                    savedMessage
            );
            
            // Also echo back to the sender if they have multiple devices open
            messagingTemplate.convertAndSendToUser(
                    String.valueOf(sender.getId()),
                    "/queue/messages",
                    savedMessage
            );
            
        } catch (Exception e) {
            log.error("Failed to process chat message", e);
        }
    }
}
