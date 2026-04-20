package com.salesway.billing.service;

import com.salesway.companies.entity.Company;
import com.salesway.companies.repository.CompanyRepository;
import com.salesway.leads.repository.LeadRepository;
import jakarta.transaction.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
public class SubscriptionGracePeriodService {
    private static final Logger log = LoggerFactory.getLogger(SubscriptionGracePeriodService.class);

    private final CompanyRepository companyRepository;
    private final LeadRepository leadRepository;

    public SubscriptionGracePeriodService(
            CompanyRepository companyRepository,
            LeadRepository leadRepository
    ) {
        this.companyRepository = companyRepository;
        this.leadRepository = leadRepository;
    }

    @Scheduled(cron = "${app.billing.subscription-grace-scan-cron:0 */15 * * * *}")
    @Transactional
    public void deactivateExpiredGracePeriodLeads() {
        Instant now = Instant.now();
        List<Company> companies = companyRepository.findBySubscriptionGraceUntilBeforeAndLeadsDeactivatedAtIsNull(now);
        for (Company company : companies) {
            int deactivatedLeads = leadRepository.deactivateByCompanyId(company.getId());
            company.setLeadsDeactivatedAt(now);
            companyRepository.save(company);
            log.info(
                    "event=subscription_grace_expired company_id={} deactivated_leads={}",
                    company.getId(),
                    deactivatedLeads
            );
        }
    }
}
