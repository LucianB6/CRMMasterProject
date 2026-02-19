package com.salesway.leads.enums;

import java.util.Arrays;
import java.util.Locale;
import java.util.stream.Collectors;

public enum LeadStatus {
    NEW("new"),
    CONTACTED("contacted"),
    QUALIFIED("qualified"),
    LOST("lost");

    private final String value;

    LeadStatus(String value) {
        this.value = value;
    }

    public String value() {
        return value;
    }

    public static String normalize(String raw) {
        if (raw == null) {
            return null;
        }
        String normalized = raw.trim().toLowerCase(Locale.ROOT);
        if (normalized.isEmpty()) {
            return null;
        }
        return Arrays.stream(values())
                .filter(status -> status.value.equals(normalized))
                .findFirst()
                .map(LeadStatus::value)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Invalid status. Allowed: " + allowedValues()
                ));
    }

    public static String allowedValues() {
        return Arrays.stream(values())
                .map(LeadStatus::value)
                .collect(Collectors.joining(", "));
    }
}
