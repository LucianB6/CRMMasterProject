package com.salesway.leads.dto;

import jakarta.validation.Valid;

import java.util.List;
import java.util.UUID;

public class LeadQuestionReorderRequest {
    @Valid
    private List<Item> items;

    private List<UUID> orderedQuestionIds;

    public List<Item> getItems() {
        return items;
    }

    public void setItems(List<Item> items) {
        this.items = items;
    }

    public List<UUID> getOrderedQuestionIds() {
        return orderedQuestionIds;
    }

    public void setOrderedQuestionIds(List<UUID> orderedQuestionIds) {
        this.orderedQuestionIds = orderedQuestionIds;
    }

    public static class Item {
        private UUID questionId;
        private Integer displayOrder;

        public UUID getQuestionId() {
            return questionId;
        }

        public void setQuestionId(UUID questionId) {
            this.questionId = questionId;
        }

        public Integer getDisplayOrder() {
            return displayOrder;
        }

        public void setDisplayOrder(Integer displayOrder) {
            this.displayOrder = displayOrder;
        }
    }
}
