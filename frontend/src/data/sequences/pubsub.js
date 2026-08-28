// Sequence diagram content for pubsub.
// Grounded directly in Topic#publish / SubscriberWorker#enqueue and
// PubSubConcurrencyTest#permanentlyStuckSubscriber_doesNotBlockDeliveryToFastSubscriberOnSameTopic
// + #queueFull_deterministicallyProvoked_rejectsOnlyOnceCapacityIsExceeded: a topic with one fast
// and one slow subscriber, each on its own dedicated worker thread, shows why a subscriber that
// can't keep up never stalls the rest of the topic — and exactly how its bounded queue eventually
// rejects rather than growing forever.
export default {
  title: 'Pub/Sub — One Slow Subscriber Never Blocks a Fast One (Dedicated Worker Threads + Bounded Queue)',
  description:
    'A class diagram shows that Topic holds a list of SubscriberWorker, and SubscriberWorker drains a bounded queue — it does not show what happens when one subscriber cannot keep up while another can. This sequence follows a burst of publishes to a topic with a fast PrintSubscriber and a permanently-stuck subscriber sharing the same Topic#publish() call: because each subscriber has its own thread and its own ArrayBlockingQueue, the fast one keeps receiving every message on time while the slow one\'s queue fills and starts rejecting — never the other way around.',
  flows: [
    {
      id: 'slow-subscriber-backpressure-vs-fast-delivery',
      label: 'A burst of publishes: the fast subscriber keeps up, the slow one saturates and rejects',
      description:
        'Topic "alerts" has two active subscribers: fast-1 (instant PrintSubscriber) and slow-1 (capacity=3, permanently stuck mid-consume() — the deterministic stand-in for SlowSubscriber under real load). publish() is called four times in quick succession from one publisher thread. Each call fans out to both workers\' queues and returns immediately — it never waits for either worker to actually drain. See PubSubConcurrencyTest.',
      participants: [
        { id: 'publisher', name: 'Publisher\n(pub-1)', kind: 'actor' },
        { id: 'broker', name: 'Broker', kind: 'component', stereotype: 'facade' },
        { id: 'topic', name: 'Topic\n("alerts")', kind: 'component' },
        { id: 'fastWorker', name: 'SubscriberWorker\n(fast-1)', kind: 'component', stereotype: 'thread' },
        { id: 'slowWorker', name: 'SubscriberWorker\n(slow-1, capacity=3)', kind: 'component', stereotype: 'thread' },
        { id: 'fastSub', name: 'fast-1\n(PrintSubscriber)', kind: 'component' },
        { id: 'slowSub', name: 'slow-1\n(stuck in consume())', kind: 'component' },
      ],
      steps: [
        { type: 'note', over: ['slowWorker', 'slowSub'], text: 'slow-1\'s worker already dequeued an earlier message and is blocked inside consume() — its queue is now empty again but its thread is unavailable to drain anything new.' },
        { from: 'publisher', to: 'broker', text: 'publish("alerts", "msg-1", "pub-1")' },
        { from: 'broker', to: 'topic', text: 'topic.publish(message)' },
        { from: 'topic', to: 'fastWorker', text: 'enqueue(msg-1)  -> true', activate: 'fastWorker' },
        { from: 'topic', to: 'slowWorker', text: 'enqueue(msg-1)  -> true  (queue: 1/3)' },
        { from: 'topic', to: 'broker', text: 'return []  (nobody rejected yet)', type: 'return' },
        { from: 'broker', to: 'publisher', text: 'return []', type: 'return' },
        { from: 'fastWorker', to: 'fastSub', text: 'consume(msg-1)  — on fast-1\'s OWN thread, instantly' },
        { from: 'fastWorker', to: 'fastWorker', text: 'deliveredCount++', deactivate: 'fastWorker' },
        { type: 'note', over: ['fastWorker'], text: 'fast-1 has already received msg-1. slow-1\'s worker thread has not moved — it is a completely separate thread, so it never had to wait its turn behind slow-1.' },
        { from: 'publisher', to: 'broker', text: 'publish("alerts", "msg-2", "pub-1")' },
        { from: 'broker', to: 'topic', text: 'topic.publish(message)' },
        { from: 'topic', to: 'fastWorker', text: 'enqueue(msg-2) -> true', activate: 'fastWorker' },
        { from: 'topic', to: 'slowWorker', text: 'enqueue(msg-2) -> true  (queue: 2/3)' },
        { from: 'fastWorker', to: 'fastSub', text: 'consume(msg-2) — delivered instantly, independent of slow-1', deactivate: 'fastWorker' },
        { from: 'publisher', to: 'broker', text: 'publish("alerts", "msg-3", "pub-1")' },
        { from: 'broker', to: 'topic', text: 'topic.publish(message)' },
        { from: 'topic', to: 'slowWorker', text: 'enqueue(msg-3) -> true  (queue: 3/3, now FULL)' },
        { from: 'publisher', to: 'broker', text: 'publish("alerts", "msg-4", "pub-1")' },
        { from: 'broker', to: 'topic', text: 'topic.publish(message)' },
        { from: 'topic', to: 'slowWorker', text: 'enqueue(msg-4) -> queue.offer() FAILS (already 3/3)',
          detail: 'ArrayBlockingQueue#offer() never blocks — it fails fast when full. SubscriberWorker#enqueue() reports this back as false and increments rejectedCount; it does not throw.' },
        { from: 'slowWorker', to: 'slowWorker', text: 'rejectedCount++' },
        { from: 'topic', to: 'broker', text: 'return ["slow-1"]  (rejected subscriber ids)', type: 'return' },
        { from: 'broker', to: 'publisher', text: 'return ["slow-1"]', type: 'return' },
        { type: 'note', over: ['publisher'], text: 'The publisher sees exactly which subscribers were backpressured and keeps going — publish() never throws and never blocked waiting on slow-1, matching the broadcast contract. A caller that needs a hard guarantee for ONE subscriber uses the separate strict Broker#publishToSubscriber(), which throws QueueFullException here instead of returning a rejected id — see SubscriberWorkerTest#enqueueOrThrow_throwsQueueFullException_whenBoundedQueueIsFull.' },
      ],
    },
  ],
};
