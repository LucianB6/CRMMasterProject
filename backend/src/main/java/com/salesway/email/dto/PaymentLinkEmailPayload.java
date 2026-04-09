package com.salesway.email.dto;

public record PaymentLinkEmailPayload(
        String toEmail,
        String firstName,
        String companyName,
        String checkoutUrl
) {
}
