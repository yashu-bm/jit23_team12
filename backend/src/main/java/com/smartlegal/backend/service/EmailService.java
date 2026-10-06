package com.smartlegal.backend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender javaMailSender;

    @Value("${app.email.from}")
    private String fromEmail;

    public void sendSimpleMessage(String to, String subject, String text) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(to);
            message.setSubject(subject);
            message.setText(text);
            javaMailSender.send(message);
            log.info("Email sent successfully to {}", to);
        } catch (Exception e) {
            Throwable root = e;
            while (root.getCause() != null) {
                root = root.getCause();
            }
            
            String host = "unknown";
            int port = 0;
            String user = "unknown";
            boolean pwdPresent = false;
            int pwdLen = 0;
            String auth = "unknown";
            String starttls = "unknown";
            
            if (javaMailSender instanceof org.springframework.mail.javamail.JavaMailSenderImpl) {
                org.springframework.mail.javamail.JavaMailSenderImpl impl = (org.springframework.mail.javamail.JavaMailSenderImpl) javaMailSender;
                host = impl.getHost();
                port = impl.getPort();
                user = impl.getUsername();
                String p = impl.getPassword();
                pwdPresent = (p != null && !p.isEmpty());
                pwdLen = (p != null) ? p.length() : 0;
                
                java.util.Properties props = impl.getJavaMailProperties();
                auth = props.getProperty("mail.smtp.auth", "unknown");
                starttls = props.getProperty("mail.smtp.starttls.enable", "unknown");
            }
            
            log.error("=== SAFE SMTP DIAGNOSTIC ===");
            log.error("Exception Class: {}", e.getClass().getName());
            log.error("Root Cause Class: {}", root.getClass().getName());
            log.error("SMTP Response Message: {}", root.getMessage());
            log.error("SMTP Host: {}", host);
            log.error("SMTP Port: {}", port);
            log.error("SMTP Username: {}", user);
            log.error("Password Present: {}", pwdPresent);
            log.error("Password Length: {}", pwdLen);
            log.error("Auth Enabled: {}", auth);
            log.error("STARTTLS Enabled: {}", starttls);
            log.error("============================");
            
            throw new RuntimeException("Email delivery failed: Authentication failed", e);
        }
    }
}


