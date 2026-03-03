package com.salesway.email.service;

import com.salesway.email.dto.InvitationEmailPayload;

public interface EmailService {
    void sendInvitationEmail(InvitationEmailPayload payload);
}
