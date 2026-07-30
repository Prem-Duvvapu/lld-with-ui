package com.lld.parkinglot.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ClassDiagramDto {

    private String title;
    private List<ClassInfo> classes;
    private List<RelationshipInfo> relationships;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ClassInfo {
        private String name;
        private String stereotype;
        private List<String> fields;
        private List<String> methods;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RelationshipInfo {
        private String from;
        private String to;
        private String label;
        private Boolean dashed;
    }
}
