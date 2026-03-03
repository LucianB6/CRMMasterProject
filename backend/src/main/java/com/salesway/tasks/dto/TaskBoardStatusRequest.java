package com.salesway.tasks.dto;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

import java.util.Locale;

public enum TaskBoardStatusRequest {
    TODO("todo"),
    IN_PROGRESS("in-progress"),
    DONE("done");

    private final String value;

    TaskBoardStatusRequest(String value) {
        this.value = value;
    }

    @JsonCreator
    public static TaskBoardStatusRequest fromValue(String value) {
        if (value == null) {
            throw new IllegalArgumentException("Unknown status: null");
        }
        String raw = value.trim();
        for (TaskBoardStatusRequest status : TaskBoardStatusRequest.values()) {
            if (status.value.equalsIgnoreCase(raw) || status.name().equalsIgnoreCase(raw)) {
                return status;
            }
        }
        String canonical = raw
                .toLowerCase(Locale.ROOT)
                .replace("_", "-")
                .replace(" ", "-");
        for (TaskBoardStatusRequest status : TaskBoardStatusRequest.values()) {
            if (status.value.equalsIgnoreCase(canonical)) {
                return status;
            }
        }
        if ("inprogress".equals(canonical.replace("-", ""))) {
            return IN_PROGRESS;
        }
        throw new IllegalArgumentException("Unknown status: " + value);
    }

    @JsonValue
    public String getValue() {
        return value;
    }
}
