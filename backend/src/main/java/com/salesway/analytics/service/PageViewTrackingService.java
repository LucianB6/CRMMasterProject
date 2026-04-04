package com.salesway.analytics.service;

import com.salesway.analytics.dto.PageViewTrackRequest;
import com.salesway.analytics.dto.PageViewTrackResponse;
import com.salesway.analytics.entity.PageViewEvent;
import com.salesway.analytics.repository.PageViewEventRepository;
import com.salesway.manager.service.CompanyAccessService;
import com.salesway.memberships.entity.CompanyMembership;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PageViewTrackingService {
    private final CompanyAccessService companyAccessService;
    private final PageViewEventRepository pageViewEventRepository;

    public PageViewTrackingService(
            CompanyAccessService companyAccessService,
            PageViewEventRepository pageViewEventRepository
    ) {
        this.companyAccessService = companyAccessService;
        this.pageViewEventRepository = pageViewEventRepository;
    }

    @Transactional
    public PageViewTrackResponse track(PageViewTrackRequest request) {
        CompanyMembership membership = companyAccessService.getActiveMembership();

        PageViewEvent event = new PageViewEvent();
        event.setCompany(membership.getCompany());
        event.setUser(membership.getUser());
        event.setPath(request.getPath().trim());
        event.setRouteName(hasText(request.getRouteName()) ? request.getRouteName().trim() : null);
        event.setSource(hasText(request.getSource()) ? request.getSource().trim() : "web");
        event.setDurationSeconds(request.getDurationSeconds());
        pageViewEventRepository.save(event);

        return new PageViewTrackResponse("recorded");
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
