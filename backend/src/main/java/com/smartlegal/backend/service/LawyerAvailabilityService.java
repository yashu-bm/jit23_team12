package com.smartlegal.backend.service;

import com.smartlegal.backend.entity.LawyerAvailability;
import com.smartlegal.backend.entity.LawyerProfile;
import com.smartlegal.backend.entity.Appointment;
import com.smartlegal.backend.repository.LawyerAvailabilityRepository;
import com.smartlegal.backend.repository.LawyerProfileRepository;
import com.smartlegal.backend.repository.AppointmentRepository;
import com.smartlegal.backend.dto.CalendarEventDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class LawyerAvailabilityService {

    private final LawyerAvailabilityRepository availabilityRepository;
    private final LawyerProfileRepository lawyerProfileRepository;
    private final AppointmentRepository appointmentRepository;

    public List<LawyerAvailability> getAvailabilities(Long lawyerId) {
        List<LawyerAvailability> availabilities = availabilityRepository.findByLawyerProfileId(lawyerId);
        List<Appointment> appointments = appointmentRepository.findByLawyerProfileIdOrderByAppointmentDateDesc(lawyerId);
        
        for (LawyerAvailability avail : availabilities) {
            int count = 0;
            for (Appointment apt : appointments) {
                if (apt.getAppointmentDate() == null || apt.getAppointmentDate().isBefore(LocalDateTime.now())) continue;
                if ("CANCELLED".equals(apt.getStatus()) || "REJECTED".equals(apt.getStatus())) continue;
                
                LocalDateTime start = apt.getAppointmentDate();
                
                if (avail.getDate() != null) {
                    if (start.toLocalDate().equals(avail.getDate())) {
                        if (avail.getStartTime() != null && avail.getEndTime() != null && !start.toLocalTime().isBefore(avail.getStartTime()) && start.toLocalTime().isBefore(avail.getEndTime())) {
                            count++;
                        }
                    }
                } else if (avail.getDayOfWeek() != null) {
                    if (start.getDayOfWeek().getValue() == avail.getDayOfWeek()) {
                        if (avail.getStartTime() != null && avail.getEndTime() != null && !start.toLocalTime().isBefore(avail.getStartTime()) && start.toLocalTime().isBefore(avail.getEndTime())) {
                            count++;
                        }
                    }
                }
            }
            avail.setBookedAppointmentsCount(count);
            avail.setHasBookings(count > 0);
            avail.setRemainingCapacity(Math.max(0, avail.getMaxAppointments() - count));
            avail.setStatus(avail.getIsAvailable() ? "AVAILABLE" : (avail.getReason() != null ? avail.getReason() : "UNAVAILABLE"));
        }
        return availabilities;
    }

    private boolean hasActiveBookings(LawyerAvailability avail) {
        List<Appointment> appointments = appointmentRepository.findByLawyerProfileIdOrderByAppointmentDateDesc(avail.getLawyerProfile().getId());
        for (Appointment apt : appointments) {
            if (apt.getAppointmentDate() == null || apt.getAppointmentDate().isBefore(LocalDateTime.now())) continue;
            if ("CANCELLED".equals(apt.getStatus()) || "REJECTED".equals(apt.getStatus())) continue;
            
            LocalDateTime start = apt.getAppointmentDate();
            
            if (avail.getDate() != null) {
                if (start.toLocalDate().equals(avail.getDate())) {
                    if (avail.getStartTime() != null && avail.getEndTime() != null && !start.toLocalTime().isBefore(avail.getStartTime()) && start.toLocalTime().isBefore(avail.getEndTime())) {
                        return true;
                    }
                }
            } else if (avail.getDayOfWeek() != null) {
                if (start.getDayOfWeek().getValue() == avail.getDayOfWeek()) {
                    if (avail.getStartTime() != null && avail.getEndTime() != null && !start.toLocalTime().isBefore(avail.getStartTime()) && start.toLocalTime().isBefore(avail.getEndTime())) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    public List<CalendarEventDTO> getMergedCalendar(Long lawyerId, String startDateStr, String endDateStr, String role) {
        LocalDate startDate = LocalDate.parse(startDateStr);
        LocalDate endDate = LocalDate.parse(endDateStr);
        
        List<CalendarEventDTO> events = new ArrayList<>();
        LawyerProfile profile = lawyerProfileRepository.findById(lawyerId).orElse(null);
        if (profile == null) return events;
        
        List<LawyerAvailability> exceptions = availabilityRepository.findByLawyerProfileId(lawyerId);
        List<Appointment> appointments = appointmentRepository.findByLawyerProfileIdOrderByAppointmentDateDesc(lawyerId);
        
        List<Integer> workingDays = new ArrayList<>();
        if (profile.getWorkingDays() != null && !profile.getWorkingDays().isEmpty()) {
            for (String d : profile.getWorkingDays().split(",")) {
                workingDays.add(Integer.parseInt(d.trim()));
            }
        }
        
        // 1. Generate Default Schedule and Override with Exceptions
        for (LocalDate date = startDate; !date.isAfter(endDate); date = date.plusDays(1)) {
            int dayOfWeek = date.getDayOfWeek().getValue();
            
            // Check for exceptions
            List<LawyerAvailability> dailyExceptions = new ArrayList<>();
            for (LawyerAvailability ex : exceptions) {
                // Check if this exception applies to this specific date
                if (ex.getDate() != null) {
                    LocalDate exStart = ex.getDate();
                    LocalDate exEnd = ex.getEndDate() != null ? ex.getEndDate() : exStart;
                    if (!date.isBefore(exStart) && !date.isAfter(exEnd)) {
                        dailyExceptions.add(ex);
                        continue;
                    }
                }
                // Or if it's a recurring day of week
                else if (ex.getDayOfWeek() != null && ex.getDayOfWeek() == dayOfWeek) {
                    dailyExceptions.add(ex);
                }
            }

            if (!dailyExceptions.isEmpty()) {
                boolean hasWorkingHours = false;
                for (LawyerAvailability dailyException : dailyExceptions) {
                    if (dailyException.getIsAvailable()) {
                        hasWorkingHours = true;
                    }
                    CalendarEventDTO evt = new CalendarEventDTO();
                    evt.setId("avail-" + dailyException.getId() + "-" + date.toString());
                    evt.setOriginalAvailabilityId(dailyException.getId());
                    
                    String reason = dailyException.getReason();
                    if ("CLIENT".equalsIgnoreCase(role) && !dailyException.getIsAvailable()) {
                        reason = "Lawyer unavailable";
                    }
                    
                    evt.setTitle(dailyException.getIsAvailable() ? "Available" : (reason != null ? reason : "Unavailable"));
                    evt.setType(dailyException.getIsAvailable() ? "AVAILABLE" : "UNAVAILABLE");
                    evt.setStatus(evt.getType());
                    evt.setReason(reason);
                    
                    LocalTime startT = dailyException.getStartTime() != null ? dailyException.getStartTime() : LocalTime.MIN;
                    LocalTime endT = dailyException.getEndTime() != null ? dailyException.getEndTime() : LocalTime.MAX;
                    
                    evt.setStart(date.atTime(startT).format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
                    evt.setEnd(date.atTime(endT).format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
                    
                    evt.setAllDay(startT.equals(LocalTime.MIN) && endT.equals(LocalTime.MAX));
                    evt.setDuration(dailyException.getDuration());
                    evt.setMaxAppointments(dailyException.getMaxAppointments());
                    events.add(evt);
                }
            } else {
                // Generate default from profile
                if (workingDays.contains(dayOfWeek)) {
                    CalendarEventDTO evt = new CalendarEventDTO();
                    evt.setId("default-" + date.toString());
                    evt.setTitle("Available");
                    evt.setType("AVAILABLE");
                    evt.setStatus("AVAILABLE");
                    
                    LocalTime sTime = profile.getStartWorkingTime() != null ? profile.getStartWorkingTime() : LocalTime.of(9, 0);
                    LocalTime eTime = profile.getEndWorkingTime() != null ? profile.getEndWorkingTime() : LocalTime.of(18, 0);
                    
                    evt.setStart(date.atTime(sTime).format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
                    evt.setEnd(date.atTime(eTime).format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
                    evt.setAllDay(false);
                    evt.setDuration(profile.getSlotDuration());
                    evt.setMaxAppointments(1);
                    events.add(evt);
                    
                    // Inject lunch break if configured
                    if (profile.getLunchBreakStart() != null && profile.getLunchBreakEnd() != null) {
                        CalendarEventDTO lunch = new CalendarEventDTO();
                        lunch.setId("lunch-" + date.toString());
                        lunch.setTitle("CLIENT".equalsIgnoreCase(role) ? "Lawyer unavailable" : "Lunch Break");
                        lunch.setType("UNAVAILABLE");
                        lunch.setStatus("UNAVAILABLE");
                        lunch.setReason("CLIENT".equalsIgnoreCase(role) ? "Lawyer unavailable" : "Lunch Break");
                        lunch.setStart(date.atTime(profile.getLunchBreakStart()).format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
                        lunch.setEnd(date.atTime(profile.getLunchBreakEnd()).format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
                        lunch.setAllDay(false);
                        events.add(lunch);
                    }
                }
            }
        }
        
        // 2. Overlay Appointments
        for (Appointment apt : appointments) {
            LocalDateTime start = apt.getAppointmentDate();
            if (start == null) continue;
            
            // Only include appointments that fall in range (loosely)
            if (start.toLocalDate().isBefore(startDate) || start.toLocalDate().isAfter(endDate)) {
                continue;
            }
            
            if ("CANCELLED".equals(apt.getStatus()) || "REJECTED".equals(apt.getStatus())) {
                continue;
            }
            
            LocalDateTime end = start.plusMinutes(apt.getDurationMinutes() > 0 ? apt.getDurationMinutes() : 60);
            
            String type = "BOOKED";
            if ("COMPLETED".equals(apt.getStatus())) type = "COMPLETED";
            
            CalendarEventDTO evt = new CalendarEventDTO();
            evt.setId("apt-" + apt.getId());
            evt.setTitle(apt.getUser() != null ? apt.getUser().getFirstName() + " - " + apt.getStatus() : "Appointment - " + apt.getStatus());
            evt.setType(type);
            evt.setStatus(apt.getStatus());
            evt.setStart(start.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
            evt.setEnd(end.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
            evt.setAllDay(false);
            events.add(evt);
        }
        
        return events;
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

    public LawyerAvailability updateAvailability(Long id, Map<String, Object> body, Long userId) {
        LawyerAvailability availability = availabilityRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Availability not found"));
        
        if (!availability.getLawyerProfile().getId().equals(userId)) {
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.FORBIDDEN, 
                "Not authorized to modify this schedule"
            );
        }

        if (hasActiveBookings(availability)) {
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.CONFLICT, 
                "This schedule already contains booked appointments and cannot be edited or deleted."
            );
        }
        
        mapBodyToAvailability(body, availability);
        validateAvailability(availability);
        
        return availabilityRepository.save(availability);
    }

    private void validateAvailability(LawyerAvailability availability) {
        if (availability.getDate() != null && availability.getDate().isBefore(LocalDate.now())) {
            throw new RuntimeException("Past dates cannot be modified.");
        }
        if (availability.getEndDate() != null && availability.getEndDate().isBefore(LocalDate.now())) {
            throw new RuntimeException("Past dates cannot be modified.");
        }
        if (availability.getStartTime() == null) {
            throw new RuntimeException("Start time is required");
        }
        if (availability.getEndTime() == null) {
            throw new RuntimeException("End time is required");
        }
        if (availability.getEndTime().isBefore(availability.getStartTime())) {
            throw new RuntimeException("End time must be after start time");
        }
        if (availability.getEndDate() != null && availability.getDate() != null) {
            if (availability.getEndDate().isBefore(availability.getDate())) {
                throw new RuntimeException("End date must be after start date");
            }
        }
        
        // Overlap check
        List<LawyerAvailability> existing = availabilityRepository.findByLawyerProfileId(availability.getLawyerProfile().getId());
        for (LawyerAvailability ex : existing) {
            if (ex.getId().equals(availability.getId())) continue;
            
            boolean dateOverlap = false;
            if (availability.getDate() != null && ex.getDate() != null && availability.getDate().equals(ex.getDate())) {
                dateOverlap = true;
            } else if (availability.getDayOfWeek() != null && ex.getDayOfWeek() != null && availability.getDayOfWeek().equals(ex.getDayOfWeek())) {
                dateOverlap = true;
            }
            
            if (dateOverlap) {
                // Only throw if both are working hours, or both are breaks
                if (availability.getIsAvailable() != null && ex.getIsAvailable() != null 
                    && availability.getIsAvailable().equals(ex.getIsAvailable())) {
                    if (availability.getStartTime().isBefore(ex.getEndTime()) && availability.getEndTime().isAfter(ex.getStartTime())) {
                        throw new RuntimeException("Schedule overlaps with an existing " + (availability.getIsAvailable() ? "working time" : "break") + ".");
                    }
                }
            }
        }
    }

    private void mapBodyToAvailability(Map<String, Object> body, LawyerAvailability availability) {
        if (body.containsKey("dayOfWeek") && body.get("dayOfWeek") != null && !body.get("dayOfWeek").toString().isEmpty()) {
            availability.setDayOfWeek(Integer.valueOf(body.get("dayOfWeek").toString()));
        } else {
            availability.setDayOfWeek(null);
        }
        
        if (body.containsKey("date") && body.get("date") != null && !body.get("date").toString().isEmpty()) {
            availability.setDate(LocalDate.parse(body.get("date").toString()));
        } else {
            availability.setDate(null);
        }
        
        if (body.containsKey("endDate") && body.get("endDate") != null && !body.get("endDate").toString().isEmpty()) {
            availability.setEndDate(LocalDate.parse(body.get("endDate").toString()));
        } else {
            availability.setEndDate(null);
        }
        
        boolean isFullDay = false;
        if (body.containsKey("isFullDay") && body.get("isFullDay") != null) {
            isFullDay = Boolean.parseBoolean(body.get("isFullDay").toString());
        }

        if (isFullDay) {
            availability.setStartTime(LocalTime.of(0, 0));
            availability.setEndTime(LocalTime.of(23, 59));
        } else {
            if (body.containsKey("startTime") && body.get("startTime") != null && !body.get("startTime").toString().isEmpty()) {
                availability.setStartTime(LocalTime.parse(body.get("startTime").toString()));
            } else {
                availability.setStartTime(null);
            }
            
            if (body.containsKey("endTime") && body.get("endTime") != null && !body.get("endTime").toString().isEmpty()) {
                availability.setEndTime(LocalTime.parse(body.get("endTime").toString()));
            } else {
                availability.setEndTime(null);
            }
        }
        
        if (body.containsKey("isAvailable") && body.get("isAvailable") != null) {
            availability.setIsAvailable(Boolean.valueOf(body.get("isAvailable").toString()));
        }
        
        if (body.containsKey("reason") && body.get("reason") != null) {
            availability.setReason(body.get("reason").toString());
        } else {
            availability.setReason(null);
        }

        if (body.containsKey("duration") && body.get("duration") != null && !body.get("duration").toString().isEmpty()) {
            availability.setDuration(Integer.valueOf(body.get("duration").toString()));
        } else {
            availability.setDuration(null);
        }

        if (body.containsKey("maxAppointments") && body.get("maxAppointments") != null && !body.get("maxAppointments").toString().isEmpty()) {
            availability.setMaxAppointments(Integer.valueOf(body.get("maxAppointments").toString()));
        } else {
            availability.setMaxAppointments(1); // default
        }
    }

    public void deleteAvailability(Long id, Long userId) {
        LawyerAvailability availability = availabilityRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Availability not found"));
        
        if (!availability.getLawyerProfile().getId().equals(userId)) {
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.FORBIDDEN, 
                "Not authorized to delete this schedule"
            );
        }

        if (hasActiveBookings(availability)) {
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.CONFLICT, 
                "This schedule already contains booked appointments and cannot be edited or deleted."
            );
        }
        
        if (availability.getDate() != null && availability.getDate().isBefore(LocalDate.now())) {
            throw new RuntimeException("Past dates cannot be modified.");
        }
        availabilityRepository.deleteById(id);
    }

    public List<Map<String, Object>> getAvailableSlots(Long lawyerId, String dateStr) {
        System.out.println("DEBUG: getAvailableSlots() executing...");
        List<CalendarEventDTO> events = getMergedCalendar(lawyerId, dateStr, dateStr, "CLIENT");
        
        LawyerProfile profile = lawyerProfileRepository.findById(lawyerId).orElse(null);
        int defaultDuration = (profile != null && profile.getSlotDuration() != null && profile.getSlotDuration() > 0) ? profile.getSlotDuration() : 30;
        
        List<Map<String, Object>> slots = new ArrayList<>();
        
        List<CalendarEventDTO> availableBlocks = events.stream()
                .filter(e -> "AVAILABLE".equals(e.getType()))
                .toList();
                
        for (CalendarEventDTO block : availableBlocks) {
            LocalDateTime blockStart = LocalDateTime.parse(block.getStart(), DateTimeFormatter.ISO_LOCAL_DATE_TIME);
            LocalDateTime blockEnd = LocalDateTime.parse(block.getEnd(), DateTimeFormatter.ISO_LOCAL_DATE_TIME);
            
            int duration = block.getDuration() != null ? block.getDuration() : defaultDuration;
            int maxAppointments = block.getMaxAppointments() != null ? block.getMaxAppointments() : 1;
            
            LocalDateTime current = blockStart;
            while (current.isBefore(blockEnd)) {
                LocalDateTime slotEnd = current.plusMinutes(duration);
                if (slotEnd.isAfter(blockEnd)) {
                    break;
                }
                
                final LocalDateTime c = current;
                final LocalDateTime sE = slotEnd;
                
                boolean isUnavailable = events.stream().anyMatch(e -> {
                    if (!"UNAVAILABLE".equals(e.getType())) return false;
                    LocalDateTime eStart = LocalDateTime.parse(e.getStart(), DateTimeFormatter.ISO_LOCAL_DATE_TIME);
                    LocalDateTime eEnd = LocalDateTime.parse(e.getEnd(), DateTimeFormatter.ISO_LOCAL_DATE_TIME);
                    return c.isBefore(eEnd) && sE.isAfter(eStart);
                });
                
                if (isUnavailable) {
                    current = current.plusMinutes(duration);
                    continue;
                }
                
                long currentBookings = events.stream().filter(e -> "BOOKED".equals(e.getType()) || "COMPLETED".equals(e.getType())).filter(e -> {
                    LocalDateTime eStart = LocalDateTime.parse(e.getStart(), DateTimeFormatter.ISO_LOCAL_DATE_TIME);
                    LocalDateTime eEnd = LocalDateTime.parse(e.getEnd(), DateTimeFormatter.ISO_LOCAL_DATE_TIME);
                    return c.isBefore(eEnd) && sE.isAfter(eStart);
                }).count();
                
                int remainingCapacity = maxAppointments - (int) currentBookings;
                
                Map<String, Object> slotObj = new java.util.HashMap<>();
                slotObj.put("time", c.format(DateTimeFormatter.ofPattern("HH:mm")));
                slotObj.put("endTime", sE.format(DateTimeFormatter.ofPattern("HH:mm")));
                slotObj.put("duration", duration);
                slotObj.put("maxAppointments", maxAppointments);
                slotObj.put("currentBookings", (int) currentBookings);
                slotObj.put("remainingCapacity", remainingCapacity);
                slotObj.put("status", remainingCapacity > 0 ? "AVAILABLE" : "FULLY_BOOKED");
                
                slots.add(slotObj);
                
                current = current.plusMinutes(duration);
            }
        }
        
        return slots;
    }
}
