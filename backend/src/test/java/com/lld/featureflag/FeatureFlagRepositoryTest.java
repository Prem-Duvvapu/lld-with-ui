package com.lld.featureflag;

import com.lld.featureflag.model.FeatureFlag;
import com.lld.featureflag.repository.FeatureFlagRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("FeatureFlagRepository — storage, lookup and absent-key behaviour")
class FeatureFlagRepositoryTest {

    private FeatureFlagRepository repository;

    @BeforeEach
    void setUp() {
        repository = new FeatureFlagRepository();
    }

    private FeatureFlag flag(String key) {
        return FeatureFlag.builder().key(key).description("desc").enabled(false).build();
    }

    @Test
    @DisplayName("save assigns an id on first save and stores the flag under its key")
    void saveAssignsIdAndStores() {
        FeatureFlag saved = repository.save(flag("f1"));
        assertNotNull(saved.getId());
        assertEquals("f1", repository.findByKey("f1").getKey());
    }

    @Test
    @DisplayName("find on an absent key returns null, not an exception")
    void findAbsentKeyReturnsNull() {
        assertNull(repository.findByKey("does-not-exist"));
        assertNull(repository.findByKey(null));
    }

    @Test
    @DisplayName("existsByKey reflects exactly the stored keys")
    void existsByKeyReflectsStorage() {
        repository.save(flag("f1"));
        assertTrue(repository.existsByKey("f1"));
        assertFalse(repository.existsByKey("f2"));
        assertFalse(repository.existsByKey(null));
    }

    @Test
    @DisplayName("findAll returns every stored flag and nothing else")
    void findAllReturnsEveryFlag() {
        repository.save(flag("f1"));
        repository.save(flag("f2"));
        List<FeatureFlag> all = repository.findAll();
        assertEquals(2, all.size());
        assertTrue(all.stream().anyMatch(f -> f.getKey().equals("f1")));
        assertTrue(all.stream().anyMatch(f -> f.getKey().equals("f2")));
    }

    @Test
    @DisplayName("clear empties the store and resets id assignment")
    void clearEmptiesStore() {
        FeatureFlag first = repository.save(flag("f1"));
        repository.clear();
        assertTrue(repository.findAll().isEmpty());
        assertNull(repository.findByKey("f1"));

        FeatureFlag second = repository.save(flag("f1-again"));
        assertEquals(first.getId(), second.getId(), "id counter must reset after clear, matching this repo's other repositories");
    }

    @Test
    @DisplayName("save on an existing key overwrites rather than duplicating")
    void saveOnExistingKeyOverwrites() {
        repository.save(flag("f1"));
        FeatureFlag updated = flag("f1");
        updated.setDescription("new description");
        repository.save(updated);

        assertEquals(1, repository.findAll().size());
        assertEquals("new description", repository.findByKey("f1").getDescription());
    }

    @Test
    @DisplayName("the backing store is genuinely a ConcurrentHashMap, not a plain HashMap")
    void backingStoreIsConcurrentHashMap() throws Exception {
        Field field = FeatureFlagRepository.class.getDeclaredField("flagsByKey");
        assertFalse(Modifier.isStatic(field.getModifiers()));
        field.setAccessible(true);
        Object value = field.get(repository);
        assertInstanceOf(ConcurrentHashMap.class, value, "flagsByKey must be a ConcurrentHashMap for safe concurrent evaluate() traffic");
    }
}
