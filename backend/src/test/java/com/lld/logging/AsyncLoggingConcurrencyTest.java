package com.lld.logging;

import com.lld.logging.appender.AsyncLogDispatcher;
import com.lld.logging.appender.ConsoleAppender;
import com.lld.logging.appender.LogAppender;
import com.lld.logging.formatter.SimpleTextFormatter;
import com.lld.logging.model.LogLevel;
import com.lld.logging.model.LogMessage;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Logging Framework: Async & Concurrency Tests")
public class AsyncLoggingConcurrencyTest {

    @Test
    @DisplayName("AsyncLogDispatcher processes 50 concurrent logs across 10 threads without dropping under capacity")
    void testAsyncDispatcherMultiThreaded() throws InterruptedException {
        AsyncLogDispatcher dispatcher = new AsyncLogDispatcher(100); // capacity 100
        ConsoleAppender consoleAppender = new ConsoleAppender("ConsoleSink", true);
        List<LogAppender> appenders = List.of(consoleAppender);
        SimpleTextFormatter formatter = new SimpleTextFormatter();

        int threadCount = 10;
        int logsPerThread = 5;
        int totalLogs = threadCount * logsPerThread;

        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(totalLogs);

        for (int i = 0; i < totalLogs; i++) {
            final int index = i;
            executor.submit(() -> {
                try {
                    startLatch.await();
                    LogMessage msg = LogMessage.builder()
                            .id((long) index)
                            .level(LogLevel.INFO)
                            .loggerName("ConcurrentLogger")
                            .message("Concurrent msg " + index)
                            .threadName(Thread.currentThread().getName())
                            .timestamp(LocalDateTime.now())
                            .build();
                    dispatcher.dispatch(msg, appenders, formatter);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        startLatch.countDown();
        boolean completed = doneLatch.await(5, TimeUnit.SECONDS);
        executor.shutdown();

        assertTrue(completed, "All dispatch threads should finish");

        // Allow worker thread to drain queue
        Thread.sleep(300);

        assertEquals(totalLogs, consoleAppender.getAppenderLogs().size(), "Async worker should drain all 50 messages to appender");
        assertEquals(0, dispatcher.getDroppedCount(), "Zero logs dropped when queue capacity is sufficient");
        dispatcher.stop();
    }

    @Test
    @DisplayName("AsyncLogDispatcher records dropped logs when queue capacity overflows")
    void testAsyncDispatcherQueueOverflow() throws InterruptedException {
        // Small capacity = 3
        AsyncLogDispatcher dispatcher = new AsyncLogDispatcher(3);
        ConsoleAppender appender = new ConsoleAppender("Sink", false); // disabled to block draining instantly
        SimpleTextFormatter formatter = new SimpleTextFormatter();

        List<LogAppender> appenders = List.of(appender);

        // Emit 10 messages rapidly
        for (int i = 0; i < 10; i++) {
            LogMessage msg = LogMessage.builder()
                    .id((long) i)
                    .level(LogLevel.ERROR)
                    .loggerName("Burst")
                    .message("Burst message " + i)
                    .timestamp(LocalDateTime.now())
                    .build();
            dispatcher.dispatch(msg, appenders, formatter);
        }

        // At least some logs should be dropped due to small queue capacity
        assertTrue(dispatcher.getDroppedCount() > 0, "Dropped logs counter should be > 0 when capacity is exceeded");
        dispatcher.stop();
    }
}
