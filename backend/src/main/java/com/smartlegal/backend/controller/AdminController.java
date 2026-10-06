package com.smartlegal.backend.controller;

import com.smartlegal.backend.entity.*;
import com.smartlegal.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Transactional
public class AdminController {

    private final UserRepository userRepository;
    private final LawyerProfileRepository lawyerProfileRepository;
    private final AppointmentRepository appointmentRepository;
    private final PaymentRepository paymentRepository;
    private final DocumentRepository documentRepository;
    private final AuditLogRepository auditLogRepository;
    private final ReviewRepository reviewRepository;

    // ── Dashboard Stats ──────────────────────────────────────────
    @GetMapping("/dashboard/stats")
    public ResponseEntity<Map<String, Object>> getDashboardStats() {
        Map<String, Object> stats = new HashMap<>();

        long totalUsers = userRepository.count();
        long totalLawyers = lawyerProfileRepository.count();
        long totalAppointments = appointmentRepository.count();
        long totalDocuments = documentRepository.count();

        // Sum all successful payments
        List<Payment> allPayments = paymentRepository.findAll();
        BigDecimal totalRevenue = allPayments.stream()
                .filter(p -> "SUCCESS".equalsIgnoreCase(p.getPaymentStatus()))
                .map(Payment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long completedAppointments = appointmentRepository.findAll().stream()
                .filter(a -> "COMPLETED".equalsIgnoreCase(a.getStatus())).count();
        long pendingAppointments = appointmentRepository.findAll().stream()
                .filter(a -> "PENDING".equalsIgnoreCase(a.getStatus())).count();


        long pendingLawyerApprovals = lawyerProfileRepository.findAll().stream()
                .filter(l -> "PENDING".equalsIgnoreCase(l.getVerificationStatus())).count();
        long approvedLawyers = lawyerProfileRepository.findAll().stream()
                .filter(l -> "APPROVED".equalsIgnoreCase(l.getVerificationStatus())).count();
        long rejectedLawyers = lawyerProfileRepository.findAll().stream()
                .filter(l -> "REJECTED".equalsIgnoreCase(l.getVerificationStatus())).count();
        long suspendedLawyers = lawyerProfileRepository.findAll().stream()
                .filter(l -> "SUSPENDED".equalsIgnoreCase(l.getVerificationStatus())).count();

        stats.put("totalUsers", totalUsers);
        stats.put("totalLawyers", totalLawyers);
        stats.put("totalAppointments", totalAppointments);
        stats.put("totalDocuments", totalDocuments);
        stats.put("totalRevenue", totalRevenue);
        stats.put("completedAppointments", completedAppointments);
        stats.put("pendingAppointments", pendingAppointments);
        stats.put("pendingLawyerApprovals", pendingLawyerApprovals);
        stats.put("approvedLawyers", approvedLawyers);
        stats.put("rejectedLawyers", rejectedLawyers);
        stats.put("suspendedLawyers", suspendedLawyers);
        stats.put("totalPayments", allPayments.size());

        return ResponseEntity.ok(stats);
    }

    @GetMapping("/dashboard/revenue-growth")
    public ResponseEntity<List<Map<String, Object>>> getRevenueGrowth() {
        java.time.LocalDateTime oneYearAgo = java.time.LocalDateTime.now().minusMonths(11).withDayOfMonth(1).withHour(0).withMinute(0);
        List<Payment> payments = paymentRepository.findAll().stream()
                .filter(p -> "SUCCESS".equalsIgnoreCase(p.getPaymentStatus()))
                .filter(p -> p.getCreatedAt() != null && p.getCreatedAt().isAfter(oneYearAgo))
                .collect(Collectors.toList());

        java.time.format.DateTimeFormatter formatter = java.time.format.DateTimeFormatter.ofPattern("MMM");
        
        List<Map<String, Object>> result = new java.util.ArrayList<>();
        for (int i = 11; i >= 0; i--) {
            java.time.LocalDateTime monthDate = java.time.LocalDateTime.now().minusMonths(i);
            String monthName = monthDate.format(formatter);
            int year = monthDate.getYear();
            int month = monthDate.getMonthValue();
            
            BigDecimal revenue = payments.stream()
                .filter(p -> p.getCreatedAt().getYear() == year && p.getCreatedAt().getMonthValue() == month)
                .map(Payment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
                
            Map<String, Object> map = new HashMap<>();
            map.put("name", monthName);
            map.put("revenue", revenue);
            result.add(map);
        }
        return ResponseEntity.ok(result);
    }

    @GetMapping("/dashboard/user-growth")
    public ResponseEntity<List<Map<String, Object>>> getUserGrowth() {
        java.time.LocalDateTime oneYearAgo = java.time.LocalDateTime.now().minusMonths(11).withDayOfMonth(1).withHour(0).withMinute(0);
        List<User> users = userRepository.findAll().stream()
                .filter(u -> u.getCreatedAt() != null && u.getCreatedAt().isAfter(oneYearAgo) && u.getRole() != null && "ROLE_USER".equals(u.getRole().getName().name()))
                .collect(Collectors.toList());
        List<LawyerProfile> lawyers = lawyerProfileRepository.findAll().stream()
                .filter(l -> l.getCreatedAt() != null && l.getCreatedAt().isAfter(oneYearAgo))
                .collect(Collectors.toList());

        java.time.format.DateTimeFormatter formatter = java.time.format.DateTimeFormatter.ofPattern("MMM");
        
        List<Map<String, Object>> result = new java.util.ArrayList<>();
        for (int i = 11; i >= 0; i--) {
            java.time.LocalDateTime monthDate = java.time.LocalDateTime.now().minusMonths(i);
            String monthName = monthDate.format(formatter);
            int year = monthDate.getYear();
            int month = monthDate.getMonthValue();
            
            long userCount = users.stream()
                .filter(u -> u.getCreatedAt().getYear() == year && u.getCreatedAt().getMonthValue() == month)
                .count();
                
            long lawyerCount = lawyers.stream()
                .filter(l -> l.getCreatedAt().getYear() == year && l.getCreatedAt().getMonthValue() == month)
                .count();
                
            Map<String, Object> map = new HashMap<>();
            map.put("name", monthName);
            map.put("users", userCount);
            map.put("lawyers", lawyerCount);
            result.add(map);
        }
        return ResponseEntity.ok(result);
    }

    // ── User Management ──────────────────────────────────────────
    @GetMapping("/users")
    public ResponseEntity<List<Map<String, Object>>> getAllUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        List<User> users = userRepository.findAll(
                PageRequest.of(page, size, Sort.by("createdAt").descending())
        ).getContent();

        List<Map<String, Object>> result = users.stream().map(u -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", u.getId());
            map.put("email", u.getEmail());
            map.put("firstName", u.getFirstName());
            map.put("lastName", u.getLastName());
            map.put("phone", u.getPhone());
            map.put("role", u.getRole() != null ? u.getRole().getName() : null);
            map.put("isActive", u.getIsActive());
            map.put("isEmailVerified", u.getIsEmailVerified());
            map.put("createdAt", u.getCreatedAt());
            return map;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    @PutMapping("/users/{id}/toggle-active")
    public ResponseEntity<Map<String, Object>> toggleUserActive(@PathVariable Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setIsActive(!Boolean.TRUE.equals(user.getIsActive()));
        userRepository.save(user);
        return ResponseEntity.ok(Map.of(
                "message", "User status updated",
                "isActive", user.getIsActive()
        ));
    }

    // ── Lawyer Management ─────────────────────────────────────────
    @GetMapping("/lawyers")
    public ResponseEntity<List<Map<String, Object>>> getAllLawyers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        List<LawyerProfile> lawyers = lawyerProfileRepository.findAllWithUser(
                PageRequest.of(page, size, Sort.by("createdAt").descending())
        ).getContent();
        
        List<Map<String, Object>> result = lawyers.stream().map(this::mapLawyerProfileToDto).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @GetMapping("/lawyers/all")
    public ResponseEntity<List<Map<String, Object>>> getLawyersAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return getAllLawyers(page, size);
    }

    @GetMapping("/lawyers/pending")
    public ResponseEntity<List<Map<String, Object>>> getPendingLawyers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        List<LawyerProfile> lawyers = lawyerProfileRepository.findAllWithUser(
                PageRequest.of(page, size, Sort.by("createdAt").descending())
        ).getContent().stream()
         .filter(l -> "PENDING".equalsIgnoreCase(l.getVerificationStatus()))
         .collect(Collectors.toList());

        List<Map<String, Object>> result = lawyers.stream().map(this::mapLawyerProfileToDto).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @GetMapping("/lawyers/{id}")
    public ResponseEntity<Map<String, Object>> getLawyerById(@PathVariable Long id) {
        LawyerProfile profile = lawyerProfileRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Lawyer profile not found"));
        return ResponseEntity.ok(mapLawyerProfileToDto(profile));
    }

    private Map<String, Object> mapLawyerProfileToDto(LawyerProfile lp) {
        Map<String, Object> map = new LinkedHashMap<>();
        if (lp == null) return map;
        
        map.put("id", lp.getId());
        
        try {
            if (lp.getUser() != null) {
                map.put("name", lp.getUser().getFullName());
                map.put("email", lp.getUser().getEmail());
                map.put("phone", lp.getUser().getPhone());
                map.put("profileImageUrl", lp.getUser().getProfileImageUrl());
            } else {
                map.put("name", "Unknown");
                map.put("email", "Unknown");
                map.put("phone", "Unknown");
                map.put("profileImageUrl", null);
            }
        } catch (Exception e) {
            map.put("name", "Error Loading Name");
            map.put("email", "");
            map.put("phone", "");
            map.put("profileImageUrl", null);
        }

        map.put("city", lp.getCity());
        map.put("state", lp.getState());
        
        try {
            map.put("specialization", lp.getSpecializationCategory() != null ? lp.getSpecializationCategory().getName() : "");
        } catch (Exception e) {
            map.put("specialization", "");
        }
        
        map.put("experienceYears", lp.getExperienceYears());
        map.put("consultationFee", lp.getConsultationFee());
        map.put("isApproved", lp.getIsApproved());
        map.put("verificationStatus", lp.getVerificationStatus());
        map.put("barCouncilNumber", lp.getBarCouncilNumber());
        map.put("advocateCertificateUrl", lp.getAdvocateCertificateUrl());
        map.put("averageRating", lp.getAverageRating());
        map.put("profileCompletion", lp.getProfileCompletion());
        map.put("createdAt", lp.getCreatedAt());
        map.put("adminRemarks", lp.getAdminRemarks());
        return map;
    }

    @PutMapping("/lawyers/{id}/approve")
    public ResponseEntity<Map<String, Object>> approveLawyer(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body) {
        return updateLawyerStatus(id, "APPROVED", body, true);
    }

    @PutMapping("/lawyers/{id}/reject")
    public ResponseEntity<Map<String, Object>> rejectLawyer(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body) {
        return updateLawyerStatus(id, "REJECTED", body, false);
    }

    @PutMapping("/lawyers/{id}/suspend")
    public ResponseEntity<Map<String, Object>> suspendLawyer(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body) {
        return updateLawyerStatus(id, "SUSPENDED", body, false);
    }

    private ResponseEntity<Map<String, Object>> updateLawyerStatus(Long id, String status, Map<String, String> body, boolean isApproved) {
        LawyerProfile profile = lawyerProfileRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Lawyer profile not found"));
        
        String remarks = body != null ? body.get("remarks") : null;
        String adminEmail = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();

        profile.setIsApproved(isApproved);
        profile.setVerificationStatus(status);
        profile.setAdminRemarks(remarks);
        
        java.time.LocalDateTime now = java.time.LocalDateTime.now();
        if ("APPROVED".equals(status)) {
            profile.setApprovedBy(adminEmail);
            profile.setApprovedAt(now);
        } else if ("REJECTED".equals(status)) {
            profile.setRejectedAt(now);
        } else if ("SUSPENDED".equals(status)) {
            profile.setSuspendedAt(now);
        }

        lawyerProfileRepository.save(profile);
        
        // Log the action
        if (profile.getUser() != null) {
            AuditLog auditLog = new AuditLog();
            auditLog.setUser(profile.getUser());
            auditLog.setAction("LAWYER_" + status);
            auditLog.setDetails("Admin " + adminEmail + " " + status.toLowerCase() + " lawyer. Remarks: " + remarks);
            auditLog.setIpAddress("SYSTEM");
            auditLogRepository.save(auditLog);
        }

        return ResponseEntity.ok(Map.of(
                "message", "Lawyer verification status updated to " + status,
                "verificationStatus", status,
                "isApproved", isApproved
        ));
    }

    // ── Appointment Management ────────────────────────────────────
    @GetMapping("/appointments")
    public ResponseEntity<List<Map<String, Object>>> getAllAppointments(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        List<Appointment> appointments = appointmentRepository.findAll(
                PageRequest.of(page, size, Sort.by("appointmentDate").descending())
        ).getContent();

        List<Map<String, Object>> result = appointments.stream().map(apt -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", apt.getId());
            map.put("appointmentDate", apt.getAppointmentDate());
            map.put("status", apt.getStatus());
            map.put("meetingType", apt.getMeetingType());
            map.put("notes", apt.getNotes());
            if (apt.getUser() != null) {
                map.put("userName", apt.getUser().getFullName());
                map.put("userEmail", apt.getUser().getEmail());
            }
            if (apt.getLawyerProfile() != null && apt.getLawyerProfile().getUser() != null) {
                map.put("lawyerName", apt.getLawyerProfile().getUser().getFullName());
                map.put("lawyerEmail", apt.getLawyerProfile().getUser().getEmail());
            }
            map.put("createdAt", apt.getCreatedAt());
            return map;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    // ── Payment Management ────────────────────────────────────────
    @GetMapping("/payments")
    public ResponseEntity<List<Map<String, Object>>> getAllPayments(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        List<Payment> payments = paymentRepository.findAll(
                PageRequest.of(page, size, Sort.by("createdAt").descending())
        ).getContent();

        List<Map<String, Object>> result = payments.stream().map(pmt -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", pmt.getId());
            map.put("amount", pmt.getAmount());
            map.put("paymentStatus", pmt.getPaymentStatus());
            map.put("razorpayOrderId", pmt.getRazorpayOrderId());
            map.put("razorpayPaymentId", pmt.getRazorpayPaymentId());
            map.put("createdAt", pmt.getCreatedAt());
            if (pmt.getUser() != null) {
                map.put("userName", pmt.getUser().getFullName());
                map.put("userEmail", pmt.getUser().getEmail());
            }
            return map;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    // ── Categories ────────────────────────────────────────────────
    @GetMapping("/categories")
    public ResponseEntity<?> getCategories() {
        return ResponseEntity.ok(
                lawyerProfileRepository.findAll().stream()
                        .map(lp -> lp.getSpecializationCategory())
                        .filter(Objects::nonNull)
                        .distinct()
                        .collect(Collectors.toList())
        );
    }

    // ── Audit Logs ────────────────────────────────────────────────
    @GetMapping("/audit-logs")
    public ResponseEntity<List<AuditLog>> getAuditLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        
        List<AuditLog> logs = auditLogRepository.findAll(
                PageRequest.of(page, size, Sort.by("createdAt").descending())
        ).getContent();
        
        return ResponseEntity.ok(logs);
    }

    // ── Reviews ───────────────────────────────────────────────────
    @GetMapping("/reviews")
    public ResponseEntity<List<Map<String, Object>>> getAllReviews(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        
        List<Review> reviews = reviewRepository.findAll(
                PageRequest.of(page, size, Sort.by("createdAt").descending())
        ).getContent();
        
        List<Map<String, Object>> result = reviews.stream().map(r -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", r.getId());
            map.put("rating", r.getRating());
            map.put("reviewText", r.getReviewText());
            map.put("createdAt", r.getCreatedAt());
            map.put("lawyerId", r.getLawyerId());
            map.put("userId", r.getUserId());
            return map;
        }).collect(Collectors.toList());
        
        return ResponseEntity.ok(result);
    }

    @DeleteMapping("/reviews/{id}")
    public ResponseEntity<Map<String, String>> deleteReview(@PathVariable Long id) {
        reviewRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Review deleted successfully"));
    }

}
