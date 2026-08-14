package com.lld.shoppingcart.command;

import com.lld.shoppingcart.model.Cart;
import com.lld.shoppingcart.model.CartItem;

public class RemoveItemCommand implements CartCommand {
    private final Cart cart;
    private final CartItem removedItem;

    public RemoveItemCommand(Cart cart, CartItem removedItem) {
        this.cart = cart;
        this.removedItem = removedItem;
    }

    @Override
    public void execute() {
        cart.removeItem(removedItem.getProductId());
    }

    @Override
    public void undo() {
        if (removedItem != null) {
            cart.getItems().put(removedItem.getProductId(), removedItem);
        }
    }
}
