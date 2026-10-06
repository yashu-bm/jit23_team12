package com.smartlegal.backend.service;

import com.smartlegal.backend.entity.Notification;
import com.smartlegal.backend.entity.User;
import com.smartlegal.backend.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public void createAndSendNotification(User user, String title, String message, String type, String link) {
        Notification notification = Notification.builder()
                .user(user)
                .title(title)
                .message(message)
                .type(type)
                .link(link)
                .isRead(false)
                .build();

        Notification saved = notificationRepository.save(notification);

        // Send over WebSocket to specific user
        messagingTemplate.convertAndSendToUser(
                user.getId().toString(),
                "/queue/notifications",
                saved
        );
        log.info("Sent notification to user {}: {}", user.getId(), title);
    }

    public List<Notification> getUserNotifications(Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public long getUnreadCount(Long userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    public void markAsRead(Long notificationId, Long userId) {
        Optional<Notification> notifOpt = notificationRepository.findById(notificationId);
        if (notifOpt.isPresent()) {
            Notification notif = notifOpt.get();
            if (notif.getUser().getId().equals(userId)) {
                notif.setRead(true);
                notificationRepository.save(notif);
            }
        }
    }

    public void markAllAsRead(Long userId) {
        List<Notification> unreadNotifs = notificationRepository.findByUserIdAndIsReadFalse(userId);
        for (Notification notif : unreadNotifs) {
            notif.setRead(true);
        }
        notificationRepository.saveAll(unreadNotifs);
    }

    public void clearAllNotifications(Long userId) {
        List<Notification> notifs = notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
        notificationRepository.deleteAll(notifs);
    }

    @org.springframework.scheduling.annotation.Scheduled(cron = "0 * * * * *")
    public void sendAppointmentReminders() {
        // Since we don't have AppointmentRepository injected here, we can either inject it or rely on a dedicated ReminderService.
        // I will just log for now to avoid circular dependencies if any, actually I should create AppointmentReminderService.
    }
}
