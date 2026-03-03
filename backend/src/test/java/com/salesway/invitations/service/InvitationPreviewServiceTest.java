package com.salesway.invitations.service;

import com.salesway.companies.entity.Company;
import com.salesway.invitations.entity.Invitation;
import com.salesway.invitations.enums.InvitationStatus;
import com.salesway.invitations.repository.InvitationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class InvitationPreviewServiceTest {

    private InvitationRepository invitationRepository;
    private InvitationPreviewService service;

    @BeforeEach
    void setUp() {
        invitationRepository = org.mockito.Mockito.mock(InvitationRepository.class);
        service = new InvitationPreviewService(invitationRepository);
        when(invitationRepository.save(any(Invitation.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void preview_validPending_returnsData() {
        Company company = new Company();
        company.setName("Acme");

        Invitation invitation = new Invitation();
        invitation.setId(UUID.randomUUID());
        invitation.setCompany(company);
        invitation.setInvitedEmail("agent@example.com");
        invitation.setToken("token-1");
        invitation.setStatus(InvitationStatus.PENDING);
        invitation.setExpiresAt(Instant.now().plus(1, ChronoUnit.DAYS));

        when(invitationRepository.findByToken("token-1")).thenReturn(Optional.of(invitation));

        var response = service.previewByToken("token-1");

        assertThat(response.status()).isEqualTo("PENDING");
        assertThat(response.companyName()).isEqualTo("Acme");
    }

    @Test
    void preview_invalidToken_returns404() {
        when(invitationRepository.findByToken("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.previewByToken("missing"))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void preview_expiredPending_marksExpired() {
        Company company = new Company();
        company.setName("Acme");

        Invitation invitation = new Invitation();
        invitation.setId(UUID.randomUUID());
        invitation.setCompany(company);
        invitation.setInvitedEmail("agent@example.com");
        invitation.setToken("token-2");
        invitation.setStatus(InvitationStatus.PENDING);
        invitation.setExpiresAt(Instant.now().minus(1, ChronoUnit.DAYS));

        when(invitationRepository.findByToken("token-2")).thenReturn(Optional.of(invitation));

        var response = service.previewByToken("token-2");

        assertThat(response.status()).isEqualTo("EXPIRED");
        verify(invitationRepository, times(1)).save(any(Invitation.class));
    }
}
