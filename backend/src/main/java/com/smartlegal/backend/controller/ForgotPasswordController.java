package com.smartlegal.backend.controller;

import com.smartlegal.backend.entity.OtpToken;
import com.smartlegal.backend.entity.User;
import com.smartlegal.backend.repository.OtpTokenRepository;
import com.smartlegal.backend.repository.UserRepository;
import com.smartlegal.backend.service.EmailService;
import com.smartlegal.backend.service.AuditLogService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.Random;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "*", maxAge = 3600)
public class ForgotPasswordController {

    private final UserRepository userRepository;
    private final OtpTokenRepository otpTokenRepository;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogService auditLogService;

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> payload, HttpServletRequest request) {
        String email = payload.get("email");
        if (email == null || email.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email is required"));
        }

        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isPresent()) {
            User user = userOpt.get();

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

            // Send Email
            emailService.sendSimpleMessage(
                    user.getEmail(),
                    "Your Password Reset OTP Code",
                    "Hello " + user.getFirstName() + ",\n\n" +
                    "You have requested to reset your password. Here is your 6-digit verification code:\n\n" +
                    otpCode + "\n\n" +
                    "This code will expire in 5 minutes. If you did not request this, please ignore this email."
            );

            auditLogService.logActivity(user, "REQUEST_PASSWORD_RESET", "OTP requested for password reset", request);
        }

        return ResponseEntity.ok(Map.of("message", "If the email is registered, you will receive an OTP code."));
    }

    @PostMapping("/verify-otp")
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
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> payload, HttpServletRequest request) {
        String email = payload.get("email");
        String otp = payload.get("otp");
        String newPassword = payload.get("newPassword");

        if (email == null || otp == null || newPassword == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email, OTP and new password are required"));
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

        User user = token.getUser();
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        // Mark OTP as used
        token.setUsed(true);
        otpTokenRepository.save(token);

        auditLogService.logActivity(user, "RESET_PASSWORD_SUCCESS", "Password reset successfully via email OTP verification", request);

        return ResponseEntity.ok(Map.of("message", "Password has been reset successfully."));
    }
}
