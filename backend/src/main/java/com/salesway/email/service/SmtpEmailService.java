package com.salesway.email.service;

import com.salesway.email.dto.InvitationEmailPayload;
import com.salesway.email.dto.PasswordResetEmailPayload;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class SmtpEmailService implements EmailService {
    private static final Logger LOG = LoggerFactory.getLogger(SmtpEmailService.class);

    private final JavaMailSender mailSender;
    private final boolean emailEnabled;
    private final boolean logOnly;
    private final String invitationSubject;
    private final String passwordResetSubject;

    public SmtpEmailService(
            ObjectProvider<JavaMailSender> mailSenderProvider,
            @Value("${app.email.enabled:false}") boolean emailEnabled,
            @Value("${app.email.log-only:true}") boolean logOnly,
            @Value("${app.email.invitation-subject:Invitation to join your company workspace}") String invitationSubject,
            @Value("${app.email.password-reset-subject:Reset your password}") String passwordResetSubject
    ) {
        this.mailSender = mailSenderProvider.getIfAvailable();
        this.emailEnabled = emailEnabled;
        this.logOnly = logOnly;
        this.invitationSubject = invitationSubject;
        this.passwordResetSubject = passwordResetSubject;
    }

    @Override
    public void sendInvitationEmail(InvitationEmailPayload payload) {
        String body = buildBody(payload);
        String senderEmail = payload.fromEmail();
        String effectiveFrom = StringUtils.hasText(senderEmail) ? senderEmail : null;

        if (!emailEnabled || logOnly || !StringUtils.hasText(effectiveFrom) || mailSender == null) {
            LOG.info(
                    "Invite email fallback(log-only): to={}, from={}, company={}, expiresAt={}, link={}",
                    payload.toEmail(),
                    senderEmail,
                    payload.companyName(),
                    payload.expiresAt(),
                    payload.inviteLink()
            );
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(effectiveFrom);
            if (StringUtils.hasText(senderEmail)) {
                message.setReplyTo(senderEmail);
            }
            message.setTo(payload.toEmail());
            message.setSubject(invitationSubject);
            message.setText(body);
            mailSender.send(message);
            LOG.info("Invite email sent successfully to {}", payload.toEmail());
        } catch (MailException ex) {
            LOG.error("Failed to send invite email to {}", payload.toEmail(), ex);
        }
    }

    @Override
    public void sendPasswordResetEmail(PasswordResetEmailPayload payload) {
        String body = buildPasswordResetBody(payload);

        if (!emailEnabled || logOnly || mailSender == null) {
            LOG.info(
                    "Password reset email fallback(log-only): to={}, expiresAt={}, link={}",
                    payload.toEmail(),
                    payload.expiresAt(),
                    payload.resetLink()
            );
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(payload.toEmail());
            message.setSubject(passwordResetSubject);
            message.setText(body);
            mailSender.send(message);
            LOG.info("Password reset email sent successfully to {}", payload.toEmail());
        } catch (MailException ex) {
            LOG.error("Failed to send password reset email to {}", payload.toEmail(), ex);
        }
    }

    private String buildBody(InvitationEmailPayload payload) {
        return "You were invited to join " + payload.companyName() + " as AGENT.\n"
                + "Invitation expires at: " + payload.expiresAt() + "\n"
                + "Accept invitation: " + payload.inviteLink() + "\n";
    }

    private String buildPasswordResetBody(PasswordResetEmailPayload payload) {
        return "We received a request to reset your password.\n"
                + "This link expires at: " + payload.expiresAt() + "\n"
                + "Reset password: " + payload.resetLink() + "\n"
                + "If you did not request this change, you can ignore this email.\n";
    }
}
