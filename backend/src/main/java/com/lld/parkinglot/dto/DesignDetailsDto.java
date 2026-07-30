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
public class DesignDetailsDto {

    private String title;
    private List<String> requirements;
    private List<EntityInfo> entities;
    private List<PatternInfo> designPatterns;
    private List<PrincipleInfo> principles;
    private List<OopInfo> oopConcepts;
    private List<ExtensibilityInfo> extensibility;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EntityInfo {
        private String name;
        private String description;
        private List<FieldInfo> fields;
        private List<MethodInfo> methods;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FieldInfo {
        private String name;
        private String type;
        private String value;
        private String description;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MethodInfo {
        private String name;
        private String returns;
        private String description;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PatternInfo {
        private String name;
        private boolean used;
        private String explanation;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PrincipleInfo {
        private String name;
        private String description;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OopInfo {
        private String name;
        private String description;
        private String alternative;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ExtensibilityInfo {
        private String area;
        private String description;
        private String difficulty;
    }
}
