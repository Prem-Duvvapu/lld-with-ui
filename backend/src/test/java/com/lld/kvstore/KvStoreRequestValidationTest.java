package com.lld.kvstore;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.lld.config.DomainException;
import com.lld.config.GlobalExceptionHandler;
import com.lld.kvstore.controller.KvStoreController;
import com.lld.kvstore.repository.KvStoreRepository;
import com.lld.kvstore.exception.InvalidKvRequestException;
import com.lld.kvstore.service.KvStoreService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Real HTTP binding and domain validation; rejects input before mutating either store. */
class KvStoreRequestValidationTest {
    private MockMvc http;
    private KvStoreService service;
    private KvStoreRepository repository;
    private JsonNode before;
    private final ObjectMapper json = new ObjectMapper().findAndRegisterModules()
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    @BeforeEach
    void setUp() {
        repository = new KvStoreRepository();
        service = new KvStoreService(repository);
        service.set("key", "seed", null);
        service.simSet("key", "sandbox seed", null);
        before = snapshotState();
        http = MockMvcBuilders.standaloneSetup(new KvStoreController(service))
                .setControllerAdvice(new GlobalExceptionHandler())
                .setMessageConverters(new MappingJackson2HttpMessageConverter(json)).build();
    }

    @ParameterizedTest
    @ValueSource(strings = {"{}", "{\"value\":null}", "{\"value\":123}", "{\"value\":false}",
            "{\"value\":{\"nested\":\"value\"}}", "{\"value\":[\"value\"]}"})
    void setRequiresAnActualStringInBothLiveAndSandboxRequests(String body) throws Exception {
        for (String base : new String[]{"/api/kvstore/", "/api/kvstore/sim/"}) {
            http.perform(put(base + "key").contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isBadRequest()).andExpect(jsonPath("$.status").value(400))
                    .andExpect(jsonPath("$.code").value("InvalidKvRequestException"))
                    .andExpect(jsonPath("$.error").isString()).andExpect(jsonPath("$.timestamp").isString());
            unchanged();
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"0", "-1", "1.5", "1.0", "\"5\"", "true", "{}", "[]",
            "9223372036854775808", "9223372036854775807", "9223372036854775"})
    void invalidOrOverflowingTtlCannotReplaceOrLogAValue(String ttl) throws Exception {
        for (String base : new String[]{"/api/kvstore/", "/api/kvstore/sim/"}) {
            http.perform(put(base + "key").contentType(MediaType.APPLICATION_JSON)
                            .content("{\"value\":\"rejected\",\"ttlSeconds\":" + ttl + "}"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("InvalidKvRequestException"));
            unchanged();
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"{}", "{\"expectedVersion\":1}", "{\"newValue\":\"value\"}",
            "{\"expectedVersion\":null,\"newValue\":\"value\"}",
            "{\"expectedVersion\":0,\"newValue\":\"value\"}",
            "{\"expectedVersion\":-1,\"newValue\":\"value\"}",
            "{\"expectedVersion\":1.5,\"newValue\":\"value\"}",
            "{\"expectedVersion\":\"1\",\"newValue\":\"value\"}",
            "{\"expectedVersion\":9223372036854775808,\"newValue\":\"value\"}",
            "{\"expectedVersion\":1,\"newValue\":null}",
            "{\"expectedVersion\":1,\"newValue\":{\"nested\":\"value\"}}"})
    void invalidCasInputsAreBadRequestsWithoutVersionOrLogChanges(String body) throws Exception {
        http.perform(post("/api/kvstore/key/cas").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("InvalidKvRequestException"));
        unchanged();
    }

    @ParameterizedTest
    @ValueSource(strings = {"0", "-1", "33", "2147483647", "2147483648", "9223372036854775807", "9223372036854775808", "1.5", "1.0", "\"8\"", "null", "true", "{}"})
    void invalidRaceCountsAreRejectedBeforeSeedingOrStartingWorkers(String count) throws Exception {
        http.perform(post("/api/kvstore/sim/cas-race").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"workerCount\":" + count + "}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("InvalidKvRequestException"));
        unchanged();
    }

    @ParameterizedTest
    @ValueSource(strings = {"null", "", "[]", "{broken"})
    void malformedOrMissingBodiesUseTheSharedFrameworkErrorContract(String body) throws Exception {
        http.perform(put("/api/kvstore/key").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.code").value("BAD_REQUEST"));
        unchanged();
    }

    @Test
    void emptyStringValuesAndNullOrOmittedTtlRoundTripWithoutCoercion() throws Exception {
        for (String base : new String[]{"/api/kvstore/", "/api/kvstore/sim/"}) {
            http.perform(put(base + "empty").contentType(MediaType.APPLICATION_JSON)
                    .content("{\"value\":\"\",\"ttlSeconds\":null}")).andExpect(status().isOk());
            http.perform(put(base + "plain").contentType(MediaType.APPLICATION_JSON)
                    .content("{\"value\":\"  whitespace stays  \"}")).andExpect(status().isOk());
        }
        assertEquals("", service.get("empty").getValue());
        assertNull(service.get("empty").getExpiresAtEpoch());
        assertEquals("  whitespace stays  ", service.get("plain").getValue());
        var entries = json.valueToTree(service.getSimSnapshots().get("entries"));
        assertEquals("", entries.get("empty").get("value").asText());
        assertTrue(entries.get("empty").get("expiresAtEpoch").isNull());
        http.perform(post("/api/kvstore/key/cas").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"expectedVersion\":1,\"newValue\":\"\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.value").value(""))
                .andExpect(jsonPath("$.version").value(2));
    }

    @Test
    void positiveTtlUsesSecondsAndCasRetainsTheRecordedExpiry() throws Exception {
        long earliest = System.currentTimeMillis() + 60_000;
        String body = http.perform(put("/api/kvstore/timed").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"value\":\"timed\",\"ttlSeconds\":60}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        long expiry = json.readTree(body).get("expiresAtEpoch").asLong();
        assertTrue(expiry >= earliest && expiry <= System.currentTimeMillis() + 60_000);
        http.perform(post("/api/kvstore/timed/cas").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"expectedVersion\":1,\"newValue\":\"changed\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.expiresAtEpoch").value(expiry));
    }

    @Test
    void omittedRaceCountUsesEightAndOneWorkerIsAlsoAValidBoundedExperiment() throws Exception {
        http.perform(post("/api/kvstore/sim/cas-race").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.raceResult.workers").value(8))
                .andExpect(jsonPath("$.raceResult.won").value(1)).andExpect(jsonPath("$.raceResult.lost").value(7));
        http.perform(post("/api/kvstore/sim/cas-race").contentType(MediaType.APPLICATION_JSON).content("{\"workerCount\":1}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.raceResult.workers").value(1))
                .andExpect(jsonPath("$.raceResult.won").value(1)).andExpect(jsonPath("$.raceResult.lost").value(0));
    }

    @Test
    void theMaximumWorkerCountRunsTheActualRaceWithExactlyOneWinner() throws Exception {
        http.perform(post("/api/kvstore/sim/cas-race").contentType(MediaType.APPLICATION_JSON).content("{\"workerCount\":32}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.raceResult.workers").value(32))
                .andExpect(jsonPath("$.raceResult.won").value(1)).andExpect(jsonPath("$.raceResult.lost").value(31));
        assertEquals("seed", service.get("key").getValue(), "the bounded sandbox race cannot touch live data");
    }

    @Test
    void serviceRejectsNullKeysAndOutOfRangeWorkerCountsWithoutStateChanges() {
        assertThrows(InvalidKvRequestException.class, () -> service.set(null, "value", null));
        assertThrows(InvalidKvRequestException.class, () -> service.get(null));
        assertThrows(InvalidKvRequestException.class, () -> service.delete(null));
        assertThrows(InvalidKvRequestException.class, () -> service.cas(null, 1, "value"));
        assertThrows(InvalidKvRequestException.class, () -> service.simSet(null, "value", null));
        assertThrows(InvalidKvRequestException.class, () -> service.simGet(null));
        assertThrows(InvalidKvRequestException.class, () -> service.simCasRace(0));
        assertThrows(InvalidKvRequestException.class, () -> service.simCasRace(33));
        assertThrows(InvalidKvRequestException.class, () -> service.simCasRace(Long.MAX_VALUE));
        unchanged();
    }

    @ParameterizedTest
    @ValueSource(longs = {0, -1, Long.MAX_VALUE})
    void directServiceAndRepositoryTtlValidationCannotBeBypassed(long ttl) {
        assertThrows(InvalidKvRequestException.class, () -> service.set("key", "rejected", ttl));
        assertThrows(InvalidKvRequestException.class, () -> service.simSet("key", "rejected", ttl));
        assertThrows(InvalidKvRequestException.class, () -> repository.set("key", "rejected", ttl));
        unchanged();
    }

    @ParameterizedTest
    @ValueSource(strings = {"", " ", "\t"})
    void serviceRejectsBlankKeysForEveryPublicKeyOperation(String key) {
        assertThrows(DomainException.class, () -> service.set(key, "value", null));
        assertThrows(DomainException.class, () -> service.get(key));
        assertThrows(DomainException.class, () -> service.delete(key));
        assertThrows(DomainException.class, () -> service.cas(key, 1, "value"));
        assertThrows(DomainException.class, () -> service.simSet(key, "value", null));
        assertThrows(DomainException.class, () -> service.simGet(key));
        unchanged();
    }

    @Test
    void serviceRejectsNullValuesAndNonPositiveVersionsBeforeAnyMutation() {
        assertThrows(DomainException.class, () -> service.set("key", null, null));
        assertThrows(DomainException.class, () -> service.simSet("key", null, null));
        assertThrows(DomainException.class, () -> service.cas("key", 1, null));
        assertThrows(DomainException.class, () -> service.cas("key", 0, "rejected"));
        assertThrows(DomainException.class, () -> service.cas("key", -1, "rejected"));
        unchanged();
    }

    @Test
    void overflowingRepositoryExpiryCannotPublishAValueOrAppendACommand() {
        assertThrows(DomainException.class, () -> repository.set("key", "rejected", Long.MAX_VALUE));
        unchanged();
    }

    private void unchanged() {
        assertEquals("seed", service.get("key").getValue());
        assertEquals(1, service.get("key").getVersion());
        assertEquals(1, repository.snapshot().commands().size());
        assertEquals(before, snapshotState(), "a rejected request cannot seed keys, append commands or log events");
    }

    private JsonNode snapshotState() {
        var snapshot = (com.fasterxml.jackson.databind.node.ObjectNode) json.valueToTree(service.getSimSnapshots());
        snapshot.remove("snapshotAtEpoch"); // the capture time can advance without changing any store state
        return snapshot;
    }
}
