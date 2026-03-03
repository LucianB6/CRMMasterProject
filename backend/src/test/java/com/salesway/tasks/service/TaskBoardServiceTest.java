package com.salesway.tasks.service;

import com.salesway.common.enums.MembershipStatus;
import com.salesway.companies.entity.Company;
import com.salesway.leads.repository.LeadRepository;
import com.salesway.leads.service.LeadEventService;
import com.salesway.memberships.entity.CompanyMembership;
import com.salesway.memberships.repository.CompanyMembershipRepository;
import com.salesway.security.AuthenticatedUserService;
import com.salesway.security.CustomUserDetails;
import com.salesway.tasks.dto.TaskBoardRequest;
import com.salesway.tasks.dto.TaskBoardStatusRequest;
import com.salesway.tasks.entity.TaskBoardItem;
import com.salesway.tasks.repository.TaskBoardItemRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class TaskBoardServiceTest {
    private TaskBoardItemRepository taskBoardItemRepository;
    private CompanyMembershipRepository companyMembershipRepository;
    private LeadRepository leadRepository;
    private TaskBoardService taskBoardService;

    private UUID companyId;
    private UUID userId;

    @BeforeEach
    void setUp() {
        taskBoardItemRepository = mock(TaskBoardItemRepository.class);
        companyMembershipRepository = mock(CompanyMembershipRepository.class);
        leadRepository = mock(LeadRepository.class);
        LeadEventService leadEventService = mock(LeadEventService.class);
        AuthenticatedUserService authenticatedUserService = mock(AuthenticatedUserService.class);

        companyId = UUID.randomUUID();
        userId = UUID.randomUUID();

        Company company = new Company();
        company.setId(companyId);
        com.salesway.auth.entity.User user = new com.salesway.auth.entity.User();
        user.setId(userId);
        user.setEmail("user@test.com");
        user.setPasswordHash("x");

        CompanyMembership membership = new CompanyMembership();
        membership.setId(UUID.randomUUID());
        membership.setCompany(company);
        membership.setUser(user);
        membership.setStatus(MembershipStatus.ACTIVE);

        when(companyMembershipRepository.findFirstByUserIdAndStatusIn(eq(userId), any()))
                .thenReturn(Optional.of(membership));
        when(authenticatedUserService.requireCurrentUserId()).thenReturn(userId);
        when(taskBoardItemRepository.save(any(TaskBoardItem.class))).thenAnswer(invocation -> {
            TaskBoardItem item = invocation.getArgument(0);
            if (item.getId() == null) {
                item.setId(UUID.randomUUID());
            }
            return item;
        });

        taskBoardService = new TaskBoardService(
                taskBoardItemRepository,
                companyMembershipRepository,
                leadRepository,
                leadEventService,
                authenticatedUserService
        );

        CustomUserDetails customUserDetails = new CustomUserDetails(user);
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(customUserDetails, null, customUserDetails.getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @Test
    void createTask_withForeignLead_rejected() {
        UUID foreignLeadId = UUID.randomUUID();
        when(leadRepository.findByIdAndCompanyId(foreignLeadId, companyId)).thenReturn(Optional.empty());

        TaskBoardRequest request = new TaskBoardRequest();
        request.setTitle("Call lead");
        request.setStatus(TaskBoardStatusRequest.TODO);
        request.setLeadId(foreignLeadId);

        assertThatThrownBy(() -> taskBoardService.createTask(request))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("leadId does not belong to current company");
    }
}
