package com.lld.linkedin.model;

import lombok.Getter;

import java.util.Objects;
import java.util.UUID;

@Getter
public class Skill {
    private final String id;
    private final String name;

    public Skill(String name) {
        if (name == null || name.trim().isEmpty()) {
            throw new IllegalArgumentException("Skill name cannot be null or empty");
        }
        this.id = UUID.randomUUID().toString();
        this.name = name.trim().toLowerCase();
    }

    public Skill(String id, String name) {
        if (name == null || name.trim().isEmpty()) {
            throw new IllegalArgumentException("Skill name cannot be null or empty");
        }
        this.id = id != null ? id : UUID.randomUUID().toString();
        this.name = name.trim().toLowerCase();
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Skill skill = (Skill) o;
        return Objects.equals(name, skill.name);
    }

    @Override
    public int hashCode() {
        return Objects.hash(name);
    }

    @Override
    public String toString() {
        return name;
    }
}
