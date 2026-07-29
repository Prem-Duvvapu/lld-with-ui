const BASE = '/api/pubsub';

export async function createTopic(name) {
  const res = await fetch(`${BASE}/topic`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  return res.json();
}

export async function createSubscriber(id, name) {
  const res = await fetch(`${BASE}/subscriber`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, name }),
  });
  return res.json();
}

export async function subscribe(topicName, subscriberId) {
  const res = await fetch(`${BASE}/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topicName, subscriberId }),
  });
  return res.json();
}

export async function publish(topicName, publisherName, content) {
  const res = await fetch(`${BASE}/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topicName, publisherName, content }),
  });
  return res.json();
}

export async function getTopics() {
  const res = await fetch(`${BASE}/topics`);
  return res.json();
}

export async function getSubscribers() {
  const res = await fetch(`${BASE}/subscribers`);
  return res.json();
}

export async function poll(subscriberId) {
  const res = await fetch(`${BASE}/poll/${subscriberId}`);
  return res.json();
}
