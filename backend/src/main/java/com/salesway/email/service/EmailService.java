package com.salesway.email.service;

import com.salesway.email.dto.InvitationEmailPayload;
import com.salesway.email.dto.PasswordResetEmailPayload;

public interface EmailService {
    void sendInvitationEmail(InvitationEmailPayload payload);

    void sendPasswordResetEmail(PasswordResetEmailPayload payload);
}
