package com.salesway.invitations.controller;

import com.salesway.invitations.dto.InvitationPreviewResponse;
import com.salesway.invitations.service.InvitationPreviewService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/invitations")
public class InvitationController {
    private final InvitationPreviewService invitationPreviewService;

    public InvitationController(InvitationPreviewService invitationPreviewService) {
        this.invitationPreviewService = invitationPreviewService;
    }

    @GetMapping("/preview")
    public ResponseEntity<InvitationPreviewResponse> preview(@RequestParam("token") String token) {
        return ResponseEntity.ok(invitationPreviewService.previewByToken(token));
    }
}
