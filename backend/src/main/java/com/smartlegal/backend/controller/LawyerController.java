package com.smartlegal.backend.controller;

import com.smartlegal.backend.entity.Appointment;
import com.smartlegal.backend.entity.Category;
import com.smartlegal.backend.entity.LawyerEarning;
import com.smartlegal.backend.entity.LawyerProfile;
import com.smartlegal.backend.entity.User;
import com.smartlegal.backend.repository.AppointmentRepository;
import com.smartlegal.backend.repository.CategoryRepository;
import com.smartlegal.backend.repository.LawyerEarningRepository;
import com.smartlegal.backend.repository.LawyerProfileRepository;
import com.smartlegal.backend.repository.UserRepository;
import com.smartlegal.backend.service.AuditLogService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/lawyers")
public class LawyerController {

    @Autowired
    private LawyerProfileRepository lawyerProfileRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private LawyerEarningRepository lawyerEarningRepository;

    @Autowired
    private AppointmentRepository appointmentRepository;

    @Autowired
    private AuditLogService auditLogService;

    private final String AI_RECOMMEND_URL = "http://localhost:8000/api/v1/recommend";

    @GetMapping("/search")
    public ResponseEntity<?> searchLawyers(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) BigDecimal minFee,
            @RequestParam(required = false) BigDecimal maxFee,
            @RequestParam(required = false) Integer minExperience,
            @RequestParam(required = false) Double minRating) {

        // Fetch all approved lawyers and apply filters
        List<LawyerProfile> allLawyers = lawyerProfileRepository.findAll().stream()
                .filter(p -> p.getIsApproved() != null && p.getIsApproved())
                .filter(p -> category == null || category.trim().isEmpty() || 
                        (p.getSpecializationCategory() != null && p.getSpecializationCategory().getName().equalsIgnoreCase(category)))
                .filter(p -> location == null || location.trim().isEmpty() || 
                        (p.getCity() != null && p.getCity().equalsIgnoreCase(location)) || 
                        (p.getState() != null && p.getState().equalsIgnoreCase(location)))
                .filter(p -> minFee == null || (p.getConsultationFee() != null && p.getConsultationFee().compareTo(minFee) >= 0))
                .filter(p -> maxFee == null || (p.getConsultationFee() != null && p.getConsultationFee().compareTo(maxFee) <= 0))
                .filter(p -> minExperience == null || (p.getExperienceYears() != null && p.getExperienceYears() >= minExperience))
                .filter(p -> minRating == null || (p.getAverageRating() != null && p.getAverageRating().doubleValue() >= minRating))
                .collect(Collectors.toList());

        // For advanced recommendation, we can call the AI Microservice
        if (category != null && location != null && !category.trim().isEmpty() && !location.trim().isEmpty()) {
            RestTemplate restTemplate = new RestTemplate();
            Map<String, Object> request = new HashMap<>();
            request.put("category", category);
            request.put("location", location);
            if (maxFee != null) {
                request.put("max_fee", maxFee.doubleValue());
            }

            // Provide candidates for the AI to rank
            List<Map<String, Object>> candidates = allLawyers.stream().map(lawyer -> {
                Map<String, Object> map = new HashMap<>();
                map.put("id", lawyer.getId());
                map.put("name", lawyer.getUser().getFullName());
                map.put("experienceYears", lawyer.getExperienceYears());
                map.put("consultationFee", lawyer.getConsultationFee());
                map.put("averageRating", lawyer.getAverageRating());
                map.put("bio", lawyer.getBio());
                return map;
            }).collect(Collectors.toList());
            
            request.put("candidates", candidates);

            try {
                // Call AI Service for recommendations matching
                ResponseEntity<Map> aiResponse = restTemplate.postForEntity(AI_RECOMMEND_URL, request, Map.class);
                List<Map<String, Object>> aiRecs = (List<Map<String, Object>>) aiResponse.getBody().get("recommendations");

                // Merge AI recommendations with DB records
                List<Map<String, Object>> merged = allLawyers.stream().map(lawyer -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", lawyer.getId());
                    map.put("name", lawyer.getUser().getFullName());
                    map.put("city", lawyer.getCity());
                    map.put("state", lawyer.getState());
                    map.put("experienceYears", lawyer.getExperienceYears());
                    map.put("consultationFee", lawyer.getConsultationFee());
                    map.put("averageRating", lawyer.getAverageRating());
                    map.put("totalReviews", lawyer.getTotalReviews());
                    map.put("bio", lawyer.getBio());
                    map.put("specializationCategory", lawyer.getSpecializationCategory() != null ? lawyer.getSpecializationCategory().getName() : "General");
                    
                    // Look up AI score and reason
                    Optional<Map<String, Object>> recOpt = aiRecs.stream()
                            .filter(r -> Long.valueOf(r.get("lawyer_id").toString()).equals(lawyer.getId()))
                            .findFirst();

                    if (recOpt.isPresent()) {
                        map.put("match_score", recOpt.get().get("match_score"));
                        map.put("reason", recOpt.get().get("reason"));
                    } else {
                        map.put("match_score", 0.70); // default
                        map.put("reason", "Approved lawyer in matching category.");
                    }
                    return map;
                }).collect(Collectors.toList());

                return ResponseEntity.ok(merged);
            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        // Fallback or general list when category/location is omitted
        List<Map<String, Object>> simpleList = allLawyers.stream().map(lawyer -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", lawyer.getId());
            map.put("name", lawyer.getUser().getFullName());
            map.put("city", lawyer.getCity());
            map.put("state", lawyer.getState());
            map.put("experienceYears", lawyer.getExperienceYears());
            map.put("consultationFee", lawyer.getConsultationFee());
            map.put("averageRating", lawyer.getAverageRating());
            map.put("totalReviews", lawyer.getTotalReviews());
            map.put("bio", lawyer.getBio());
            map.put("specializationCategory", lawyer.getSpecializationCategory() != null ? lawyer.getSpecializationCategory().getName() : "General");
            return map;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(simpleList);
    }

    @GetMapping("/profile")
    public ResponseEntity<?> getLawyerProfile() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        LawyerProfile profile = lawyerProfileRepository.findById(user.getId())
                .orElseThrow(() -> new RuntimeException("Lawyer profile not found"));
        return ResponseEntity.ok(profile);
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updateLawyerProfile(@RequestBody Map<String, Object> payload, HttpServletRequest request) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        LawyerProfile profile = lawyerProfileRepository.findById(user.getId())
                .orElseThrow(() -> new RuntimeException("Lawyer profile not found"));

        if (payload.containsKey("experienceYears")) {
            profile.setExperienceYears(Integer.parseInt(payload.get("experienceYears").toString()));
        }
        if (payload.containsKey("qualification")) {
            profile.setQualification((String) payload.get("qualification"));
        }
        if (payload.containsKey("city")) {
            profile.setCity((String) payload.get("city"));
        }
        if (payload.containsKey("state")) {
            profile.setState((String) payload.get("state"));
        }
        if (payload.containsKey("languages")) {
            profile.setLanguages((String) payload.get("languages"));
        }
        if (payload.containsKey("barCouncilNumber")) {
            profile.setBarCouncilNumber((String) payload.get("barCouncilNumber"));
        }
        if (payload.containsKey("consultationFee")) {
            profile.setConsultationFee(new BigDecimal(payload.get("consultationFee").toString()));
        }
        if (payload.containsKey("availabilityStatus")) {
            profile.setAvailabilityStatus((String) payload.get("availabilityStatus"));
        }
        if (payload.containsKey("bio")) {
            profile.setBio((String) payload.get("bio"));
        }
        if (payload.containsKey("specializationCategoryId")) {
            Integer catId = Integer.parseInt(payload.get("specializationCategoryId").toString());
            Category category = categoryRepository.findById(catId).orElse(null);
            profile.setSpecializationCategory(category);
        }

        // Calculate profile completion percentage
        int filledCount = 0;
        int totalFields = 8;
        if (profile.getExperienceYears() != null && profile.getExperienceYears() > 0) filledCount++;
        if (profile.getQualification() != null && !profile.getQualification().trim().isEmpty()) filledCount++;
        if (profile.getCity() != null && !profile.getCity().trim().isEmpty()) filledCount++;
        if (profile.getLanguages() != null && !profile.getLanguages().trim().isEmpty()) filledCount++;
        if (profile.getBarCouncilNumber() != null && !profile.getBarCouncilNumber().trim().isEmpty()) filledCount++;
        if (profile.getConsultationFee() != null && profile.getConsultationFee().compareTo(BigDecimal.ZERO) > 0) filledCount++;
        if (profile.getBio() != null && !profile.getBio().trim().isEmpty()) filledCount++;
        if (profile.getSpecializationCategory() != null) filledCount++;
        profile.setProfileCompletion((filledCount * 100) / totalFields);

        LawyerProfile saved = lawyerProfileRepository.save(profile);
        auditLogService.logActivity(user, "UPDATE_LAWYER_PROFILE", "Lawyer updated professional details", request);

        return ResponseEntity.ok(saved);
    }

    @GetMapping("/earnings")
    public ResponseEntity<?> getEarnings() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<LawyerEarning> earnings = lawyerEarningRepository.findByLawyerIdOrderByCreatedAtDesc(user.getId());

        BigDecimal totalAmount = earnings.stream().map(LawyerEarning::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal netAmount = earnings.stream().map(LawyerEarning::getNetAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal platformFees = earnings.stream().map(LawyerEarning::getPlatformFee).reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, Object> response = new HashMap<>();
        response.put("earnings", earnings);
        response.put("totalAmount", totalAmount);
        response.put("netAmount", netAmount);
        response.put("platformFees", platformFees);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/clients")
    public ResponseEntity<?> getClients() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Get unique clients from appointments
        List<Appointment> appointments = appointmentRepository.findByLawyerProfileIdOrderByAppointmentDateDesc(user.getId());
        List<Map<String, Object>> clients = appointments.stream()
                .map(Appointment::getUser)
                .distinct()
                .map(c -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", c.getId());
                    map.put("name", c.getFullName());
                    map.put("email", c.getEmail());
                    map.put("phone", c.getPhone());
                    map.put("profileImageUrl", c.getProfileImageUrl());
                    return map;
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(clients);
    }
}
