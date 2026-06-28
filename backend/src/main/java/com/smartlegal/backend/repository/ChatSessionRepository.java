package com.smartlegal.backend.repository;

import com.smartlegal.backend.entity.ChatSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChatSessionRepository extends JpaRepository<ChatSession, Long> {

    List<ChatSession> findByUserIdOrLawyerIdOrderByCreatedAtDesc(Long userId, Long lawyerId);

    Optional<ChatSession> findByUserIdAndLawyerId(Long userId, Long lawyerId);
}