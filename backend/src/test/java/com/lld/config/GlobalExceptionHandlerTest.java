package com.lld.config;

// airline
import com.lld.airline.exception.BookingFailedException;
import com.lld.airline.exception.FlightNotFoundException;
import com.lld.airline.exception.HoldExpiredException;
import com.lld.airline.exception.InvalidCancellationException;
import com.lld.airline.exception.SeatNotAvailableException;

// library
import com.lld.library.exception.BookNotAvailableException;
import com.lld.library.exception.BorrowLimitExceededException;
import com.lld.library.exception.InvalidReturnException;
import com.lld.library.exception.LoanNotFoundException;
import com.lld.library.exception.MemberNotFoundException;

// linkedin
import com.lld.linkedin.exception.ConnectionException;
import com.lld.linkedin.exception.InvalidCredentialsException;
import com.lld.linkedin.exception.JobNotFoundException;
import com.lld.linkedin.exception.UnauthorizedActionException;
import com.lld.linkedin.exception.UserAlreadyExistsException;
import com.lld.linkedin.exception.UserNotFoundException;
import com.lld.linkedin.exception.ValidationException;

// stockbroker
import com.lld.stockbroker.exception.AccountNotFoundException;
import com.lld.stockbroker.exception.InsufficientFundsException;
import com.lld.stockbroker.exception.InsufficientStockException;
import com.lld.stockbroker.exception.InvalidOrderException;
import com.lld.stockbroker.exception.OrderExecutionException;
import com.lld.stockbroker.exception.StockNotFoundException;

// restaurant
import com.lld.restaurant.exception.BillAlreadyPaidException;
import com.lld.restaurant.exception.BillNotFoundException;
import com.lld.restaurant.exception.TableNotFoundException;
import com.lld.restaurant.exception.TableUnavailableException;

// zomato
import com.lld.zomato.exception.CustomerNotFoundException;
import com.lld.zomato.exception.DeliveryAgentNotFoundException;
import com.lld.zomato.exception.NoAgentAvailableException;
import com.lld.zomato.exception.PaymentFailedException;
import com.lld.zomato.exception.RestaurantNotFoundException;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.http.ResponseEntity;

import java.util.NoSuchElementException;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;

/**
 * These domain exceptions used to surface as a bare HTTP 500 with the message
 * stripped, because none of the modules had a @ResponseStatus, a
 * @ControllerAdvice, or a single try/catch in its controller. The statuses
 * asserted here are the ones AGENTS.md and README already documented.
 */
class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    static Stream<Arguments> domainExceptions() {
        return Stream.of(
                // airline
                Arguments.of(new SeatNotAvailableException("seat taken"), 409),
                Arguments.of(new HoldExpiredException("hold gone"), 410),
                Arguments.of(new BookingFailedException("payment failed"), 422),
                Arguments.of(new InvalidCancellationException("departed"), 400),
                Arguments.of(new FlightNotFoundException("no flight"), 404),
                // library
                Arguments.of(new BookNotAvailableException("all copies out"), 409),
                Arguments.of(new BorrowLimitExceededException("quota"), 409),
                Arguments.of(new MemberNotFoundException("no member"), 404),
                Arguments.of(new LoanNotFoundException("no loan"), 404),
                Arguments.of(new InvalidReturnException("already returned"), 400),
                // linkedin
                Arguments.of(new UserNotFoundException("no user"), 404),
                Arguments.of(new JobNotFoundException("no job"), 404),
                Arguments.of(new UserAlreadyExistsException("dupe"), 409),
                Arguments.of(new ConnectionException("already connected"), 409),
                Arguments.of(new InvalidCredentialsException("bad pin"), 401),
                Arguments.of(new UnauthorizedActionException("not 1st degree"), 403),
                Arguments.of(new ValidationException("blank name"), 400),
                // stockbroker
                Arguments.of(new InsufficientFundsException("no cash"), 400),
                Arguments.of(new InsufficientStockException("no shares"), 400),
                Arguments.of(new InvalidOrderException("bad qty"), 400),
                Arguments.of(new StockNotFoundException("no symbol"), 404),
                Arguments.of(new AccountNotFoundException("no account"), 404),
                Arguments.of(new OrderExecutionException("no liquidity"), 422),
                // restaurant
                Arguments.of(new TableNotFoundException("table not found"), 404),
                Arguments.of(new com.lld.restaurant.exception.OrderNotFoundException("order not found"), 404),
                Arguments.of(new com.lld.restaurant.exception.MenuItemNotFoundException("item not found"), 404),
                Arguments.of(new BillNotFoundException("bill not found"), 404),
                Arguments.of(new TableUnavailableException("table unavailable"), 409),
                Arguments.of(new com.lld.restaurant.exception.InvalidOrderTransitionException("invalid transition"), 409),
                Arguments.of(new com.lld.restaurant.exception.MenuItemUnavailableException("item unavailable"), 409),
                Arguments.of(new BillAlreadyPaidException("already paid"), 409),
                // zomato
                Arguments.of(new RestaurantNotFoundException("restaurant not found"), 404),
                Arguments.of(new CustomerNotFoundException("customer not found"), 404),
                Arguments.of(new com.lld.zomato.exception.OrderNotFoundException("order not found"), 404),
                Arguments.of(new com.lld.zomato.exception.MenuItemNotFoundException("item not found"), 404),
                Arguments.of(new DeliveryAgentNotFoundException("agent not found"), 404),
                Arguments.of(new com.lld.zomato.exception.InvalidOrderTransitionException("invalid transition"), 409),
                Arguments.of(new com.lld.zomato.exception.MenuItemUnavailableException("item unavailable"), 409),
                Arguments.of(new NoAgentAvailableException("no agent available"), 409),
                Arguments.of(new PaymentFailedException("payment failed"), 422)
        );
    }

    @ParameterizedTest(name = "{0} -> {1}")
    @MethodSource("domainExceptions")
    @DisplayName("each domain exception maps to its documented status and keeps its message")
    void mapsToDocumentedStatus(DomainException ex, int expectedStatus) {
        ResponseEntity<ErrorResponse> response = handler.handleDomain(ex);

        assertEquals(expectedStatus, response.getStatusCode().value(),
                ex.getClass().getSimpleName() + " should map to " + expectedStatus);
        assertNotNull(response.getBody());
        assertEquals(ex.getMessage(), response.getBody().error(), "the reason must reach the caller");
        assertEquals(ex.getClass().getSimpleName(), response.getBody().code());
        assertEquals(expectedStatus, response.getBody().status(), "body status must match the HTTP status");
    }

    @Test
    @DisplayName("every domain exception is a RuntimeException, so existing throw sites still compile")
    void staysUnchecked() {
        domainExceptions().forEach(args -> {
            Object ex = args.get()[0];
            assertInstanceOf(RuntimeException.class, ex);
            assertInstanceOf(DomainException.class, ex);
        });
    }

    @Test
    @DisplayName("an unannotated domain exception is a client error, not a 500")
    void unannotatedDomainExceptionIsClientError() {
        // A rule violation is the caller's problem by definition; defaulting to 500
        // is what made these invisible in the first place.
        DomainException bare = new DomainException("some rule broke") {
        };
        ResponseEntity<ErrorResponse> response = handler.handleDomain(bare);
        assertEquals(400, response.getStatusCode().value());
        assertEquals("some rule broke", response.getBody().error());
    }

    @Test
    @DisplayName("a domain exception with no message still yields a readable body")
    void nullMessageDomainException() {
        ResponseEntity<ErrorResponse> response = handler.handleDomain(new FlightNotFoundException(null));
        assertEquals(404, response.getStatusCode().value());
        assertEquals("FlightNotFoundException", response.getBody().error());
    }

    @Test
    @DisplayName("bad arguments and state are 400")
    void badRequests() {
        assertEquals(400, handler.handleBadRequest(new IllegalArgumentException("nope")).getStatusCode().value());
        assertEquals(400, handler.handleBadRequest(new IllegalStateException("nope")).getStatusCode().value());
        assertEquals("nope", handler.handleBadRequest(new IllegalArgumentException("nope")).getBody().error());
    }

    @Test
    @DisplayName("a missing element is 404")
    void notFound() {
        ResponseEntity<ErrorResponse> response = handler.handleNotFound(new NoSuchElementException("gone"));
        assertEquals(404, response.getStatusCode().value());
        assertEquals("gone", response.getBody().error());
    }
}
