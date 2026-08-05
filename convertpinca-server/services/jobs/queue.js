import { getQueueClient, localQueue } from '../../config/queue.js';

const QUEUE_KEY = 'jobs:queue';

/**
 * Pushes a job payload onto the queue.
 * Uses Redis/Valkey LPUSH if available, otherwise in-memory queue.
 * @param {object} payload - { jobId, sourceUrl, templateId }
 */
export async function pushJob(payload) {
  const { redisClient, isConnected } = await getQueueClient();
  const message = JSON.stringify(payload);

  if (isConnected && redisClient) {
    await redisClient.lPush(QUEUE_KEY, message);
  } else {
    // In-memory fallback
    localQueue.unshift(message);
  }
}

/**
 * Blocking pop — waits for a job from the queue.
 * Returns parsed job payload object.
 * @param {number} timeout - Block timeout in seconds (0 = indefinite)
 * @returns {Promise<object|null>}
 */
export async function popJob(timeout = 0) {
  const { redisClient, isConnected } = await getQueueClient();

  if (isConnected && redisClient) {
    const result = await redisClient.brPop(QUEUE_KEY, timeout);
    if (!result) return null;
    return JSON.parse(result.element);
  }

  // In-memory fallback with polling
  return new Promise((resolve) => {
    const poll = setInterval(() => {
      if (localQueue.length > 0) {
        clearInterval(poll);
        resolve(JSON.parse(localQueue.pop()));
      }
    }, 500);
  });
}
