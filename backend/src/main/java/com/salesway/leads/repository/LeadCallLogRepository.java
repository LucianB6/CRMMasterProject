package com.salesway.leads.repository;

import com.salesway.leads.entity.LeadCallLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface LeadCallLogRepository extends JpaRepository<LeadCallLog, UUID> {
}
