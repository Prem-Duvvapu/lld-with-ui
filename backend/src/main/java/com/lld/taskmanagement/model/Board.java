package com.lld.taskmanagement.model;

import java.util.concurrent.ConcurrentHashMap;

public class Board {
    private int id;
    private String name = "Main Board";
    private ConcurrentHashMap<Long, Task> tasks = new ConcurrentHashMap<>();

    public Board() {}

    public Board(int id, String name) {
        this.id = id;
        this.name = name;
    }

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public ConcurrentHashMap<Long, Task> getTasks() { return tasks; }
    public void setTasks(ConcurrentHashMap<Long, Task> tasks) { this.tasks = tasks; }
}
