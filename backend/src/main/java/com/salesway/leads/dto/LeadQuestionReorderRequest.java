package com.salesway.leads.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;
import java.util.UUID;

public class LeadQuestionReorderRequest {
    @Valid
    @NotEmpty
    private List<Item> items;

    public List<Item> getItems() {
        return items;
    }

    public void setItems(List<Item> items) {
        this.items = items;
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
