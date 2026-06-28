package com.smartlegal.backend.controller;

import com.smartlegal.backend.entity.Appointment;
import com.smartlegal.backend.entity.User;
import com.smartlegal.backend.repository.AppointmentRepository;
import com.smartlegal.backend.repository.UserRepository;
import com.smartlegal.backend.service.AppointmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/appointments")
@RequiredArgsConstructor
@CrossOrigin(origins = "*", maxAge = 3600)
public class AppointmentController {

    private final AppointmentService appointmentService;
    private final AppointmentRepository appointmentRepository;
    private final UserRepository userRepository;

    // Book appointment — accepts JSON body
    @PostMapping("/book")
    public ResponseEntity<?> bookAppointment(@RequestBody Map<String, Object> body) {
        Long userId = Long.valueOf(body.get("userId").toString());
        Long lawyerId = Long.valueOf(body.get("lawyerId").toString());
        LocalDateTime appointmentDate = LocalDateTime.parse(body.get("appointmentDate").toString());
        String notes = body.containsKey("notes") ? body.get("notes").toString() : null;
        String meetingType = body.containsKey("meetingType") ? body.get("meetingType").toString() : "ONLINE";
        Long paymentId = body.containsKey("paymentId") ? Long.valueOf(body.get("paymentId").toString()) : null;

        Appointment appointment = appointmentService.bookAppointment(userId, lawyerId, appointmentDate, notes, meetingType, paymentId);
        return ResponseEntity.ok(buildAppointmentMap(appointment));
    }

    // Get logged-in user's appointments
    @GetMapping("/my")
    public ResponseEntity<?> getMyAppointments() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<Appointment> appointments = appointmentRepository.findByUserIdOrderByAppointmentDateDesc(user.getId());
        return ResponseEntity.ok(appointments.stream().map(this::buildAppointmentMap).collect(Collectors.toList()));
    }

    // Get user appointments by ID (admin / lawyer usage)
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Appointment>> getUserAppointments(@PathVariable Long userId) {
        return ResponseEntity.ok(appointmentService.getUserAppointments(userId));
    }

    // Get lawyer's appointments
    @GetMapping("/lawyer/{lawyerId}")
    public ResponseEntity<?> getLawyerAppointments(@PathVariable Long lawyerId) {
        List<Appointment> appointments = appointmentService.getLawyerAppointments(lawyerId);
        return ResponseEntity.ok(appointments.stream().map(this::buildAppointmentMap).collect(Collectors.toList()));
    }

    // Update appointment status
    @PutMapping("/{appointmentId}/status")
    public ResponseEntity<?> updateStatus(
            @PathVariable Long appointmentId,
            @RequestBody Map<String, String> body) {
        String status = body.get("status");
        String reason = body.get("cancellationReason");
        Appointment updated = appointmentService.updateAppointmentStatus(appointmentId, status, reason);
        return ResponseEntity.ok(buildAppointmentMap(updated));
    }

    // Cancel appointment
    @DeleteMapping("/{appointmentId}")
    public ResponseEntity<?> cancelAppointment(
            @PathVariable Long appointmentId,
            @RequestBody(required = false) Map<String, String> body) {
        String reason = body != null ? body.get("reason") : "Cancelled by user";
        Appointment updated = appointmentService.updateAppointmentStatus(appointmentId, "CANCELLED", reason);
        return ResponseEntity.ok(Map.of("message", "Appointment cancelled", "appointment", buildAppointmentMap(updated)));
    }

    // Helper: build safe response map (avoids lazy-loading JSON errors)
    private Map<String, Object> buildAppointmentMap(Appointment apt) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", apt.getId());
        map.put("appointmentDate", apt.getAppointmentDate());
        map.put("status", apt.getStatus());
        map.put("meetingType", apt.getMeetingType());
        map.put("meetingLink", apt.getMeetingLink());
        map.put("notes", apt.getNotes());
        map.put("durationMinutes", apt.getDurationMinutes());
        map.put("cancellationReason", apt.getCancellationReason());
        map.put("createdAt", apt.getCreatedAt());

        if (apt.getLawyerProfile() != null) {
            map.put("lawyerId", apt.getLawyerProfile().getId());
            map.put("lawyerName", apt.getLawyerProfile().getUser() != null
                    ? apt.getLawyerProfile().getUser().getFullName() : "Unknown");
            map.put("lawyerEmail", apt.getLawyerProfile().getUser() != null
                    ? apt.getLawyerProfile().getUser().getEmail() : "");
        }
        if (apt.getUser() != null) {
            map.put("userId", apt.getUser().getId());
            map.put("userName", apt.getUser().getFullName());
            map.put("userEmail", apt.getUser().getEmail());
        }
        return map;
    }
}
