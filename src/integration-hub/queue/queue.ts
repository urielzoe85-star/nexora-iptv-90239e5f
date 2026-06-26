// Asynchronous job interface. v1.3 ships only an in-memory driver useful
// for tests/dev. A production driver (Supabase pgmq, Redis, SQS…) will
// implement QueueDriver and replace the default at bootstrap.

export type QueueName =
  | "notifications"
  | "payments"
  | "sync"
  | "iptv_provisioning"
  | "ai"
  | "webhooks";

export interface QueueJob<T = unknown> {
  id: string;
  queue: QueueName;
  payload: T;
  attempts: number;
  enqueuedAt: string;
}

export interface QueueDriver {
  readonly id: string;
  enqueue<T>(queue: QueueName, payload: T): Promise<QueueJob<T>>;
  read<T>(queue: QueueName, batchSize?: number): Promise<QueueJob<T>[]>;
  ack(queue: QueueName, jobId: string): Promise<void>;
}

class InMemoryQueueDriver implements QueueDriver {
  readonly id = "in-memory";
  private readonly queues = new Map<QueueName, QueueJob<unknown>[]>();

  async enqueue<T>(queue: QueueName, payload: T): Promise<QueueJob<T>> {
    const job: QueueJob<T> = {
      id: (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`),
      queue, payload, attempts: 0, enqueuedAt: new Date().toISOString(),
    };
    const arr = (this.queues.get(queue) as QueueJob<T>[] | undefined) ?? [];
    arr.push(job);
    this.queues.set(queue, arr as QueueJob<unknown>[]);
    return job;
  }
  async read<T>(queue: QueueName, batchSize = 10): Promise<QueueJob<T>[]> {
    const arr = (this.queues.get(queue) ?? []) as QueueJob<T>[];
    return arr.slice(0, batchSize);
  }
  async ack(queue: QueueName, jobId: string): Promise<void> {
    const arr = this.queues.get(queue);
    if (!arr) return;
    this.queues.set(queue, arr.filter((j) => j.id !== jobId));
  }
}

let activeDriver: QueueDriver = new InMemoryQueueDriver();

export const queue = {
  driver(): QueueDriver { return activeDriver; },
  setDriver(driver: QueueDriver): void { activeDriver = driver; },
  enqueue<T>(q: QueueName, payload: T) { return activeDriver.enqueue(q, payload); },
  read<T>(q: QueueName, batchSize?: number) { return activeDriver.read<T>(q, batchSize); },
  ack(q: QueueName, jobId: string) { return activeDriver.ack(q, jobId); },
};