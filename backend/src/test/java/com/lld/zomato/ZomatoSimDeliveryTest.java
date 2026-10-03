package com.lld.zomato;

import com.lld.config.GlobalExceptionHandler;
import com.lld.zomato.controller.ZomatoController;
import com.lld.zomato.exception.InvalidDeliveryOtpException;
import com.lld.zomato.model.DeliveryAgent;
import com.lld.zomato.model.Order;
import com.lld.zomato.model.OrderStatus;
import com.lld.zomato.repository.ZomatoRepository;
import com.lld.zomato.service.DeliveryAssignmentService;
import com.lld.zomato.service.ZomatoService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class ZomatoSimDeliveryTest {
    private ZomatoService service;
    private Order order;

    @BeforeEach
    void setUp() {
        ZomatoRepository repository = new ZomatoRepository();
        service = new ZomatoService(repository, new DeliveryAssignmentService(repository));
        service.simReset();
        order = service.simOrder(null, null, null, null, "UPI");
        service.simConfirm(order.getId());
        service.simPrepare(order.getId());
        service.simReady(order.getId());
        assertEquals(OrderStatus.OUT_FOR_DELIVERY, order.getStatus());
    }

    private DeliveryAgent assignedAgent() {
        return ((List<?>) service.simState().get("agents")).stream()
                .map(DeliveryAgent.class::cast)
                .filter(agent -> agent.getId().equals(order.getDeliveryAgentId()))
                .findFirst().orElseThrow();
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"", "0000", "123"})
    void invalidOtpLeavesOrderAgentAndEventsUntouched(String otp) {
        DeliveryAgent agent = assignedAgent();
        int deliveries = agent.getTotalDeliveries();
        int eventCount = service.simEvents().size();

        assertThrows(InvalidDeliveryOtpException.class, () -> service.simDeliver(order.getId(), otp));

        assertEquals(OrderStatus.OUT_FOR_DELIVERY, order.getStatus());
        assertFalse(agent.isAvailable());
        assertEquals(deliveries, agent.getTotalDeliveries());
        assertEquals(eventCount, service.simEvents().size());
        assertTrue(service.getAllOrders().isEmpty());
    }

    @Test
    void correctOtpDeliversAndReleasesTheAssignedAgent() {
        DeliveryAgent agent = assignedAgent();
        int deliveries = agent.getTotalDeliveries();

        service.simDeliver(order.getId(), order.getDeliveryOtp());

        assertEquals(OrderStatus.DELIVERED, order.getStatus());
        assertTrue(agent.isAvailable());
        assertEquals(deliveries + 1, agent.getTotalDeliveries());
        assertEquals("DELIVERED", service.simEvents().get(service.simEvents().size() - 1).type());
    }

    @Test
    void controllerReturnsTheSharedErrorContractThenAcceptsCorrectOtp() throws Exception {
        MockMvc mvc = MockMvcBuilders.standaloneSetup(new ZomatoController(service))
                .setControllerAdvice(new GlobalExceptionHandler()).build();

        mvc.perform(post("/api/zomato/sim/deliver").contentType(MediaType.APPLICATION_JSON)
                .content("{\"orderId\":\"" + order.getId() + "\",\"otp\":\"0000\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("code").value("InvalidDeliveryOtpException"))
                .andExpect(jsonPath("status").value(400));

        mvc.perform(post("/api/zomato/sim/deliver").contentType(MediaType.APPLICATION_JSON)
                .content("{\"orderId\":\"" + order.getId() + "\",\"otp\":\"" + order.getDeliveryOtp() + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("status").value("DELIVERED"));
    }
}
