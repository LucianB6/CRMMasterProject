package com.salesway.calendar.repository;

import com.salesway.calendar.entity.CalendarEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CalendarEventRepository extends JpaRepository<CalendarEvent, UUID> {
    List<CalendarEvent> findByMembershipIdAndEventDateBetweenOrderByEventDateAscStartTimeAsc(
            UUID membershipId,
            LocalDate from,
            LocalDate to
    );

    Optional<CalendarEvent> findByIdAndMembershipId(UUID id, UUID membershipId);
}
