package com.salesway.leads.dto;

import jakarta.validation.constraints.NotEmpty;

import java.util.List;
import java.util.UUID;

public class PipelineStageReorderRequest {
    @NotEmpty
    private List<UUID> orderedStageIds;

    public List<UUID> getOrderedStageIds() {
        return orderedStageIds;
    }

    public void setOrderedStageIds(List<UUID> orderedStageIds) {
        this.orderedStageIds = orderedStageIds;
    }
}
