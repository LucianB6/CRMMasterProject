package com.salesway.leads.service;

import com.salesway.leads.dto.LeadCampaignCreateRequest;
import com.salesway.leads.dto.LeadCampaignResponse;
import com.salesway.leads.dto.LeadCampaignUpdateRequest;
import com.salesway.leads.entity.LeadForm;
import com.salesway.leads.entity.LeadFormCampaign;
import com.salesway.leads.enums.CampaignChannel;
import com.salesway.leads.repository.LeadFormCampaignRepository;
import com.salesway.leads.repository.LeadFormRepository;
import com.salesway.manager.service.ManagerAccessService;
import com.salesway.memberships.entity.CompanyMembership;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
public class LeadCampaignService {
    private static final Logger LOG = LoggerFactory.getLogger(LeadCampaignService.class);

    private final LeadFormRepository leadFormRepository;
    private final LeadFormCampaignRepository leadFormCampaignRepository;
    private final ManagerAccessService managerAccessService;

    public LeadCampaignService(
            LeadFormRepository leadFormRepository,
            LeadFormCampaignRepository leadFormCampaignRepository,
            ManagerAccessService managerAccessService
    ) {
        this.leadFormRepository = leadFormRepository;
        this.leadFormCampaignRepository = leadFormCampaignRepository;
        this.managerAccessService = managerAccessService;
    }

    @Transactional(readOnly = true)
    public List<LeadCampaignResponse> getCampaigns(UUID formId) {
        LeadForm form = getFormOrThrow(formId);
        return leadFormCampaignRepository.findByLeadFormIdAndIsActiveTrueOrderByCreatedAtDesc(form.getId())
                .stream()
                .map(campaign -> toResponse(campaign, form.getPublicSlug()))
                .toList();
    }

    @Transactional
    public LeadCampaignResponse createCampaign(UUID formId, LeadCampaignCreateRequest request) {
        LeadForm form = getFormOrThrow(formId);
        String campaignCode = normalizeRequired(request.getCampaignCode(), "campaignCode");
        if (leadFormCampaignRepository.existsByLeadFormIdAndIsActiveTrueAndCampaignCodeIgnoreCase(form.getId(), campaignCode)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "campaignCode already exists for this form");
        }

        LeadFormCampaign campaign = new LeadFormCampaign();
        campaign.setLeadForm(form);
        campaign.setName(normalizeRequired(request.getName(), "name"));
        campaign.setChannel(CampaignChannel.fromValue(request.getChannel()));
        campaign.setCampaignCode(campaignCode);
        campaign.setUtmSource(normalizeOptional(request.getUtmSource()));
        campaign.setUtmMedium(normalizeOptional(request.getUtmMedium()));
        campaign.setIsActive(true);

        LeadFormCampaign saved = leadFormCampaignRepository.save(campaign);
        LOG.info("Lead campaign created: campaignId={}, formId={}, companyId={}",
                saved.getId(), form.getId(), form.getCompany().getId());
        return toResponse(saved, form.getPublicSlug());
    }

    @Transactional
    public LeadCampaignResponse updateCampaign(UUID formId, UUID campaignId, LeadCampaignUpdateRequest request) {
        LeadForm form = getFormOrThrow(formId);
        LeadFormCampaign campaign = leadFormCampaignRepository.findByIdAndLeadFormId(campaignId, form.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Campaign not found"));

        if (request.getName() != null) {
            campaign.setName(normalizeRequired(request.getName(), "name"));
        }
        if (request.getChannel() != null) {
            campaign.setChannel(CampaignChannel.fromValue(request.getChannel()));
        }
        if (request.getCampaignCode() != null) {
            String campaignCode = normalizeRequired(request.getCampaignCode(), "campaignCode");
            if (leadFormCampaignRepository.existsByLeadFormIdAndIsActiveTrueAndCampaignCodeIgnoreCaseAndIdNot(
                    form.getId(),
                    campaignCode,
                    campaign.getId()
            )) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "campaignCode already exists for this form");
            }
            campaign.setCampaignCode(campaignCode);
        }
        if (request.getUtmSource() != null) {
            campaign.setUtmSource(normalizeOptional(request.getUtmSource()));
        }
        if (request.getUtmMedium() != null) {
            campaign.setUtmMedium(normalizeOptional(request.getUtmMedium()));
        }
        if (request.getIsActive() != null) {
            if (Boolean.TRUE.equals(request.getIsActive())
                    && leadFormCampaignRepository.existsByLeadFormIdAndIsActiveTrueAndCampaignCodeIgnoreCaseAndIdNot(
                    form.getId(),
                    campaign.getCampaignCode(),
                    campaign.getId()
            )) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "campaignCode already exists for this form");
            }
            campaign.setIsActive(request.getIsActive());
        }

        LeadFormCampaign saved = leadFormCampaignRepository.save(campaign);
        return toResponse(saved, form.getPublicSlug());
    }

    @Transactional
    public void deleteCampaign(UUID formId, UUID campaignId) {
        LeadForm form = getFormOrThrow(formId);
        LeadFormCampaign campaign = leadFormCampaignRepository.findByIdAndLeadFormId(campaignId, form.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Campaign not found"));

        campaign.setIsActive(false);
        leadFormCampaignRepository.save(campaign);
        LOG.info("Lead campaign soft-deleted: campaignId={}, formId={}, companyId={}",
                campaign.getId(), form.getId(), form.getCompany().getId());
    }

    private LeadCampaignResponse toResponse(LeadFormCampaign campaign, String publicSlug) {
        return new LeadCampaignResponse(
                campaign.getId(),
                campaign.getLeadForm().getId(),
                campaign.getName(),
                campaign.getChannel(),
                campaign.getCampaignCode(),
                campaign.getUtmSource(),
                campaign.getUtmMedium(),
                campaign.getIsActive(),
                "/public/lead-form/" + publicSlug + "?campaignCode=" + campaign.getCampaignCode(),
                campaign.getCreatedAt(),
                campaign.getUpdatedAt()
        );
    }

    private LeadForm getFormOrThrow(UUID formId) {
        CompanyMembership membership = managerAccessService.getManagerMembership();
        return leadFormRepository.findByIdAndCompanyId(formId, membership.getCompany().getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Form not found"));
    }

    private String normalizeRequired(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(field + " is required");
        }
        return value.trim();
    }

    private String normalizeOptional(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
