package com.salesway.admin.service;

import com.salesway.admin.dto.SuperAdminOverviewResponse;
import com.salesway.auth.repository.UserRepository;
import com.salesway.companies.repository.CompanyRepository;
import com.salesway.leads.repository.LeadRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SuperAdminOverviewService {
    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;
    private final LeadRepository leadRepository;
    private final SuperAdminAccessService superAdminAccessService;

    public SuperAdminOverviewService(
            CompanyRepository companyRepository,
            UserRepository userRepository,
            LeadRepository leadRepository,
            SuperAdminAccessService superAdminAccessService
    ) {
        this.companyRepository = companyRepository;
        this.userRepository = userRepository;
        this.leadRepository = leadRepository;
        this.superAdminAccessService = superAdminAccessService;
    }

    @Transactional(readOnly = true)
    public SuperAdminOverviewResponse getOverview() {
        superAdminAccessService.getSuperAdminUser();
        return new SuperAdminOverviewResponse(
                companyRepository.count(),
                companyRepository.countByIsActiveTrue(),
                userRepository.count(),
                userRepository.countByIsActiveTrue(),
                leadRepository.count()
        );
    }
}
