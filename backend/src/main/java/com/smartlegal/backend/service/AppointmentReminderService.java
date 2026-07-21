package com.smartlegal.backend.service;

import com.smartlegal.backend.entity.Appointment;
import com.smartlegal.backend.repository.AppointmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class AppointmentReminderService {

    private final AppointmentRepository appointmentRepository;
    private final NotificationService notificationService;
    private final EmailService emailService;

    @Scheduled(cron = "0 * * * * *") // Runs every minute
    @Transactional
    public void sendAppointmentReminders() {
        LocalDateTime now = LocalDateTime.now();

        // Find appointments that are CONFIRMED or PAID
        List<Appointment> upcomingAppointments = appointmentRepository.findAll().stream()
                .filter(a -> "CONFIRMED".equals(a.getStatus()) || "PAID".equals(a.getStatus()))
                .filter(a -> a.getAppointmentDate() != null && a.getAppointmentDate().isAfter(now))
                .toList();

        for (Appointment apt : upcomingAppointments) {
            long minutesUntil = java.time.Duration.between(now, apt.getAppointmentDate()).toMinutes();

            // 24 hours reminder (1440 mins)
            if (minutesUntil == 1440) {
                sendReminder(apt, "24 hours");
            }
            // 1 hour reminder (60 mins)
            else if (minutesUntil == 60) {
                sendReminder(apt, "1 hour");
            }
            // 15 minutes reminder
            else if (minutesUntil == 15) {
                sendReminder(apt, "15 minutes");
            }
        }
    }

    private void sendReminder(Appointment apt, String time) {
        String clientMsg = "Reminder: Your appointment with Adv. " + apt.getLawyerProfile().getUser().getFullName() + " is in " + time + ".";
        String lawyerMsg = "Reminder: Your appointment with " + apt.getUser().getFullName() + " is in " + time + ".";

        notificationService.createAndSendNotification(apt.getUser(), "Appointment Reminder", clientMsg, "APPOINTMENT", "/dashboard");
        notificationService.createAndSendNotification(apt.getLawyerProfile().getUser(), "Appointment Reminder", lawyerMsg, "APPOINTMENT", "/lawyer-dashboard");

        try {
            emailService.sendSimpleMessage(apt.getUser().getEmail(), "Appointment Reminder", clientMsg);
            emailService.sendSimpleMessage(apt.getLawyerProfile().getUser().getEmail(), "Appointment Reminder", lawyerMsg);
        } catch (Exception e) {
            log.warn("Failed to send reminder email: {}", e.getMessage());
        }
    }
}
