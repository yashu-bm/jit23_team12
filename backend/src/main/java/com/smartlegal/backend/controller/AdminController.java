package com.smartlegal.backend.controller;

import com.smartlegal.backend.entity.*;
import com.smartlegal.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@CrossOrigin(origins = "*", maxAge = 3600)
public class AdminController {

    private final UserRepository userRepository;
    private final LawyerProfileRepository lawyerProfileRepository;
    private final AppointmentRepository appointmentRepository;
    private final PaymentRepository paymentRepository;
    private final DocumentRepository documentRepository;

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

        stats.put("totalUsers", totalUsers);
        stats.put("totalLawyers", totalLawyers);
        stats.put("totalAppointments", totalAppointments);
        stats.put("totalDocuments", totalDocuments);
        stats.put("totalRevenue", totalRevenue);
        stats.put("completedAppointments", completedAppointments);
        stats.put("pendingAppointments", pendingAppointments);
        stats.put("totalPayments", allPayments.size());

        return ResponseEntity.ok(stats);
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

        List<LawyerProfile> lawyers = lawyerProfileRepository.findAll(
                PageRequest.of(page, size, Sort.by("createdAt").descending())
        ).getContent();

        List<Map<String, Object>> result = lawyers.stream().map(lp -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", lp.getId());
            map.put("name", lp.getUser() != null ? lp.getUser().getFullName() : "");
            map.put("email", lp.getUser() != null ? lp.getUser().getEmail() : "");
            map.put("phone", lp.getUser() != null ? lp.getUser().getPhone() : "");
            map.put("city", lp.getCity());
            map.put("state", lp.getState());
            map.put("specialization", lp.getSpecializationCategory() != null ? lp.getSpecializationCategory().getName() : "");
            map.put("experienceYears", lp.getExperienceYears());
            map.put("consultationFee", lp.getConsultationFee());
            map.put("isApproved", lp.getIsApproved());
            map.put("averageRating", lp.getAverageRating());
            map.put("profileCompletion", lp.getProfileCompletion());
            map.put("createdAt", lp.getCreatedAt());
            return map;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    @PutMapping("/lawyers/{id}/approve")
    public ResponseEntity<Map<String, Object>> approveLawyer(
            @PathVariable Long id,
            @RequestBody Map<String, Boolean> body) {

        LawyerProfile profile = lawyerProfileRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Lawyer profile not found"));
        Boolean approve = body.get("approve");
        profile.setIsApproved(approve != null ? approve : true);
        lawyerProfileRepository.save(profile);
        return ResponseEntity.ok(Map.of(
                "message", "Lawyer " + (Boolean.TRUE.equals(profile.getIsApproved()) ? "approved" : "rejected"),
                "isApproved", profile.getIsApproved()
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
}
