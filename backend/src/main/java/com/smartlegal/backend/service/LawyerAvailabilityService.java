package com.smartlegal.backend.service;

import com.smartlegal.backend.entity.LawyerAvailability;
import com.smartlegal.backend.entity.LawyerProfile;
import com.smartlegal.backend.repository.LawyerAvailabilityRepository;
import com.smartlegal.backend.repository.LawyerProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class LawyerAvailabilityService {

    private final LawyerAvailabilityRepository availabilityRepository;
    private final LawyerProfileRepository lawyerProfileRepository;

    public List<LawyerAvailability> getAvailabilities(Long lawyerId) {
        return availabilityRepository.findByLawyerProfileId(lawyerId);
    }

    public LawyerAvailability addAvailability(Long lawyerId, Map<String, Object> body) {
        LawyerProfile profile = lawyerProfileRepository.findById(lawyerId)
                .orElseThrow(() -> new RuntimeException("Lawyer not found"));

        LawyerAvailability availability = new LawyerAvailability();
        availability.setLawyerProfile(profile);

        mapBodyToAvailability(body, availability);
        validateAvailability(availability);

        return availabilityRepository.save(availability);
    }

    public LawyerAvailability updateAvailability(Long id, Map<String, Object> body) {
        LawyerAvailability availability = availabilityRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Availability not found"));
        
        mapBodyToAvailability(body, availability);
        validateAvailability(availability);
        
        return availabilityRepository.save(availability);
    }

    private void validateAvailability(LawyerAvailability availability) {
        if (availability.getStartTime() != null && availability.getEndTime() != null) {
            if (availability.getEndTime().isBefore(availability.getStartTime())) {
                throw new RuntimeException("End time must be after start time");
            }
        }
        if (availability.getEndDate() != null && availability.getDate() != null) {
            if (availability.getEndDate().isBefore(availability.getDate())) {
                throw new RuntimeException("End date must be after start date");
            }
        }
        
        // Simple overlap check (could be expanded)
        List<LawyerAvailability> existing = availabilityRepository.findByLawyerProfileId(availability.getLawyerProfile().getId());
        for (LawyerAvailability ex : existing) {
            if (ex.getId().equals(availability.getId())) continue;
            
            // Check dayOfWeek overlap
            if (availability.getDayOfWeek() != null && ex.getDayOfWeek() != null) {
                if (availability.getDayOfWeek().equals(ex.getDayOfWeek())) {
                    if (isTimeOverlap(availability.getStartTime(), availability.getEndTime(), ex.getStartTime(), ex.getEndTime())) {
                        throw new RuntimeException("Overlapping availability rule for this day of week");
                    }
                }
            }
            
            // Check specific date overlap
            if (availability.getDate() != null && ex.getDate() != null) {
                // If both are single days or date ranges
                LocalDate start1 = availability.getDate();
                LocalDate end1 = availability.getEndDate() != null ? availability.getEndDate() : start1;
                
                LocalDate start2 = ex.getDate();
                LocalDate end2 = ex.getEndDate() != null ? ex.getEndDate() : start2;
                
                if (isDateOverlap(start1, end1, start2, end2)) {
                    if (isTimeOverlap(availability.getStartTime(), availability.getEndTime(), ex.getStartTime(), ex.getEndTime())) {
                        throw new RuntimeException("Overlapping availability rule for this date");
                    }
                }
            }
        }
    }
    
    private boolean isDateOverlap(LocalDate s1, LocalDate e1, LocalDate s2, LocalDate e2) {
        return !s1.isAfter(e2) && !s2.isAfter(e1);
    }

    private boolean isTimeOverlap(LocalTime s1, LocalTime e1, LocalTime s2, LocalTime e2) {
        if (s1 == null || e1 == null || s2 == null || e2 == null) return true; // Full day overlaps
        return s1.isBefore(e2) && s2.isBefore(e1);
    }

    private void mapBodyToAvailability(Map<String, Object> body, LawyerAvailability availability) {
        if (body.containsKey("dayOfWeek") && body.get("dayOfWeek") != null) {
            availability.setDayOfWeek(Integer.valueOf(body.get("dayOfWeek").toString()));
        } else {
            availability.setDayOfWeek(null);
        }
        
        if (body.containsKey("date") && body.get("date") != null) {
            availability.setDate(LocalDate.parse(body.get("date").toString()));
        } else {
            availability.setDate(null);
        }
        
        if (body.containsKey("endDate") && body.get("endDate") != null) {
            availability.setEndDate(LocalDate.parse(body.get("endDate").toString()));
        } else {
            availability.setEndDate(null);
        }
        
        if (body.containsKey("startTime") && body.get("startTime") != null) {
            availability.setStartTime(LocalTime.parse(body.get("startTime").toString()));
        } else {
            availability.setStartTime(null);
        }
        
        if (body.containsKey("endTime") && body.get("endTime") != null) {
            availability.setEndTime(LocalTime.parse(body.get("endTime").toString()));
        } else {
            availability.setEndTime(null);
        }
        
        if (body.containsKey("isAvailable") && body.get("isAvailable") != null) {
            availability.setIsAvailable(Boolean.valueOf(body.get("isAvailable").toString()));
        }
        
        if (body.containsKey("reason") && body.get("reason") != null) {
            availability.setReason(body.get("reason").toString());
        } else {
            availability.setReason(null);
        }
    }

    public void deleteAvailability(Long id) {
        availabilityRepository.deleteById(id);
    }
}
