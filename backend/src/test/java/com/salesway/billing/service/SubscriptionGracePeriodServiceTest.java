package com.salesway.billing.service;

import com.salesway.companies.entity.Company;
import com.salesway.companies.repository.CompanyRepository;
import com.salesway.leads.repository.LeadRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class SubscriptionGracePeriodServiceTest {
    private CompanyRepository companyRepository;
    private LeadRepository leadRepository;
    private SubscriptionGracePeriodService service;

    @BeforeEach
    void setUp() {
        companyRepository = mock(CompanyRepository.class);
        leadRepository = mock(LeadRepository.class);
        service = new SubscriptionGracePeriodService(companyRepository, leadRepository);
    }

    @Test
    void deactivateExpiredGracePeriodLeadsMarksLeadsAndCompany() {
        Company company = new Company();
        company.setId(UUID.randomUUID());
        company.setSubscriptionGraceUntil(Instant.now().minusSeconds(60));
        when(companyRepository.findBySubscriptionGraceUntilBeforeAndLeadsDeactivatedAtIsNull(any(Instant.class)))
                .thenReturn(List.of(company));
        when(leadRepository.deactivateByCompanyId(company.getId())).thenReturn(3);

        service.deactivateExpiredGracePeriodLeads();

        verify(leadRepository).deactivateByCompanyId(company.getId());
        verify(companyRepository).save(company);
        assertThat(company.getLeadsDeactivatedAt()).isNotNull();
    }
}
