package com.smartlegal.backend.controller;

import com.smartlegal.backend.entity.OtpToken;
import com.smartlegal.backend.entity.User;
import com.smartlegal.backend.repository.OtpTokenRepository;
import com.smartlegal.backend.repository.UserRepository;
import com.smartlegal.backend.service.EmailService;
import com.smartlegal.backend.service.AuditLogService;
import com.smartlegal.backend.service.NotificationService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Random;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor

public class ForgotPasswordController {

    private final UserRepository userRepository;
    private final OtpTokenRepository otpTokenRepository;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogService auditLogService;
    private final NotificationService notificationService;

    @PostMapping("/forgot-password")
    @Transactional
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> payload, HttpServletRequest request) {
        String email = payload.get("email");
        if (email == null || email.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email is required"));
        }

        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email not found."));
        }

        User user = userOpt.get();

        // Invalidate old OTPs
        List<OtpToken> oldTokens = otpTokenRepository.findByUserEmailAndOtpTypeAndIsUsedFalse(email, "PASSWORD_RESET");
        for (OtpToken oldToken : oldTokens) {
            oldToken.setUsed(true);
            otpTokenRepository.save(oldToken);
        }

        // Generate 6 digit OTP
        String otpCode = String.format("%06d", new Random().nextInt(999999));
        
        // Expiry 5 minutes
        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(5);

        OtpToken otpToken = OtpToken.builder()
                .user(user)
                .otpCode(otpCode)
                .otpType("PASSWORD_RESET")
                .isUsed(false)
                .expiresAt(expiresAt)
                .build();

        otpTokenRepository.save(otpToken);

        try {
            // Send Email
            emailService.sendSimpleMessage(
                    user.getEmail(),
                    "Smart Legal Assistance System - Password Reset OTP",
                    "Hello,\n\n" +
                    "Your OTP is:\n\n" +
                    otpCode + "\n\n" +
                    "Valid for 5 minutes.\n\n" +
                    "If you didn't request this, ignore this email.\n\n" +
                    "Regards,\nSmart Legal Assistance Team"
            );
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", e.getMessage() != null ? e.getMessage() : "Unable to send OTP. Please try again later."));
        }

        auditLogService.logActivity(user, "REQUEST_PASSWORD_RESET", "OTP requested for password reset", request);

        // We can just save it. Since user is not logged in, they will see it next time they log in.
        notificationService.createAndSendNotification(
                user,
                "OTP Sent",
                "An OTP for password reset was sent to your email.",
                "SYSTEM",
                "/login"
        );

        return ResponseEntity.ok(Map.of("message", "OTP Sent Successfully"));
    }

    @PostMapping("/resend-otp")
    @Transactional
    public ResponseEntity<?> resendOtp(@RequestBody Map<String, String> payload, HttpServletRequest request) {
        String email = payload.get("email");
        if (email == null || email.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email is required"));
        }

        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email not found."));
        }

        User user = userOpt.get();

        // Check cooldown (30 seconds)
        Optional<OtpToken> lastTokenOpt = otpTokenRepository.findTopByUserEmailAndOtpTypeOrderByIdDesc(email, "PASSWORD_RESET");
        if (lastTokenOpt.isPresent() && lastTokenOpt.get().getCreatedAt() != null) {
            long secondsPassed = ChronoUnit.SECONDS.between(lastTokenOpt.get().getCreatedAt(), LocalDateTime.now());
            if (secondsPassed < 30) {
                return ResponseEntity.badRequest().body(Map.of("message", "Please wait " + (30 - secondsPassed) + " seconds before requesting a new OTP."));
            }
        }

        // Invalidate old OTPs
        List<OtpToken> oldTokens = otpTokenRepository.findByUserEmailAndOtpTypeAndIsUsedFalse(email, "PASSWORD_RESET");
        for (OtpToken oldToken : oldTokens) {
            oldToken.setUsed(true);
            otpTokenRepository.save(oldToken);
        }

        // Generate 6 digit OTP
        String otpCode = String.format("%06d", new Random().nextInt(999999));
        
        // Expiry 5 minutes
        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(5);

        OtpToken otpToken = OtpToken.builder()
                .user(user)
                .otpCode(otpCode)
                .otpType("PASSWORD_RESET")
                .isUsed(false)
                .expiresAt(expiresAt)
                .build();

        otpTokenRepository.save(otpToken);

        try {
            // Send Email
            emailService.sendSimpleMessage(
                    user.getEmail(),
                    "Smart Legal Assistance System - Password Reset OTP",
                    "Hello,\n\n" +
                    "Your OTP is:\n\n" +
                    otpCode + "\n\n" +
                    "Valid for 5 minutes.\n\n" +
                    "If you didn't request this, ignore this email.\n\n" +
                    "Regards,\nSmart Legal Assistance Team"
            );
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", e.getMessage() != null ? e.getMessage() : "Unable to send OTP. Please try again later."));
        }

        auditLogService.logActivity(user, "RESEND_PASSWORD_RESET", "OTP resent for password reset", request);

        notificationService.createAndSendNotification(
                user,
                "OTP Resent",
                "A new OTP for password reset was sent to your email.",
                "SYSTEM",
                "/login"
        );

        return ResponseEntity.ok(Map.of("message", "OTP Sent Successfully"));
    }

    @PostMapping("/verify-otp")
    @Transactional
    public ResponseEntity<?> verifyOtp(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String otp = payload.get("otp");

        if (email == null || otp == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email and OTP are required"));
        }

        Optional<OtpToken> tokenOpt = otpTokenRepository
                .findByUserEmailAndOtpCodeAndOtpTypeAndIsUsedFalse(email, otp, "PASSWORD_RESET");

        if (tokenOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid or expired OTP code"));
        }

        OtpToken token = tokenOpt.get();
        if (token.getExpiresAt().isBefore(LocalDateTime.now())) {
            return ResponseEntity.badRequest().body(Map.of("message", "OTP code has expired"));
        }

        return ResponseEntity.ok(Map.of("message", "OTP verified successfully. You can now reset your password."));
    }

    @PostMapping("/reset-password")
    @Transactional
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> payload, HttpServletRequest request) {
        String email = payload.get("email");
        String otp = payload.get("otp");
        String newPassword = payload.get("newPassword");

        if (email == null || otp == null || newPassword == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email, OTP and new password are required"));
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Optional<OtpToken> tokenOpt = otpTokenRepository
                .findByUserEmailAndOtpCodeAndOtpTypeAndIsUsedFalse(email, otp, "PASSWORD_RESET");

        if (tokenOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid or expired OTP code"));
        }

        OtpToken token = tokenOpt.get();
        if (token.getExpiresAt().isBefore(LocalDateTime.now())) {
            return ResponseEntity.badRequest().body(Map.of("message", "OTP code has expired"));
        }
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        // Mark OTP as used
        token.setUsed(true);
        otpTokenRepository.save(token);

        auditLogService.logActivity(user, "RESET_PASSWORD_SUCCESS", "Password reset successfully via email OTP verification", request);

        notificationService.createAndSendNotification(
                user,
                "Password Reset Successful",
                "Your password has been reset successfully. If this wasn't you, please contact support immediately.",
                "SYSTEM",
                "/login"
        );

        return ResponseEntity.ok(Map.of("message", "Password has been reset successfully."));
    }
}
