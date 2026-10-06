package com.smartlegal.backend.controller;

import com.smartlegal.backend.entity.LawyerProfile;
import com.smartlegal.backend.entity.User;
import com.smartlegal.backend.repository.LawyerProfileRepository;
import com.smartlegal.backend.repository.UserRepository;
import com.smartlegal.backend.service.AuditLogService;
import com.smartlegal.backend.service.NotificationService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.transaction.annotation.Transactional;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;
import java.util.Date;

@RestController
@RequestMapping("/api/v1/lawyer")
@Slf4j
public class LawyerVerificationController {

    @Autowired
    private LawyerProfileRepository lawyerProfileRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AuditLogService auditLogService;

    @Autowired
    private NotificationService notificationService;

    @Value("${file.upload.profile.dir:uploads/profile/}")
    private String profileUploadPath;

    @PostMapping(value = "/profile/upload-certificate", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadCertificate(@RequestParam("file") MultipartFile file, HttpServletRequest request) {
        log.info("Received request to upload certificate. File size: {} bytes, Content-Type: {}", file.getSize(), file.getContentType());
        
        try {
            String email = SecurityContextHolder.getContext().getAuthentication().getName();
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found"));
            LawyerProfile profile = lawyerProfileRepository.findById(user.getId())
                    .orElseThrow(() -> new RuntimeException("Lawyer profile not found"));

            if (file.getSize() > 5 * 1024 * 1024) {
                log.warn("Upload failed: File size {} exceeds 5MB limit.", file.getSize());
                return ResponseEntity.badRequest().body(Map.of("message", "File size must be less than 5 MB."));
            }
            
            String contentType = file.getContentType();
            if (contentType == null || (!contentType.equals("application/pdf") && !contentType.equals("image/jpeg") && !contentType.equals("image/png") && !contentType.equals("image/jpg"))) {
                log.warn("Upload failed: Invalid content type {}.", contentType);
                return ResponseEntity.badRequest().body(Map.of("message", "Only PDF, JPG, JPEG, and PNG files are allowed."));
            }

            Path uploadDirPath = Paths.get(profileUploadPath, "certificates");
            if (!Files.exists(uploadDirPath)) {
                log.info("Creating directory for certificates: {}", uploadDirPath.toAbsolutePath());
                Files.createDirectories(uploadDirPath);
            }

            String originalFilename = file.getOriginalFilename();
            String extension = originalFilename != null && originalFilename.contains(".") ? originalFilename.substring(originalFilename.lastIndexOf(".")) : "";
            String fileName = "cert_" + user.getId() + "_" + System.currentTimeMillis() + extension;
            Path filePath = Paths.get(profileUploadPath, "certificates", fileName);
            
            log.info("Saving file to: {}", filePath.toAbsolutePath());
            Files.copy(file.getInputStream(), filePath);

            String certUrl = "http://localhost:8080/uploads/profile/certificates/" + fileName; // Keep same static serving path expectation
            profile.setAdvocateCertificateUrl(certUrl);
            lawyerProfileRepository.save(profile);

            auditLogService.logActivity(user, "UPLOAD_CERTIFICATE", "Lawyer uploaded advocate certificate", request);
            
            log.info("Certificate uploaded successfully for user ID: {}", user.getId());
            return ResponseEntity.ok(Map.of("advocateCertificateUrl", certUrl, "message", "Certificate uploaded successfully."));

        } catch (Exception e) {
            log.error("Exception occurred during certificate upload", e);
            return ResponseEntity.status(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Failed to upload certificate: " + e.getMessage()));
        }
    }

    @GetMapping("/profile/certificate")
    public ResponseEntity<?> getCertificate() {
        try {
            String email = SecurityContextHolder.getContext().getAuthentication().getName();
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found"));
            LawyerProfile profile = lawyerProfileRepository.findById(user.getId())
                    .orElseThrow(() -> new RuntimeException("Lawyer profile not found"));

            if (profile.getAdvocateCertificateUrl() == null) {
                return ResponseEntity.ok(Map.of("message", "No certificate found."));
            }

            return ResponseEntity.ok(Map.of(
                    "advocateCertificateUrl", profile.getAdvocateCertificateUrl(),
                    "uploadedAt", profile.getCreatedAt()
            ));
        } catch (Exception e) {
            log.error("Exception occurred fetching certificate", e);
            return ResponseEntity.status(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "An error occurred while fetching the certificate."));
        }
    }

    @PostMapping("/profile/resubmit")
    @Transactional
    public ResponseEntity<?> resubmitVerification(HttpServletRequest request) {
        log.info("Received request to resubmit verification.");
        try {
            String email = SecurityContextHolder.getContext().getAuthentication().getName();
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found"));
            LawyerProfile profile = lawyerProfileRepository.findById(user.getId())
                    .orElseThrow(() -> new RuntimeException("Lawyer profile not found"));

            if (!"REJECTED".equals(profile.getVerificationStatus())) {
                log.warn("Resubmission failed: Profile not in REJECTED state.");
                return ResponseEntity.badRequest().body(Map.of("message", "Only rejected profiles can be resubmitted."));
            }

            if (profile.getAdvocateCertificateUrl() == null || profile.getAdvocateCertificateUrl().isEmpty()) {
                log.warn("Resubmission failed: No certificate uploaded.");
                return ResponseEntity.badRequest().body(Map.of("message", "You must upload a new certificate before resubmitting."));
            }

            profile.setVerificationStatus("PENDING");
            profile.setIsApproved(false);
            profile.setRejectedAt(null);
            profile.setAdminRemarks(null);
            profile.setCreatedAt(java.time.LocalDateTime.now());

            lawyerProfileRepository.save(profile);

        auditLogService.logActivity(user, "RESUBMIT_VERIFICATION", "Lawyer resubmitted profile for verification", request);

        try {
            java.util.List<User> admins = userRepository.findAll().stream().filter(u -> u.getRole() != null && "ROLE_ADMIN".equals(u.getRole().getName())).toList();
            for (User admin : admins) {
                notificationService.createAndSendNotification(
                        admin,
                        "Lawyer Resubmission",
                        "Lawyer " + user.getFirstName() + " " + user.getLastName() + " has resubmitted their profile for verification.",
                        "VERIFICATION_RESUBMITTED",
                        "/admin"
                );
            }
        } catch (Exception e) {
            log.error("Failed to send notification for resubmission", e);
        }

            log.info("Profile resubmitted successfully for user ID: {}", user.getId());
            return ResponseEntity.ok(Map.of("message", "Profile resubmitted successfully."));

        } catch (Exception e) {
            log.error("Exception occurred during resubmission", e);
            return ResponseEntity.status(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Failed to resubmit profile: " + e.getMessage()));
        }
    }
}
