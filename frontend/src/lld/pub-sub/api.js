import { apiFetch } from '../../utils/api';

export function createTopic(name) {
  return apiFetch('/pubsub/topic', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export function createSubscriber(id, name) {
  return apiFetch('/pubsub/subscriber', {
    method: 'POST',
    body: JSON.stringify({ id, name }),
  });
}

export function subscribe(topicName, subscriberId) {
  return apiFetch('/pubsub/subscribe', {
    method: 'POST',
    body: JSON.stringify({ topicName, subscriberId }),
  });
}

export function publish(topicName, publisherName, content) {
  return apiFetch('/pubsub/publish', {
    method: 'POST',
    body: JSON.stringify({ topicName, publisherName, content }),
  });
}

export function getTopics() {
  return apiFetch('/pubsub/topics');
}

export function getSubscribers() {
  return apiFetch('/pubsub/subscribers');
}

export function poll(subscriberId) {
  return apiFetch(`/pubsub/poll/${subscriberId}`);
}
