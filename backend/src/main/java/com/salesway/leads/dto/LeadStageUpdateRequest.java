package com.salesway.leads.dto;

import java.util.UUID;

public class LeadStageUpdateRequest {
    private UUID stageId;

    public UUID getStageId() {
        return stageId;
    }

    public void setStageId(UUID stageId) {
        this.stageId = stageId;
    }
}
