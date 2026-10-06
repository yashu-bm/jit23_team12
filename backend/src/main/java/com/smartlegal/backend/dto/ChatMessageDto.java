package com.smartlegal.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessageDto {
    private Long senderId;
    private Long receiverId;
    private Long sessionId;
    private String message;
    private String fileUrl;
    private String fileName;
    private String messageType; // TEXT, IMAGE, FILE
}
