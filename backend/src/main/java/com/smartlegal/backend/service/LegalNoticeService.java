package com.smartlegal.backend.service;

import com.smartlegal.backend.entity.LegalNotice;
import com.smartlegal.backend.entity.User;
import com.smartlegal.backend.repository.LegalNoticeRepository;
import com.smartlegal.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class LegalNoticeService {

    private final LegalNoticeRepository legalNoticeRepository;
    private final UserRepository userRepository;

    @Transactional
    public LegalNotice saveNotice(Long userId, String title, String noticeType,
                                   String content, String recipientName,
                                   String recipientAddress, String senderName) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        LegalNotice notice = LegalNotice.builder()
                .user(user)
                .title(title)
                .noticeType(noticeType)
                .content(content)
                .recipientName(recipientName)
                .recipientAddress(recipientAddress)
                .senderName(senderName)
                .status("DRAFT")
                .build();

        return legalNoticeRepository.save(notice);
    }

    public List<LegalNotice> getUserNotices(Long userId) {
        return legalNoticeRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }
}
