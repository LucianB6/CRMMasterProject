package com.salesway.tasks.controller;

import com.salesway.tasks.dto.TaskBoardRequest;
import com.salesway.tasks.dto.TaskBoardResponse;
import com.salesway.tasks.service.TaskBoardService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping({"/tasks/board", "/api/tasks/board"})
public class TaskBoardController {
    private final TaskBoardService taskBoardService;

    public TaskBoardController(TaskBoardService taskBoardService) {
        this.taskBoardService = taskBoardService;
    }

    @GetMapping
    public ResponseEntity<List<TaskBoardResponse>> getTasks() {
        return ResponseEntity.ok(taskBoardService.getTasks());
    }

    @PostMapping
    public ResponseEntity<TaskBoardResponse> createTask(@Valid @RequestBody TaskBoardRequest request) {
        return ResponseEntity.ok(taskBoardService.createTask(request));
    }

    @PutMapping("/{taskId}")
    public ResponseEntity<TaskBoardResponse> updateTask(
            @PathVariable("taskId") UUID taskId,
            @Valid @RequestBody TaskBoardRequest request
    ) {
        return ResponseEntity.ok(taskBoardService.updateTask(taskId, request));
    }

    @DeleteMapping("/{taskId}")
    public ResponseEntity<Void> deleteTask(@PathVariable("taskId") UUID taskId) {
        taskBoardService.deleteTask(taskId);
        return ResponseEntity.noContent().build();
    }
}
