package com.smartlegal.backend.controller;

import com.smartlegal.backend.entity.LawyerAvailability;
import com.smartlegal.backend.service.LawyerAvailabilityService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/availability")
@RequiredArgsConstructor
public class LawyerAvailabilityController {

    private final LawyerAvailabilityService availabilityService;

    @GetMapping("/lawyer/{lawyerId}")
    public ResponseEntity<List<LawyerAvailability>> getAvailabilities(@PathVariable Long lawyerId) {
        return ResponseEntity.ok(availabilityService.getAvailabilities(lawyerId));
    }

    @PostMapping("/lawyer/{lawyerId}")
    public ResponseEntity<LawyerAvailability> addAvailability(
            @PathVariable Long lawyerId,
            @RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(availabilityService.addAvailability(lawyerId, body));
    }

    @PutMapping("/{id}")
    public ResponseEntity<LawyerAvailability> updateAvailability(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(availabilityService.updateAvailability(id, body));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteAvailability(@PathVariable Long id) {
        availabilityService.deleteAvailability(id);
        return ResponseEntity.ok(Map.of("message", "Availability deleted successfully"));
    }
}
