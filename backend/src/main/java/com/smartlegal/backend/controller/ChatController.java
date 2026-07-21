package com.smartlegal.backend.controller;

import com.smartlegal.backend.entity.ChatMessage;
import com.smartlegal.backend.entity.ChatSession;
import com.smartlegal.backend.entity.User;
import com.smartlegal.backend.repository.ChatMessageRepository;
import com.smartlegal.backend.repository.ChatSessionRepository;
import com.smartlegal.backend.repository.UserRepository;
import com.smartlegal.backend.repository.LawyerProfileRepository;
import com.smartlegal.backend.entity.LawyerProfile;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import com.smartlegal.backend.entity.Appointment;
import com.smartlegal.backend.repository.AppointmentRepository;


@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatSessionRepository chatSessionRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final UserRepository userRepository;
    private final LawyerProfileRepository lawyerProfileRepository;
    private final AppointmentRepository appointmentRepository;


    @PostMapping("/session")
    public ResponseEntity<?> getOrCreateSession(@RequestBody Map<String, Long> payload) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("User not found"));
        Long targetUserId = payload.get("targetUserId");

        if (targetUserId == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "targetUserId is required"));
        }

        User targetUser = userRepository.findById(targetUserId).orElseThrow(() -> new RuntimeException("Target user not found"));

        // Determine client and lawyer
        User client = currentUser.getRole().getName().name().equals("ROLE_USER") ? currentUser : targetUser;
        User lawyer = currentUser.getRole().getName().name().equals("ROLE_LAWYER") ? currentUser : targetUser;

        ChatSession session = chatSessionRepository.findByUserIdAndLawyerId(client.getId(), lawyer.getId()).orElse(null);
        if (session == null) {
            session = ChatSession.builder()
                    .user(client)
                    .lawyer(lawyer)
                    .build();
            session = chatSessionRepository.save(session);
        }

        return ResponseEntity.ok(session);
    }

    @GetMapping("/session/{sessionId}/messages")
    public ResponseEntity<List<ChatMessage>> getMessages(@PathVariable Long sessionId) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("User not found"));

        ChatSession session = chatSessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found"));

        // Authorize
        if (!session.getUser().getId().equals(currentUser.getId()) && !session.getLawyer().getId().equals(currentUser.getId())) {
            return ResponseEntity.status(403).body(null);
        }

        List<ChatMessage> messages = chatMessageRepository.findBySessionIdOrderByCreatedAtAsc(sessionId);
        return ResponseEntity.ok(messages);
    }

    @GetMapping("/unread")
    public ResponseEntity<?> getGlobalUnreadCount() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("User not found"));
        int unreadCount = chatMessageRepository.countByReceiverIdAndIsReadFalse(currentUser.getId());
        return ResponseEntity.ok(Map.of("unreadCount", unreadCount));
    }

    @PutMapping("/session/{sessionId}/read")
    public ResponseEntity<?> markSessionAsRead(@PathVariable Long sessionId) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("User not found"));
        int updated = chatMessageRepository.markAsReadBySessionAndReceiver(sessionId, currentUser.getId());
        return ResponseEntity.ok(Map.of("updated", updated));
    }

    @Transactional
    @GetMapping("/conversations")
    public ResponseEntity<?> getConversations() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("User not found"));
        
        List<Appointment> appointments;
        if (currentUser.getRole().getName().name().equals("ROLE_LAWYER")) {
            appointments = appointmentRepository.findByLawyerProfileIdOrderByAppointmentDateDesc(currentUser.getId());
        } else {
            appointments = appointmentRepository.findByUserIdOrderByAppointmentDateDesc(currentUser.getId());
        }

        List<Appointment> paidAppointments = appointments.stream()
                .filter(a -> "PAID".equalsIgnoreCase(a.getStatus()) || "COMPLETED".equalsIgnoreCase(a.getStatus()))
                .collect(Collectors.toList());

        for (Appointment appt : paidAppointments) {
            User client = appt.getUser();
            User lawyer = appt.getLawyerProfile().getUser();
            ChatSession session = chatSessionRepository.findByUserIdAndLawyerId(client.getId(), lawyer.getId()).orElse(null);
            if (session == null) {
                session = ChatSession.builder()
                        .user(client)
                        .lawyer(lawyer)
                        .build();
                chatSessionRepository.save(session);
            }
        }

        List<ChatSession> sessions = chatSessionRepository.findByUserIdOrLawyerIdOrderByCreatedAtDesc(currentUser.getId(), currentUser.getId());
        
        List<Map<String, Object>> response = sessions.stream().map(session -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", session.getId());
            
            User targetUser = session.getUser().getId().equals(currentUser.getId()) ? session.getLawyer() : session.getUser();
            map.put("targetUserId", targetUser.getId());
            map.put("targetUserName", targetUser.getFullName());
            
            if (targetUser.getRole().getName().name().equals("ROLE_LAWYER")) {
                lawyerProfileRepository.findById(targetUser.getId()).ifPresentOrElse(
                    lp -> map.put("targetUserProfileImage", lp.getProfileImageUrl()),
                    () -> map.put("targetUserProfileImage", targetUser.getProfileImageUrl())
                );
            } else {
                map.put("targetUserProfileImage", targetUser.getProfileImageUrl());
            }
            
            int unreadCount = chatMessageRepository.countBySessionIdAndReceiverIdAndIsReadFalse(session.getId(), currentUser.getId());
            map.put("unreadCount", unreadCount);
            
            chatMessageRepository.findFirstBySessionIdOrderByCreatedAtDesc(session.getId()).ifPresentOrElse(msg -> {
                map.put("lastMessage", msg.getMessage());
                map.put("lastMessageTime", msg.getCreatedAt());
            }, () -> {
                map.put("lastMessage", "Start your consultation");
                map.put("lastMessageTime", session.getCreatedAt());
            });
            
            return map;
        }).collect(Collectors.toList());
        
        return ResponseEntity.ok(response);
    }

    @PostMapping("/upload")
    public ResponseEntity<?> uploadAttachment(@RequestParam("file") org.springframework.web.multipart.MultipartFile file) {
        if (file.getSize() > 10 * 1024 * 1024) {
            return ResponseEntity.badRequest().body(Map.of("message", "File size exceeds 10 MB limit."));
        }
        
        String originalFilename = file.getOriginalFilename();
        String extension = "";
        if (originalFilename != null && originalFilename.lastIndexOf(".") > 0) {
            extension = originalFilename.substring(originalFilename.lastIndexOf(".") + 1).toLowerCase();
        }
        
        List<String> allowedExtensions = List.of("pdf", "doc", "docx", "txt", "jpg", "jpeg", "png");
        
        if (extension.isEmpty() || !allowedExtensions.contains(extension)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid file type. Only PDF, DOC, DOCX, TXT, JPG, PNG are allowed."));
        }

        try {
            java.nio.file.Path uploadDirPath = java.nio.file.Paths.get("uploads/chat").toAbsolutePath().normalize();
            if (!java.nio.file.Files.exists(uploadDirPath)) {
                java.nio.file.Files.createDirectories(uploadDirPath);
            }

            String ext = "";
            if (originalFilename != null && originalFilename.lastIndexOf(".") > 0) {
                ext = originalFilename.substring(originalFilename.lastIndexOf("."));
            }
            
            String fileName = "chat_" + System.currentTimeMillis() + "_" + java.util.UUID.randomUUID().toString().substring(0,8) + ext;
            java.nio.file.Path filePath = uploadDirPath.resolve(fileName);
            file.transferTo(filePath.toFile());

            String fileUrl = "http://localhost:8080/uploads/chat/" + fileName;

            
            return ResponseEntity.ok(Map.of(
                "fileUrl", fileUrl,
                "fileName", originalFilename != null ? originalFilename : fileName,
                "message", "File uploaded successfully"
            ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("message", "Failed to upload file: " + e.getMessage()));
        }
    }
}
