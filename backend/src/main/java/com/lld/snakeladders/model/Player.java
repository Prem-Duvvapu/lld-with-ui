package com.lld.snakeladders.model;

import lombok.Getter;
import lombok.Setter;

@Getter
public class Player {
    private final String name;
    @Setter
    private int position;
    private final String color;

    public Player(String name, String color) {
        this.name = name;
        this.color = color;
        this.position = 0;
    }
}
