package com.salesway.leads.controller;

import com.salesway.common.error.ApiExceptionHandler;
import com.salesway.leads.dto.LeadActivityResponse;
import com.salesway.leads.dto.LeadAiInsightFactorResponse;
import com.salesway.leads.dto.LeadAiInsightFeedbackRequest;
import com.salesway.leads.dto.LeadAiExplainabilityResponse;
import com.salesway.leads.dto.LeadAiInsightsResponse;
import com.salesway.leads.dto.LeadAiNextBestActionResponse;
import com.salesway.leads.dto.LeadAiWhatChangedResponse;
import com.salesway.leads.dto.LeadDetailAnswerItemResponse;
import com.salesway.leads.enums.LeadInsightFeedbackStatus;
import com.salesway.leads.service.LeadDetailsService;
import com.salesway.leads.service.LeadManagementService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class LeadManagementControllerIntegrationTest {

    private MockMvc mockMvc;
    private LeadDetailsService leadDetailsService;

    @BeforeEach
    void setUp() {
        LeadManagementService leadManagementService = mock(LeadManagementService.class);
        leadDetailsService = mock(LeadDetailsService.class);
        LeadManagementController controller = new LeadManagementController(leadManagementService, leadDetailsService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new ApiExceptionHandler())
                .build();
    }

    @Test
    void getAnswers_returnsPayload() throws Exception {
        UUID leadId = UUID.randomUUID();
        when(leadDetailsService.getAnswers(leadId)).thenReturn(List.of(
                new LeadDetailAnswerItemResponse(UUID.randomUUID(), "Question", "single_select", "Meta Ads", Instant.now())
        ));

        mockMvc.perform(get("/manager/leads/{leadId}/answers", leadId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].questionLabel").value("Question"))
                .andExpect(jsonPath("$[0].answer").value("Meta Ads"));
    }

    @Test
    void postCall_missingRequiredTitle_returns400() throws Exception {
        UUID leadId = UUID.randomUUID();
        String body = """
                {
                  "description": "Call details"
                }
                """;

        mockMvc.perform(post("/manager/leads/{leadId}/calls", leadId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    void getActivities_returnsPagedPayload() throws Exception {
        UUID leadId = UUID.randomUUID();
        when(leadDetailsService.getActivities(leadId, 0, 20)).thenReturn(new PageImpl<>(
                new java.util.ArrayList<>(List.of(
                        new LeadActivityResponse(UUID.randomUUID(), "note", "Notă adăugată", "Text", "Ion Popescu", Instant.now())
                )),
                PageRequest.of(0, 20),
                1
        ));

        mockMvc.perform(get("/manager/leads/{leadId}/activities", leadId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].type").value("note"))
                .andExpect(jsonPath("$.content[0].actorName").value("Ion Popescu"));
    }

    @Test
    void getAiInsights_returnsStableContract() throws Exception {
        UUID leadId = UUID.randomUUID();
        UUID insightId = UUID.randomUUID();
        when(leadDetailsService.getAiInsights(leadId)).thenReturn(new LeadAiInsightsResponse(
                insightId,
                82,
                "positive",
                "low",
                "improving",
                "",
                0.91,
                "high",
                "ai",
                new LeadAiNextBestActionResponse(
                        "schedule_call",
                        "urgent",
                        "Lead is strong and ready for direct contact.",
                        "Momentum is high enough for a decisive move.",
                        "today"
                ),
                new LeadAiWhatChangedResponse(
                        "Follow up on implementation timing.",
                        "COMPLETED",
                        List.of("Current next step: Schedule qualification call")
                ),
                new LeadAiExplainabilityResponse(
                        "ICP Profile Match: Growing tech company.",
                        List.of("ICP Profile Match: Growing tech company."),
                        List.of("Playbook says to move fast when ROI is clear.")
                ),
                "Schedule a qualification call today.",
                "Anchor discussion on ROI and implementation speed.",
                List.of(new LeadAiInsightFactorResponse("ICP Profile Match", 25, "positive", "Growing tech company.")),
                Instant.now()
        ));

        mockMvc.perform(get("/manager/leads/{leadId}/ai-insights", leadId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.insightId").value(insightId.toString()))
                .andExpect(jsonPath("$.score").value(82))
                .andExpect(jsonPath("$.relationshipSentiment").value("positive"))
                .andExpect(jsonPath("$.relationshipRiskLevel").value("low"))
                .andExpect(jsonPath("$.confidenceLevel").value("high"))
                .andExpect(jsonPath("$.guidanceSource").value("ai"))
                .andExpect(jsonPath("$.nextBestAction.actionType").value("schedule_call"))
                .andExpect(jsonPath("$.nextBestAction.priority").value("urgent"))
                .andExpect(jsonPath("$.whatChanged.changes[0]").exists())
                .andExpect(jsonPath("$.explainability.whyThisInsight").exists())
                .andExpect(jsonPath("$.explainability.basedOnSignals[0]").exists())
                .andExpect(jsonPath("$.recommendedAction").exists())
                .andExpect(jsonPath("$.scoreFactors[0].label").value("ICP Profile Match"));
    }

    @Test
    void patchAiInsightFeedback_returns204() throws Exception {
        UUID leadId = UUID.randomUUID();
        UUID insightId = UUID.randomUUID();
        String body = """
                {
                  "status": "COMPLETED",
                  "note": "Ora meetingului a fost confirmată."
                }
                """;

        mockMvc.perform(patch("/manager/leads/{leadId}/ai-insights/{insightId}/feedback", leadId, insightId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isNoContent());
    }
}
