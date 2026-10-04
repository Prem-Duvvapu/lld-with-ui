package com.lld.ludo;

import com.lld.ludo.controller.LudoController;
import com.lld.ludo.dice.FixedDiceRoller;
import com.lld.ludo.repository.LudoRepository;
import com.lld.ludo.service.LudoService;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class LudoSimulationControllerTest {
    @Test
    void validTokenEndpointReturnsBackendChoicesAndResetsPendingRoll() throws Exception {
        LudoService service = new LudoService(new LudoRepository(), new FixedDiceRoller(6, 6));
        MockMvc mvc = MockMvcBuilders.standaloneSetup(new LudoController(service)).build();
        mvc.perform(post("/api/ludo/sim/reset")).andExpect(status().isOk());
        mvc.perform(get("/api/ludo/sim/valid-tokens")).andExpect(content().json("[]"));
        mvc.perform(post("/api/ludo/sim/roll")).andExpect(status().isOk());
        mvc.perform(get("/api/ludo/sim/valid-tokens"))
                .andExpect(status().isOk()).andExpect(content().json("[0,1,2,3]"));
        mvc.perform(post("/api/ludo/sim/move").contentType("application/json")
                .content("{\"playerIndex\":0,\"tokenIndex\":0}")).andExpect(status().isOk());
        mvc.perform(post("/api/ludo/sim/roll")).andExpect(status().isOk());
        mvc.perform(get("/api/ludo/sim/valid-tokens")).andExpect(content().json("[0]"));
        mvc.perform(post("/api/ludo/sim/reset")).andExpect(status().isOk());
        mvc.perform(get("/api/ludo/sim/valid-tokens")).andExpect(content().json("[]"));
    }
}
