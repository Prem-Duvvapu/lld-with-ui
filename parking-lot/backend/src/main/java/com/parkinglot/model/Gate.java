package com.parkinglot.model;

public class Gate {
    private String id;
    private String name;
    private GateType type;

    public enum GateType { ENTRY, EXIT }

    public Gate(String id, String name, GateType type) {
        this.id = id;
        this.name = name;
        this.type = type;
    }

    public String getId() { return id; }
    public String getName() { return name; }
    public GateType getType() { return type; }
}
