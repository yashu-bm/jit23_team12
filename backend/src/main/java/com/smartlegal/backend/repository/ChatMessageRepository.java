package com.smartlegal.backend.repository;

import com.smartlegal.backend.entity.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    List<ChatMessage> findBySessionIdOrderByCreatedAtAsc(Long sessionId);
    int countByReceiverIdAndIsReadFalse(Long receiverId);
    int countBySessionIdAndReceiverIdAndIsReadFalse(Long sessionId, Long receiverId);
    java.util.Optional<ChatMessage> findFirstBySessionIdOrderByCreatedAtDesc(Long sessionId);

    @Modifying
    @Transactional
    @Query("UPDATE ChatMessage m SET m.isRead = true WHERE m.session.id = :sessionId AND m.receiver.id = :receiverId")
    int markAsReadBySessionAndReceiver(@Param("sessionId") Long sessionId, @Param("receiverId") Long receiverId);
}
