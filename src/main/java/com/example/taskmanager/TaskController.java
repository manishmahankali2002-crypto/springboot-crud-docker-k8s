
package com.example.taskmanager;

import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/tasks")
public class TaskController {

    private final TaskRepository repository;

    public TaskController(TaskRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<Task> getTasks() {
        return repository.findAll();
    }

    @PostMapping
    public ResponseEntity<?> createTask(
            @RequestBody Map<String, Object> body) {

        Object value = body.get("title");

        if (!(value instanceof String title)
                || title.trim().isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "A task title is required"));
        }

        Task task = new Task();
        task.setTitle(title.trim());

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(repository.save(task));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateTask(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {

        if (id < 1) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Invalid task ID"));
        }

        var existing = repository.findById(id);

        if (existing.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Task not found"));
        }

        Task task = existing.get();

        if (!body.containsKey("title")
                && !body.containsKey("completed")) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error",
                            "Provide a title or completed field"));
        }

        if (body.containsKey("title")) {
            Object title = body.get("title");

            if (!(title instanceof String text)
                    || text.trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error",
                                "Title must be a non-empty string"));
            }

            task.setTitle(((String) title).trim());
        }

        if (body.containsKey("completed")) {
            Object completed = body.get("completed");

            if (!(completed instanceof Boolean)) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error",
                                "Completed must be true or false"));
            }

            task.setCompleted((Boolean) completed);
        }

        return ResponseEntity.ok(repository.save(task));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteTask(@PathVariable Long id) {

        if (id < 1) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Invalid task ID"));
        }

        if (!repository.existsById(id)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Task not found"));
        }

        repository.deleteById(id);

        return ResponseEntity.ok(Map.of(
                "message",
                "Task " + id + " deleted successfully"));
    }
}
