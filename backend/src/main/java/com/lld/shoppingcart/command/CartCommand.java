package com.lld.shoppingcart.command;

public interface CartCommand {
    void execute();
    void undo();
}
