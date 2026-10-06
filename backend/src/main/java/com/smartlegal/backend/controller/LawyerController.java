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
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import org.springframework.web.multipart.MultipartFile;
import com.smartlegal.backend.util.ImageUtils;
import org.springframework.beans.factory.annotation.Value;
import com.smartlegal.backend.service.NotificationService;


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

    @Autowired
    private NotificationService notificationService;

    @Value("${upload.path.lawyer:uploads/profile/}")
    private String lawyerUploadPath;

    @Autowired
    private com.smartlegal.backend.service.GeminiService geminiService;
    
    @Autowired
    private com.fasterxml.jackson.databind.ObjectMapper objectMapper;

    @GetMapping("/debug")
    public ResponseEntity<?> debugLawyers() {
        System.out.println("DEBUG ENDPOINT HIT");
        try {
            List<LawyerProfile> all = lawyerProfileRepository.findAll();
            List<LawyerProfile> approved = lawyerProfileRepository.findByIsApprovedTrue();
            System.out.println("Total lawyers: " + all.size());
            System.out.println("Approved lawyers: " + approved.size());
            return ResponseEntity.ok(Map.of(
                "total", all.size(),
                "approved", approved.size()
            ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(e.getMessage());
        }
    }

    @Autowired
    private com.smartlegal.backend.service.LawyerAvailabilityService availabilityService;

    @GetMapping("/debug/slots")
    public ResponseEntity<?> debugSlots(@RequestParam Long lawyerId, @RequestParam String date) {
        try {
            List<Map<String, Object>> slots = availabilityService.getAvailableSlots(lawyerId, date);
            return ResponseEntity.ok(slots);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(e.getMessage());
        }
    }

    @GetMapping("/search")
    @Transactional(readOnly = true)
    public ResponseEntity<?> searchLawyers(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) BigDecimal minFee,
            @RequestParam(required = false) BigDecimal maxFee,
            @RequestParam(required = false) Integer minExperience,
            @RequestParam(required = false) Double minRating) {

        // Fetch all approved lawyers and apply filters
        List<LawyerProfile> allLawyers = lawyerProfileRepository.findByIsApprovedTrue().stream()
                .filter(p -> "APPROVED".equalsIgnoreCase(p.getVerificationStatus()))
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

        // For advanced recommendation, we can call Gemini directly
        if (category != null && location != null && !category.trim().isEmpty() && !location.trim().isEmpty()) {
            if (geminiService.isConfigured()) {
                try {
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

                    String prompt = "You are an AI lawyer recommender. Rank the following lawyers for a client needing help with '" + category + "' in '" + location + "'.\n" +
                                    "Return a STRICT JSON response containing an array of recommendations. Format: {\"recommendations\": [{\"lawyer_id\": 1, \"match_score\": 0.95, \"reason\": \"Excellent match...\"}]}.\n" +
                                    "Candidates:\n" + objectMapper.writeValueAsString(candidates);

                    String aiResponseJson = geminiService.generateContent(prompt, null, null, true);
                    com.fasterxml.jackson.databind.JsonNode rootNode = objectMapper.readTree(aiResponseJson);
                    com.fasterxml.jackson.databind.JsonNode recsNode = rootNode.path("recommendations");

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
                        map.put("profileImageUrl", lawyer.getProfileImageUrl());
                        map.put("specializationCategory", lawyer.getSpecializationCategory() != null ? lawyer.getSpecializationCategory().getName() : "General");
                        
                        double matchScore = 0.70;
                        String reason = "Approved lawyer in matching category.";

                        if (recsNode.isArray()) {
                            for (com.fasterxml.jackson.databind.JsonNode r : recsNode) {
                                if (r.path("lawyer_id").asLong() == lawyer.getId()) {
                                    matchScore = r.path("match_score").asDouble();
                                    reason = r.path("reason").asText();
                                    break;
                                }
                            }
                        }

                        map.put("match_score", matchScore);
                        map.put("reason", reason);
                        return map;
                    }).collect(Collectors.toList());

                    // Sort by match_score descending
                    merged.sort((a, b) -> Double.compare((Double) b.get("match_score"), (Double) a.get("match_score")));

                    return ResponseEntity.ok(merged);
                } catch (Exception e) {
                    e.printStackTrace();
                    // Fallback to default if AI fails
                }
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
            map.put("profileImageUrl", lawyer.getProfileImageUrl());
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

    @PostMapping(value = "/profile/upload-photo", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadPhoto(@RequestParam("file") MultipartFile file, HttpServletRequest request) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        LawyerProfile profile = lawyerProfileRepository.findById(user.getId())
                .orElseThrow(() -> new RuntimeException("Lawyer profile not found"));

        if (file.getSize() > 5 * 1024 * 1024) {
            return ResponseEntity.badRequest().body(Map.of("message", "Image size must be less than 5 MB."));
        }
        String contentType = file.getContentType();
        if (contentType == null || (!contentType.equals("image/jpeg") && !contentType.equals("image/png") && !contentType.equals("image/jpg"))) {
            return ResponseEntity.badRequest().body(Map.of("message", "Only JPG, JPEG, and PNG files are allowed."));
        }

        try {
            Path uploadDirPath = Paths.get(lawyerUploadPath);
            if (!Files.exists(uploadDirPath)) {
                Files.createDirectories(uploadDirPath);
            }

            byte[] processedImage = ImageUtils.processProfileImage(file);
            String fileName = "lawyer_" + user.getId() + "_" + System.currentTimeMillis() + ".jpg";
            Path filePath = Paths.get(lawyerUploadPath, fileName);
            System.out.println("Saving lawyer profile photo to absolute path: " + filePath.toAbsolutePath());
            Files.write(filePath, processedImage);

            String photoUrl = "http://localhost:8080/uploads/profile/" + fileName;
            profile.setProfileImageUrl(photoUrl);
            lawyerProfileRepository.save(profile);

            auditLogService.logActivity(user, "UPDATE_LAWYER_PHOTO", "Lawyer updated professional photo", request);

            return ResponseEntity.ok(Map.of("profileImageUrl", photoUrl, "message", "Profile photo updated successfully."));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Failed to upload photo: " + e.getMessage()));
        }
    }

    @DeleteMapping("/profile/photo")
    public ResponseEntity<?> deletePhoto(HttpServletRequest request) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        LawyerProfile profile = lawyerProfileRepository.findById(user.getId())
                .orElseThrow(() -> new RuntimeException("Lawyer profile not found"));

        if (profile.getProfileImageUrl() != null) {
            try {
                String url = profile.getProfileImageUrl();
                String fileName = url.substring(url.lastIndexOf("/") + 1);
                Path filePath = Paths.get(lawyerUploadPath + fileName);
                Files.deleteIfExists(filePath);
            } catch (Exception e) {
                // Ignore file not found
            }
            profile.setProfileImageUrl(null);
            lawyerProfileRepository.save(profile);
            auditLogService.logActivity(user, "DELETE_LAWYER_PHOTO", "Lawyer deleted professional photo", request);
        }

        return ResponseEntity.ok(Map.of("message", "Photo removed successfully."));
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
