package com.salesway.goals.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public class GoalResponse {
    private final UUID id;
    private final String title;
    private final String metricKey;
    private final BigDecimal target;
    private final LocalDate dateFrom;
    private final LocalDate dateTo;

    public GoalResponse(
            UUID id,
            String title,
            String metricKey,
            BigDecimal target,
            LocalDate dateFrom,
            LocalDate dateTo
    ) {
        this.id = id;
        this.title = title;
        this.metricKey = metricKey;
        this.target = target;
        this.dateFrom = dateFrom;
        this.dateTo = dateTo;
    }

    public UUID getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }

    public String getMetricKey() {
        return metricKey;
    }

    public BigDecimal getTarget() {
        return target;
    }

    public LocalDate getDateFrom() {
        return dateFrom;
    }

    public LocalDate getDateTo() {
        return dateTo;
    }
}
