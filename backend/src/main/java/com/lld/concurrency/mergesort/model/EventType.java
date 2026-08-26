package com.lld.concurrency.mergesort.model;

/**
 * Every meaningful thing that happens inside {@link ParallelMergeSorter.SortTask}
 * during a run.
 *
 * <p>Recorded in order by {@link TraceRecorder} so the frontend can replay the
 * genuine recursive divide-and-conquer execution — including which real JVM thread
 * did each half — instead of animating a canned example.
 */
public enum EventType {
    /** A task with lo &lt; hi is about to split into a left and a right half around mid. */
    PARTITION,
    /** A task with a 0/1-length range (lo &gt;= hi) has nothing to sort and returns immediately. */
    BASE_CASE,
    /** The right half was genuinely handed to {@code ForkJoinTask.fork()} so it may run on a different worker thread while the left half runs on this one. */
    FORK_RIGHT,
    /** Both halves are sorted; about to merge them into the shared scratch buffer. */
    MERGE_START,
    /** One value was written into the scratch buffer during a merge — the fact the frontend animates cell-by-cell. */
    MERGE_WRITE,
    /** The merged range has been copied back from the scratch buffer into the live array. */
    MERGE_COMPLETE
}
