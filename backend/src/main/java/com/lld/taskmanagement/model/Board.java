package com.lld.taskmanagement.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * A Kanban board. Holds only its own identity — the tasks that belong to it are looked up from
 * {@link com.lld.taskmanagement.repository.TaskRepository} by {@code boardId} rather than
 * embedded here, so a board and its tasks can never drift out of sync with each other.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Board {
    private int id;
    private String name;
    private long createdAt;
}
