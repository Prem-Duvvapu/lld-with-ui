package com.lld.parkinglot.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Gate {
    private String id;
    private String name;
    private GateType type;

    public enum GateType { ENTRY, EXIT }
}
