package com.lld.parkinglot.model;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Gate {
    private String id;
    private String name;
    private GateType type;

    public enum GateType { ENTRY, EXIT }
}
