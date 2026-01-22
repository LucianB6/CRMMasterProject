package com.salesway.tasks.dto;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

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
        for (TaskBoardStatusRequest status : TaskBoardStatusRequest.values()) {
            if (status.value.equalsIgnoreCase(value)) {
                return status;
            }
        }
        throw new IllegalArgumentException("Unknown status: " + value);
    }

    @JsonValue
    public String getValue() {
        return value;
    }
}
