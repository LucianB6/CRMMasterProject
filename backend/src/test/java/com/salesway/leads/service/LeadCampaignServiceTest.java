package com.salesway.leads.service;

import com.salesway.companies.entity.Company;
import com.salesway.leads.dto.LeadCampaignCreateRequest;
import com.salesway.leads.dto.LeadCampaignUpdateRequest;
import com.salesway.leads.entity.LeadForm;
import com.salesway.leads.entity.LeadFormCampaign;
import com.salesway.leads.enums.CampaignChannel;
import com.salesway.leads.repository.LeadFormCampaignRepository;
import com.salesway.leads.repository.LeadFormRepository;
import com.salesway.manager.service.ManagerAccessService;
import com.salesway.memberships.entity.CompanyMembership;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class LeadCampaignServiceTest {

    private LeadFormRepository leadFormRepository;
    private LeadFormCampaignRepository leadFormCampaignRepository;
    private LeadCampaignService leadCampaignService;

    private UUID companyId;
    private UUID formId;
    private LeadForm form;

    @BeforeEach
    void setUp() {
        leadFormRepository = mock(LeadFormRepository.class);
        leadFormCampaignRepository = mock(LeadFormCampaignRepository.class);
        ManagerAccessService managerAccessService = mock(ManagerAccessService.class);

        companyId = UUID.randomUUID();
        formId = UUID.randomUUID();
        Company company = new Company();
        company.setId(companyId);

        CompanyMembership membership = new CompanyMembership();
        membership.setCompany(company);
        when(managerAccessService.getManagerMembership()).thenReturn(membership);

        form = new LeadForm();
        form.setId(formId);
        form.setCompany(company);
        form.setPublicSlug("lead-form-acme");
        when(leadFormRepository.findByIdAndCompanyId(formId, companyId)).thenReturn(Optional.of(form));

        leadCampaignService = new LeadCampaignService(leadFormRepository, leadFormCampaignRepository, managerAccessService);
    }

    @Test
    void createCampaign_happyPath() {
        LeadCampaignCreateRequest request = new LeadCampaignCreateRequest();
        request.setName("Meta Spring");
        request.setChannel("META");
        request.setCampaignCode("meta-spring");
        request.setUtmSource("facebook");
        request.setUtmMedium("paid_social");

        when(leadFormCampaignRepository.existsByLeadFormIdAndIsActiveTrueAndCampaignCodeIgnoreCase(formId, "meta-spring"))
                .thenReturn(false);
        when(leadFormCampaignRepository.save(any(LeadFormCampaign.class))).thenAnswer(invocation -> {
            LeadFormCampaign campaign = invocation.getArgument(0);
            campaign.setId(UUID.randomUUID());
            campaign.setCreatedAt(java.time.Instant.now());
            campaign.setUpdatedAt(java.time.Instant.now());
            return campaign;
        });

        var response = leadCampaignService.createCampaign(formId, request);

        assertThat(response.name()).isEqualTo("Meta Spring");
        assertThat(response.channel()).isEqualTo(CampaignChannel.META);
        assertThat(response.publicLink()).contains("/public/lead-form/lead-form-acme");
    }

    @Test
    void createCampaign_duplicateCode_throwsConflict() {
        LeadCampaignCreateRequest request = new LeadCampaignCreateRequest();
        request.setName("Meta Spring");
        request.setChannel("META");
        request.setCampaignCode("meta-spring");

        when(leadFormCampaignRepository.existsByLeadFormIdAndIsActiveTrueAndCampaignCodeIgnoreCase(formId, "meta-spring"))
                .thenReturn(true);

        assertThatThrownBy(() -> leadCampaignService.createCampaign(formId, request))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode()).isEqualTo(HttpStatus.CONFLICT));
    }

    @Test
    void updateCampaign_invalidChannel_rejected() {
        UUID campaignId = UUID.randomUUID();
        LeadFormCampaign campaign = new LeadFormCampaign();
        campaign.setId(campaignId);
        campaign.setLeadForm(form);
        campaign.setName("Meta Spring");
        campaign.setChannel(CampaignChannel.META);
        campaign.setCampaignCode("meta-spring");
        campaign.setIsActive(true);
        when(leadFormCampaignRepository.findByIdAndLeadFormId(campaignId, formId)).thenReturn(Optional.of(campaign));

        LeadCampaignUpdateRequest request = new LeadCampaignUpdateRequest();
        request.setChannel("INVALID");

        assertThatThrownBy(() -> leadCampaignService.updateCampaign(formId, campaignId, request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("channel invalid");
    }

    @Test
    void deleteCampaign_softDelete() {
        UUID campaignId = UUID.randomUUID();
        LeadFormCampaign campaign = new LeadFormCampaign();
        campaign.setId(campaignId);
        campaign.setLeadForm(form);
        campaign.setName("Meta Spring");
        campaign.setChannel(CampaignChannel.META);
        campaign.setCampaignCode("meta-spring");
        campaign.setIsActive(true);
        when(leadFormCampaignRepository.findByIdAndLeadFormId(campaignId, formId)).thenReturn(Optional.of(campaign));

        leadCampaignService.deleteCampaign(formId, campaignId);

        assertThat(campaign.getIsActive()).isFalse();
        verify(leadFormCampaignRepository).save(campaign);
    }
}
