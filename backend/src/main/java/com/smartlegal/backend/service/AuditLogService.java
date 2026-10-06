package com.smartlegal.backend.service;

import com.smartlegal.backend.entity.AuditLog;
import com.smartlegal.backend.entity.User;
import com.smartlegal.backend.repository.AuditLogRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    @Transactional
    public void logActivity(User user, String action, String details, HttpServletRequest request) {
        String ipAddress = "0.0.0.0";
        if (request != null) {
            ipAddress = request.getHeader("X-Forwarded-For");
            if (ipAddress == null || ipAddress.isEmpty() || "unknown".equalsIgnoreCase(ipAddress)) {
                ipAddress = request.getRemoteAddr();
            }
        }
        
        AuditLog auditLog = new AuditLog(user, action, ipAddress, details);
        auditLogRepository.save(auditLog);
        log.info("AUDIT LOG: User [{}] performed action [{}] (IP: {}). Details: {}", 
                 user != null ? user.getEmail() : "ANONYMOUS", action, ipAddress, details);
    }
}
