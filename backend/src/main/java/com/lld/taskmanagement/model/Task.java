package com.lld.taskmanagement.model;

public class Task {
    private long id;
    private String title;
    private String description;
    private TaskStatus status;
    private Priority priority;
    private String assignee;
    private long createdAt;

    public Task() {}

    public Task(long id, String title, String description, Priority priority, String assignee) {
        this.id = id;
        this.title = title;
        this.description = description;
        this.status = TaskStatus.TODO;
        this.priority = priority;
        this.assignee = assignee;
        this.createdAt = System.currentTimeMillis();
    }

    public long getId() { return id; }
    public void setId(long id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public TaskStatus getStatus() { return status; }
    public void setStatus(TaskStatus status) { this.status = status; }
    public Priority getPriority() { return priority; }
    public void setPriority(Priority priority) { this.priority = priority; }
    public String getAssignee() { return assignee; }
    public void setAssignee(String assignee) { this.assignee = assignee; }
    public long getCreatedAt() { return createdAt; }
    public void setCreatedAt(long createdAt) { this.createdAt = createdAt; }
}
