package com.lld.shoppingcart.payment;

import com.lld.shoppingcart.exception.PaymentFailedException;
import com.lld.shoppingcart.model.PaymentMethod;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Strategy-pattern unit tests for {@link ShoppingCartPaymentProcessor}: proves it resolves all
 * four {@link PaymentMethod} values to their matching {@link PaymentStrategy}, and that
 * {@link PaymentFailedException} is genuinely provokable rather than dead code -- reachable
 * whenever the strategy map doesn't have an entry for the requested method (the real production
 * wiring always registers all four Spring-managed strategies, but the resolution logic itself has
 * no special-case for "all four exist"; it is a real defensive branch a leaner Spring context, a
 * future fifth {@link PaymentMethod} added without its strategy, or a unit test with a partial
 * strategy list will all hit).
 */
public class ShoppingCartPaymentProcessorTest {

    @Test
    public void resolvesAllFourPaymentMethodsToTheirMatchingStrategy() {
        ShoppingCartPaymentProcessor processor = new ShoppingCartPaymentProcessor(List.of(
                new CreditCardPaymentStrategy(),
                new DebitCardPaymentStrategy(),
                new UpiPaymentStrategy(),
                new WalletPaymentStrategy()
        ));

        assertTrue(processor.executePayment("ORD-1", 100.0, PaymentMethod.CREDIT_CARD).startsWith("TX-CC-"));
        assertTrue(processor.executePayment("ORD-2", 100.0, PaymentMethod.DEBIT_CARD).startsWith("TX-DC-"));
        assertTrue(processor.executePayment("ORD-3", 100.0, PaymentMethod.UPI).startsWith("TX-UPI-"));
        assertTrue(processor.executePayment("ORD-4", 100.0, PaymentMethod.WALLET).startsWith("TX-WAL-"));
    }

    @Test
    public void eachStrategyReportsItsOwnMethodAccurately() {
        assertEquals(PaymentMethod.CREDIT_CARD, new CreditCardPaymentStrategy().getMethod());
        assertEquals(PaymentMethod.DEBIT_CARD, new DebitCardPaymentStrategy().getMethod());
        assertEquals(PaymentMethod.UPI, new UpiPaymentStrategy().getMethod());
        assertEquals(PaymentMethod.WALLET, new WalletPaymentStrategy().getMethod());
    }

    @Test
    public void unsupportedPaymentMethodThrowsPaymentFailedException() {
        // A processor wired with only a partial strategy list -- e.g. a leaner Spring context, or
        // a future PaymentMethod added before its strategy is implemented -- must fail loudly
        // rather than NPE or silently no-op.
        ShoppingCartPaymentProcessor partial = new ShoppingCartPaymentProcessor(List.of(
                new CreditCardPaymentStrategy(),
                new UpiPaymentStrategy()
        ));

        PaymentFailedException ex = assertThrows(PaymentFailedException.class,
                () -> partial.executePayment("ORD-5", 100.0, PaymentMethod.WALLET));
        assertTrue(ex.getMessage().contains("WALLET"));
    }

    @Test
    public void emptyStrategyListRejectsEveryPaymentMethod() {
        ShoppingCartPaymentProcessor empty = new ShoppingCartPaymentProcessor(List.of());

        for (PaymentMethod method : PaymentMethod.values()) {
            assertThrows(PaymentFailedException.class, () -> empty.executePayment("ORD-X", 1.0, method));
        }
    }
}
