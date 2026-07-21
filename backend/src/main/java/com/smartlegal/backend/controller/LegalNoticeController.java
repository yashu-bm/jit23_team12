package com.smartlegal.backend.controller;

import com.smartlegal.backend.entity.LegalNotice;
import com.smartlegal.backend.entity.User;
import com.smartlegal.backend.repository.LegalNoticeRepository;
import com.smartlegal.backend.repository.UserRepository;
import com.smartlegal.backend.service.LegalNoticeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notices")
@RequiredArgsConstructor

public class LegalNoticeController {

    private final LegalNoticeService legalNoticeService;
    private final LegalNoticeRepository legalNoticeRepository;
    private final UserRepository userRepository;

    @PostMapping("/generate")
    public ResponseEntity<LegalNotice> generateNotice(@RequestBody Map<String, String> payload) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        String noticeType = payload.get("noticeType");
        String title = payload.getOrDefault("title", noticeType + " Notice");
        String content = payload.get("content");
        String recipientName = payload.get("recipientName");
        String recipientAddress = payload.get("recipientAddress");
        String senderName = payload.getOrDefault("senderName", user.getFullName());

        LegalNotice notice = legalNoticeService.saveNotice(
                user.getId(), title, noticeType, content,
                recipientName, recipientAddress, senderName
        );
        return ResponseEntity.ok(notice);
    }

    @GetMapping("/my")
    public ResponseEntity<List<LegalNotice>> getMyNotices() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return ResponseEntity.ok(legalNoticeService.getUserNotices(user.getId()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<LegalNotice> getNotice(@PathVariable Long id) {
        return ResponseEntity.ok(legalNoticeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Notice not found")));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteNotice(@PathVariable Long id) {
        legalNoticeRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Notice deleted"));
    }
}
