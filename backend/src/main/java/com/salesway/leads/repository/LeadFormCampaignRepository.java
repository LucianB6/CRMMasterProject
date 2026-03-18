package com.salesway.leads.repository;

import com.salesway.leads.entity.LeadFormCampaign;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LeadFormCampaignRepository extends JpaRepository<LeadFormCampaign, UUID> {
    List<LeadFormCampaign> findByLeadFormIdAndIsActiveTrueOrderByCreatedAtDesc(UUID leadFormId);

    Optional<LeadFormCampaign> findByIdAndLeadFormId(UUID id, UUID leadFormId);

    boolean existsByLeadFormIdAndIsActiveTrueAndCampaignCodeIgnoreCase(UUID leadFormId, String campaignCode);

    boolean existsByLeadFormIdAndIsActiveTrueAndCampaignCodeIgnoreCaseAndIdNot(
            UUID leadFormId,
            String campaignCode,
            UUID id
    );
}
