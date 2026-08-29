package com.lld.shoppingcart.command;

import com.lld.shoppingcart.model.Cart;
import com.lld.shoppingcart.model.CartItem;
import com.lld.shoppingcart.model.Category;
import com.lld.shoppingcart.model.Product;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Direct unit tests of the three {@link CartCommand} implementations — exercised without going
 * through {@code ShoppingCartService}, proving each command's {@code execute()}/{@code undo()}
 * pair is correct in isolation, including the trickiest case: undoing an {@link UpdateQuantityCommand}
 * must restore the PREVIOUS quantity, not just delete the line item.
 */
public class CartCommandTest {

    private Cart cart;
    private Product product;

    @BeforeEach
    public void setUp() {
        cart = new Cart("u1");
        product = new Product("P1", "Gaming Laptop", Category.ELECTRONICS, 1000.0, 10);
    }

    @Test
    public void addItemCommand_executeAddsNewLineItem() {
        CartCommand cmd = new AddItemCommand(cart, product, 3);
        cmd.execute();

        assertEquals(1, cart.getItems().size());
        assertEquals(3, cart.getItems().get("P1").getQuantity());
    }

    @Test
    public void addItemCommand_undoRemovesFreshlyAddedItemEntirely() {
        CartCommand cmd = new AddItemCommand(cart, product, 3);
        cmd.execute();
        cmd.undo();

        assertNull(cart.getItems().get("P1"), "Undoing the only add should remove the line item entirely");
    }

    @Test
    public void addItemCommand_undoRestoresPreExistingQuantityWhenItemAlreadyInCart() {
        // Simulate a pre-existing quantity of 2 already in the cart before this command ran.
        cart.addItem(product, 2);

        CartCommand addThreeMore = new AddItemCommand(cart, product, 3);
        addThreeMore.execute();
        assertEquals(5, cart.getItems().get("P1").getQuantity());

        addThreeMore.undo();
        assertEquals(2, cart.getItems().get("P1").getQuantity(), "Undo must restore the quantity from before THIS command ran, not remove the item");
    }

    @Test
    public void removeItemCommand_executeRemovesLineItem() {
        cart.addItem(product, 4);
        CartItem removed = cart.getItems().get("P1");

        CartCommand cmd = new RemoveItemCommand(cart, removed);
        cmd.execute();

        assertNull(cart.getItems().get("P1"));
    }

    @Test
    public void removeItemCommand_undoRestoresTheExactRemovedLineItem() {
        cart.addItem(product, 4);
        CartItem removed = cart.getItems().get("P1");

        CartCommand cmd = new RemoveItemCommand(cart, removed);
        cmd.execute();
        cmd.undo();

        assertNotNull(cart.getItems().get("P1"));
        assertEquals(4, cart.getItems().get("P1").getQuantity());
    }

    @Test
    public void updateQuantityCommand_executeChangesQuantity() {
        cart.addItem(product, 2);
        CartItem snapshot = cart.getItems().get("P1");

        CartCommand cmd = new UpdateQuantityCommand(cart, "P1", snapshot, 7);
        cmd.execute();

        assertEquals(7, cart.getItems().get("P1").getQuantity());
    }

    @Test
    public void updateQuantityCommand_undoRestoresThePreviousQuantityNotJustRemoval() {
        cart.addItem(product, 2);
        CartItem snapshot = new CartItem("P1", product.getName(), product.getPrice(), 2);

        CartCommand cmd = new UpdateQuantityCommand(cart, "P1", snapshot, 7);
        cmd.execute();
        assertEquals(7, cart.getItems().get("P1").getQuantity());

        cmd.undo();
        assertEquals(2, cart.getItems().get("P1").getQuantity(), "Undo of UpdateQuantityCommand must restore the OLD quantity (2), not delete the item or leave it at the new value (7)");
    }

    @Test
    public void updateQuantityCommand_undoAfterQuantityDroppedToZeroRestoresOriginalLineItem() {
        cart.addItem(product, 5);
        // Snapshot must be taken BEFORE execute() mutates/removes the live CartItem, exactly as
        // ShoppingCartService#updateCartQuantity does.
        CartItem snapshot = new CartItem("P1", product.getName(), product.getPrice(), 5);

        // Update down to 0 -- Cart#updateQuantity treats qty<=0 as a removal.
        CartCommand cmd = new UpdateQuantityCommand(cart, "P1", snapshot, 0);
        cmd.execute();
        assertNull(cart.getItems().get("P1"), "Setting quantity to 0 removes the line item");

        cmd.undo();
        assertNotNull(cart.getItems().get("P1"), "Undo must resurrect the line item Cart#updateQuantity cannot restore on its own");
        assertEquals(5, cart.getItems().get("P1").getQuantity(), "Undo must resurrect the line item at its old quantity");
    }

    @Test
    public void updateQuantityCommand_undoWhenItemNeverExistedBeforeRemovesWhateverExecuteCreated() {
        // No prior item in the cart (previousSnapshot == null) -- mirrors calling update on a
        // product never added before, which ShoppingCartService still allows.
        CartCommand cmd = new UpdateQuantityCommand(cart, "P1", null, 3);
        cmd.execute();

        cmd.undo();
        assertNull(cart.getItems().get("P1"));
    }
}
