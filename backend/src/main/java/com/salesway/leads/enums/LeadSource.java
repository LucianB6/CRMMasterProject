package com.salesway.leads.enums;

import java.util.Arrays;
import java.util.Locale;
import java.util.stream.Collectors;

public enum LeadSource {
    FORM,
    META,
    GOOGLE,
    ORGANIC,
    OTHER;

    public static String normalize(String raw) {
        if (raw == null) {
            return null;
        }
        String normalized = raw.trim().toUpperCase(Locale.ROOT);
        if (normalized.isEmpty()) {
            return null;
        }
        return Arrays.stream(values())
                .filter(value -> value.name().equals(normalized))
                .findFirst()
                .map(Enum::name)
                .orElseThrow(() -> new IllegalArgumentException("Invalid source. Allowed: " + allowedValues()));
    }

    public static String allowedValues() {
        return Arrays.stream(values())
                .map(Enum::name)
                .collect(Collectors.joining(", "));
    }
}
