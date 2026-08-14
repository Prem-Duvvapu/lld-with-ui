package com.lld.shoppingcart.command;

import com.lld.shoppingcart.model.Cart;
import com.lld.shoppingcart.model.Product;

public class AddItemCommand implements CartCommand {
    private final Cart cart;
    private final Product product;
    private final int quantity;

    public AddItemCommand(Cart cart, Product product, int quantity) {
        this.cart = cart;
        this.product = product;
        this.quantity = quantity;
    }

    @Override
    public void execute() {
        cart.addItem(product, quantity);
    }

    @Override
    public void undo() {
        cart.updateQuantity(product.getId(), cart.getItems().get(product.getId()).getQuantity() - quantity);
    }
}
