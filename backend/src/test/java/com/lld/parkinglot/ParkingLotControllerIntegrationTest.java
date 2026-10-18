package com.lld.parkinglot;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.lld.config.GlobalExceptionHandler;
import com.lld.parkinglot.config.ParkingLotInitializer;
import com.lld.parkinglot.controller.ParkingLotController;
import com.lld.parkinglot.repository.ParkingLotRepository;
import com.lld.parkinglot.service.ParkingLotService;
import com.lld.parkinglot.service.ParkingLotSimService;
import com.lld.parkinglot.strategy.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class ParkingLotControllerIntegrationTest {
    private MockMvc http;
    private final ObjectMapper json = new ObjectMapper().findAndRegisterModules()
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    @BeforeEach
    void setUp() {
        var repository = new ParkingLotRepository();
        new ParkingLotInitializer(repository).run();
        var spots = new SpotAssignmentStrategyFactory(new NearestSpotStrategy(), new FarthestSpotStrategy());
        var prices = new PricingStrategyFactory(new HourlyPricingStrategy(), new FlatRatePricingStrategy(), new DynamicPricingStrategy());
        var controller = new ParkingLotController(new ParkingLotService(repository, spots, prices), new ParkingLotSimService(spots, prices));
        http = MockMvcBuilders.standaloneSetup(controller).setControllerAdvice(new GlobalExceptionHandler())
                .setMessageConverters(new MappingJackson2HttpMessageConverter(json)).build();
    }

    @Test
    void liveEntryPreviewAndPaymentPreserveTheirRealHttpContract() throws Exception {
        var response = http.perform(post("/api/parking/entry").contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"gateId":"G1","vehicleNumber":"CAR-42","vehicleType":"CAR","strategy":"NEAREST"}
                        """))
                .andExpect(status().isOk()).andExpect(jsonPath("$.spotId").value("F1-C1"))
                .andExpect(jsonPath("$.elapsedMinutes").value(0)).andReturn();
        String ticketNumber = json.readTree(response.getResponse().getContentAsString()).get("ticketNumber").asText();
        var request = json.createObjectNode().put("gateId", "G3").put("ticketNumber", ticketNumber)
                .put("pricingStrategy", "HOURLY").put("paymentMethod", "CARD").toString();
        http.perform(post("/api/parking/exit/scan").contentType(MediaType.APPLICATION_JSON).content(request))
                .andExpect(status().isOk()).andExpect(jsonPath("$.amount").value(20.0));
        http.perform(get("/api/parking/tickets/active")).andExpect(jsonPath("$.length()").value(1));
        http.perform(post("/api/parking/exit/pay").contentType(MediaType.APPLICATION_JSON).content(request))
                .andExpect(status().isOk()).andExpect(jsonPath("$.paymentStatus").value("PAID"))
                .andExpect(jsonPath("$.paymentMethod").value("CARD"));
        http.perform(get("/api/parking/tickets/active")).andExpect(jsonPath("$.length()").value(0));
        http.perform(post("/api/parking/exit/pay").contentType(MediaType.APPLICATION_JSON).content(request))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("TicketAlreadyExitedException"));
    }

    @Test
    void sandboxWorkflowReturnsSnapshotsWithoutChangingLiveState() throws Exception {
        http.perform(post("/api/parking/sim/reset")).andExpect(status().isOk())
                .andExpect(jsonPath("$.spots.length()").value(10));
        var response = http.perform(post("/api/parking/sim/entry").contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"vehicleNumber":"SIM-42","vehicleType":"TRUCK","strategy":"FARTHEST"}
                        """))
                .andExpect(status().isOk()).andExpect(jsonPath("$.activeTickets[0].spotId").value("SF2-T1"))
                .andReturn();
        String ticketNumber = json.readTree(response.getResponse().getContentAsString())
                .get("activeTickets").get(0).get("ticketNumber").asText();
        var request = json.createObjectNode().put("ticketNumber", ticketNumber).put("pricingStrategy", "DYNAMIC")
                .put("paymentMethod", "UPI").toString();
        http.perform(post("/api/parking/sim/scan").contentType(MediaType.APPLICATION_JSON).content(request))
                .andExpect(status().isOk()).andExpect(jsonPath("$.previewAmount").value(60.0));
        http.perform(post("/api/parking/sim/pay").contentType(MediaType.APPLICATION_JSON).content(request))
                .andExpect(status().isOk()).andExpect(jsonPath("$.activeTickets.length()").value(0))
                .andExpect(jsonPath("$.events[3].data.amount").value(60.0));
        http.perform(get("/api/parking/tickets/active")).andExpect(jsonPath("$.length()").value(0));
        http.perform(get("/api/parking/spots/available")).andExpect(jsonPath("$.length()").value(30));
    }

    @Test
    void typedReadOnlyScanFailuresExposeTheSharedErrorBody() throws Exception {
        http.perform(post("/api/parking/exit/scan").contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"gateId":"G3","ticketNumber":"MISSING"}
                        """))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("TicketNotFoundException"))
                .andExpect(jsonPath("$.status").value(404)).andExpect(jsonPath("$.error").isString())
                .andExpect(jsonPath("$.timestamp").exists());
    }
}
