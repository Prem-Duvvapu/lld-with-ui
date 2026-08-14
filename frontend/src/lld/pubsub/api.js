import { apiFetch } from '../../utils/api';

export function getTopics() {
  return apiFetch('/pubsub/topics');
}

export function createTopic(name) {
  return apiFetch('/pubsub/topics', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export function subscribe(topicName, subscriberId, subscriberName, subscriberType, capacity, delayMs) {
  return apiFetch('/pubsub/subscribe', {
    method: 'POST',
    body: JSON.stringify({ topicName, subscriberId, subscriberName, subscriberType, capacity, delayMs }),
  });
}

export function unsubscribe(topicName, subscriberId) {
  return apiFetch('/pubsub/unsubscribe', {
    method: 'POST',
    body: JSON.stringify({ topicName, subscriberId }),
  });
}

export function publish(topicName, payload, publisherId) {
  return apiFetch('/pubsub/publish', {
    method: 'POST',
    body: JSON.stringify({ topicName, payload, publisherId }),
  });
}

export function getSubscriberMessages(topicName, subscriberId) {
  return apiFetch(`/pubsub/subscribers/${subscriberId}/messages?topicName=${encodeURIComponent(topicName)}`);
}

// Simulation Endpoints
export function simReset() {
  return apiFetch('/pubsub/sim/reset', { method: 'POST' });
}

export function simCreateTopic(name) {
  return apiFetch('/pubsub/sim/create-topic', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export function simSubscribe(topicName, subscriberId, subscriberName, type, capacity, delayMs) {
  return apiFetch('/pubsub/sim/subscribe', {
    method: 'POST',
    body: JSON.stringify({ topicName, subscriberId, subscriberName, type, capacity, delayMs }),
  });
}

export function simUnsubscribe(topicName, subscriberId) {
  return apiFetch('/pubsub/sim/unsubscribe', {
    method: 'POST',
    body: JSON.stringify({ topicName, subscriberId }),
  });
}

export function simPublish(topicName, payload, publisherId) {
  return apiFetch('/pubsub/sim/publish', {
    method: 'POST',
    body: JSON.stringify({ topicName, payload, publisherId }),
  });
}

export function simGetEvents() {
  return apiFetch('/pubsub/sim/events');
}

export function simGetSnapshots() {
  return apiFetch('/pubsub/sim/snapshots');
}
