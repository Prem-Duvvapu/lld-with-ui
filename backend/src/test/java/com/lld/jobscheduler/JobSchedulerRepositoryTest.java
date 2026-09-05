package com.lld.jobscheduler;

import com.lld.jobscheduler.exception.JobNotFoundException;
import com.lld.jobscheduler.model.Job;
import com.lld.jobscheduler.model.JobStatus;
import com.lld.jobscheduler.repository.JobSchedulerRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

import static org.junit.jupiter.api.Assertions.*;

class JobSchedulerRepositoryTest {

    private JobSchedulerRepository repository;

    @BeforeEach
    void setUp() {
        repository = new JobSchedulerRepository();
    }

    private Job job(String id) {
        return Job.builder().id(id).name(id).status(JobStatus.SCHEDULED).nextExecutionTime(Instant.now()).build();
    }

    @Test
    void savesAndFindsById() {
        Job saved = repository.save(job("J-1"));
        assertEquals(saved, repository.findById("J-1"));
        assertEquals(saved, repository.find("J-1").orElseThrow());
    }

    @Test
    void findByIdReturnsNullWhenAbsent_findReturnsEmptyOptional() {
        assertNull(repository.findById("nope"));
        assertEquals(Optional.empty(), repository.find("nope"));
    }

    @Test
    void getOrThrowThrowsJobNotFoundWhenAbsent() {
        assertThrows(JobNotFoundException.class, () -> repository.getOrThrow("nope"));
    }

    @Test
    void findAllReturnsAllSavedJobs_andIsASnapshotCopy() {
        repository.save(job("J-1"));
        repository.save(job("J-2"));
        List<Job> all = repository.findAll();
        assertEquals(2, all.size());

        all.clear(); // mutating the returned list must not affect the repository
        assertEquals(2, repository.findAll().size());
    }

    @Test
    void deleteRemovesAndReportsWhetherSomethingWasThere() {
        repository.save(job("J-1"));
        assertTrue(repository.delete("J-1"));
        assertFalse(repository.delete("J-1"));
        assertNull(repository.findById("J-1"));
    }

    @Test
    void clearWipesEverythingAndResetsIdSequence() {
        repository.save(job(repository.nextId()));
        repository.save(job(repository.nextId()));
        repository.clear();
        assertEquals(0, repository.size());
        assertEquals("JOB-1", repository.nextId());
    }

    @Test
    void nextIdIsSequential() {
        String first = repository.nextId();
        String second = repository.nextId();
        assertNotEquals(first, second);
        assertEquals("JOB-1", first);
        assertEquals("JOB-2", second);
    }

    @Test
    void backingStoreIsGenuinelyConcurrentHashMap() throws NoSuchFieldException, IllegalAccessException {
        var field = JobSchedulerRepository.class.getDeclaredField("jobs");
        field.setAccessible(true);
        assertInstanceOf(ConcurrentHashMap.class, field.get(repository));
    }
}
