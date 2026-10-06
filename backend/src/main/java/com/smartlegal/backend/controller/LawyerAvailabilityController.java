package com.smartlegal.backend.controller;

import com.smartlegal.backend.entity.LawyerAvailability;
import com.smartlegal.backend.entity.User;
import com.smartlegal.backend.repository.UserRepository;
import com.smartlegal.backend.service.LawyerAvailabilityService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/availability")
@RequiredArgsConstructor
public class LawyerAvailabilityController {

    private final LawyerAvailabilityService availabilityService;
    private final UserRepository userRepository;

    private User getAuthenticatedUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    }

    @GetMapping("/lawyer/{lawyerId}")
    public ResponseEntity<List<LawyerAvailability>> getAvailabilities(@PathVariable Long lawyerId) {
        return ResponseEntity.ok(availabilityService.getAvailabilities(lawyerId));
    }

    @GetMapping("/lawyer/{lawyerId}/calendar")
    public ResponseEntity<?> getMergedCalendar(
            @PathVariable Long lawyerId,
            @RequestParam String start,
            @RequestParam String end,
            @RequestParam(required = false) String role) {
        return ResponseEntity.ok(availabilityService.getMergedCalendar(lawyerId, start, end, role));
    }

    @GetMapping("/lawyer/{lawyerId}/slots")
    public ResponseEntity<List<Map<String, Object>>> getAvailableSlots(
            @PathVariable Long lawyerId,
            @RequestParam String date) {
        return ResponseEntity.ok(availabilityService.getAvailableSlots(lawyerId, date));
    }

    @PostMapping("/lawyer/{lawyerId}")
    public ResponseEntity<LawyerAvailability> addAvailability(
            @PathVariable Long lawyerId,
            @RequestBody Map<String, Object> body) {
        User user = getAuthenticatedUser();
        if (!user.getId().equals(lawyerId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not authorized to modify this schedule");
        }
        return ResponseEntity.ok(availabilityService.addAvailability(lawyerId, body));
    }

    @PutMapping("/{id}")
    public ResponseEntity<LawyerAvailability> updateAvailability(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        User user = getAuthenticatedUser();
        // The service layer will ensure they only update their own schedule.
        // Or we can check it here. For simplicity, we just pass to service.
        return ResponseEntity.ok(availabilityService.updateAvailability(id, body, user.getId()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteAvailability(@PathVariable Long id) {
        User user = getAuthenticatedUser();
        availabilityService.deleteAvailability(id, user.getId());
        return ResponseEntity.ok(Map.of("message", "Availability deleted successfully"));
    }
}

