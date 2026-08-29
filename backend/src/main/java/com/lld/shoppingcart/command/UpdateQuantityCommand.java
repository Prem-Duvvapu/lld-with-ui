package com.lld.shoppingcart.command;

import com.lld.shoppingcart.model.Cart;
import com.lld.shoppingcart.model.CartItem;

/**
 * Rewrites a line item's quantity in place. {@code undo()} must restore the PREVIOUS quantity, not
 * just delete the item — including when {@code newQuantity <= 0}, which makes {@link Cart#updateQuantity}
 * remove the line item entirely. {@link Cart#updateQuantity} only ever mutates an EXISTING map entry
 * (it never re-inserts one), so undoing that case by replaying {@code cart.updateQuantity(productId, oldQuantity)}
 * would silently no-op against a now-missing entry. This command therefore snapshots the full
 * previous {@link CartItem} (not just its quantity) at construction time and, on undo, reinserts
 * that snapshot directly whenever the line item no longer exists.
 */
public class UpdateQuantityCommand implements CartCommand {
    private final Cart cart;
    private final String productId;
    private final CartItem previousSnapshot;
    private final int newQuantity;

    public UpdateQuantityCommand(Cart cart, String productId, CartItem previousSnapshot, int newQuantity) {
        this.cart = cart;
        this.productId = productId;
        this.previousSnapshot = previousSnapshot;
        this.newQuantity = newQuantity;
    }

    @Override
    public void execute() {
        cart.updateQuantity(productId, newQuantity);
    }

    @Override
    public void undo() {
        if (previousSnapshot == null || previousSnapshot.getQuantity() <= 0) {
            cart.removeItem(productId);
            return;
        }
        if (cart.getItems().containsKey(productId)) {
            // Line item still present (execute() only changed its quantity) -- restore it in place.
            cart.updateQuantity(productId, previousSnapshot.getQuantity());
        } else {
            // execute() dropped the quantity to <= 0, which removed the entry entirely --
            // Cart#updateQuantity cannot resurrect a missing entry, so reinsert the full snapshot.
            cart.getItems().put(productId, new CartItem(previousSnapshot.getProductId(),
                    previousSnapshot.getProductName(), previousSnapshot.getUnitPrice(), previousSnapshot.getQuantity()));
        }
    }
}
