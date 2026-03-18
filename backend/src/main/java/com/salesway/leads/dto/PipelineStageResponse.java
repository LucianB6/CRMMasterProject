package com.salesway.leads.dto;

import java.util.UUID;

public record PipelineStageResponse(
        UUID stageId,
        String name,
        Integer displayOrder,
        Boolean isActive
) {
}
