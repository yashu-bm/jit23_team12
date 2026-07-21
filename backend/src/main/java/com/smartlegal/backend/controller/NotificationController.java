package com.smartlegal.backend.controller;

import com.smartlegal.backend.entity.User;
import com.smartlegal.backend.repository.UserRepository;
import com.smartlegal.backend.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final UserRepository userRepository;

    private User getAuthenticatedUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) return null;
        String email = auth.getName();
        Optional<User> userOpt = userRepository.findByEmail(email);
        return userOpt.orElse(null);
    }

    @GetMapping
    public ResponseEntity<?> getUserNotifications() {
        User user = getAuthenticatedUser();
        if (user == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        return ResponseEntity.ok(notificationService.getUserNotifications(user.getId()));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<?> getUnreadCount() {
        User user = getAuthenticatedUser();
        if (user == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        return ResponseEntity.ok(Map.of("unreadCount", notificationService.getUnreadCount(user.getId())));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<?> markAsRead(@PathVariable Long id) {
        User user = getAuthenticatedUser();
        if (user == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        notificationService.markAsRead(id, user.getId());
        return ResponseEntity.ok(Map.of("message", "Marked as read"));
    }

    @PutMapping("/read-all")
    public ResponseEntity<?> markAllAsRead() {
        User user = getAuthenticatedUser();
        if (user == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        notificationService.markAllAsRead(user.getId());
        return ResponseEntity.ok(Map.of("message", "Marked all as read"));
    }

    @DeleteMapping("/clear")
    public ResponseEntity<?> clearAllNotifications() {
        User user = getAuthenticatedUser();
        if (user == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        notificationService.clearAllNotifications(user.getId());
        return ResponseEntity.ok(Map.of("message", "Cleared all notifications"));
    }
}
