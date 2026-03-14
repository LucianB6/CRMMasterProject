package com.salesway.leads.enums;

import java.util.Locale;

public enum CampaignChannel {
    META,
    GOOGLE,
    ORGANIC,
    OTHER,
    FORM;

    public static CampaignChannel fromValue(String rawValue) {
        if (rawValue == null || rawValue.isBlank()) {
            throw new IllegalArgumentException("channel is required");
        }
        try {
            return CampaignChannel.valueOf(rawValue.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("channel invalid; allowed: META, GOOGLE, ORGANIC, OTHER, FORM");
        }
    }
}
