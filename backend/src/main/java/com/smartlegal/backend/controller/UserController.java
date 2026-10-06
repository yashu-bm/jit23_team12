package com.smartlegal.backend.controller;

import com.smartlegal.backend.entity.User;
import com.smartlegal.backend.repository.UserRepository;
import com.smartlegal.backend.service.AuditLogService;
import com.smartlegal.backend.service.NotificationService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;
import com.smartlegal.backend.util.ImageUtils;


@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor

public class UserController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogService auditLogService;
    private final NotificationService notificationService;

    @Value("${upload.path.profile:uploads/profile/}")
    private String uploadPath;

    @GetMapping("/profile")
    public ResponseEntity<?> getProfile() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return ResponseEntity.ok(user);
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(@RequestBody Map<String, String> payload, HttpServletRequest request) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (payload.containsKey("firstName")) {
            user.setFirstName(payload.get("firstName"));
        }
        if (payload.containsKey("lastName")) {
            user.setLastName(payload.get("lastName"));
        }
        if (payload.containsKey("phone")) {
            user.setPhone(payload.get("phone"));
        }

        User saved = userRepository.save(user);
        auditLogService.logActivity(saved, "UPDATE_PROFILE", "User updated profile details", request);

        notificationService.createAndSendNotification(
                saved,
                "Profile Updated",
                "Your profile details were updated successfully.",
                "SYSTEM",
                "/profile"
        );

        return ResponseEntity.ok(saved);
    }

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody Map<String, String> payload, HttpServletRequest request) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        String currentPassword = payload.get("currentPassword");
        String newPassword = payload.get("newPassword");

        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Incorrect current password"));
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        auditLogService.logActivity(user, "CHANGE_PASSWORD", "User successfully changed password", request);

        notificationService.createAndSendNotification(
                user,
                "Password Changed",
                "Your password has been changed successfully.",
                "SYSTEM",
                "/profile"
        );

        return ResponseEntity.ok(Map.of("message", "Password changed successfully"));
    }

    @PostMapping("/profile/photo")
    public ResponseEntity<?> uploadPhoto(@RequestParam("file") MultipartFile file, HttpServletRequest request) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (file.getSize() > 5 * 1024 * 1024) {
            return ResponseEntity.badRequest().body(Map.of("message", "Image size must be less than 5 MB."));
        }
        String contentType = file.getContentType();
        if (contentType == null || (!contentType.equals("image/jpeg") && !contentType.equals("image/png") && !contentType.equals("image/jpg"))) {
            return ResponseEntity.badRequest().body(Map.of("message", "Only JPG, JPEG, and PNG files are allowed."));
        }

        try {
            Path uploadDirPath = Paths.get(uploadPath);
            if (!Files.exists(uploadDirPath)) {
                Files.createDirectories(uploadDirPath);
            }

            byte[] processedImage = ImageUtils.processProfileImage(file);
            String fileName = "profile_" + user.getId() + "_" + System.currentTimeMillis() + ".jpg";
            Path filePath = Paths.get(uploadPath, fileName);
            System.out.println("Saving user profile photo to absolute path: " + filePath.toAbsolutePath());
            Files.write(filePath, processedImage);

            String photoUrl = "http://localhost:8080/uploads/profile/" + fileName;
            user.setProfileImageUrl(photoUrl);
            userRepository.save(user);

            auditLogService.logActivity(user, "UPDATE_PROFILE_PHOTO", "User updated profile photo: " + fileName, request);

            notificationService.createAndSendNotification(
                    user,
                    "Profile Photo Updated",
                    "Your profile picture has been updated.",
                    "SYSTEM",
                    "/profile"
            );

            return ResponseEntity.ok(Map.of("profileImageUrl", photoUrl, "message", "Photo uploaded successfully"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of("message", "Failed to upload photo: " + e.getMessage()));
        }
    }
}
