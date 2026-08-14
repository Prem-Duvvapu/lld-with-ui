package com.lld.shoppingcart.command;

import com.lld.shoppingcart.model.Cart;

public class UpdateQuantityCommand implements CartCommand {
    private final Cart cart;
    private final String productId;
    private final int oldQuantity;
    private final int newQuantity;

    public UpdateQuantityCommand(Cart cart, String productId, int oldQuantity, int newQuantity) {
        this.cart = cart;
        this.productId = productId;
        this.oldQuantity = oldQuantity;
        this.newQuantity = newQuantity;
    }

    @Override
    public void execute() {
        cart.updateQuantity(productId, newQuantity);
    }

    @Override
    public void undo() {
        cart.updateQuantity(productId, oldQuantity);
    }
}
