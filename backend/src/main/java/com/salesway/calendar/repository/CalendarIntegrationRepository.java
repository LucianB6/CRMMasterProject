package com.salesway.calendar.repository;

import com.salesway.calendar.entity.CalendarIntegration;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface CalendarIntegrationRepository extends JpaRepository<CalendarIntegration, UUID> {
}
