// Lightweight in-process monitoring sink. Real backends (Datadog, OTLP,
// Sentry) plug in by implementing MetricsRecorder + replacing the
// exported `metrics` instance at bootstrap.

export interface MetricEvent {
  connectorId?: string;
  operation: string;
  status: "success" | "failure";
  durationMs: number;
  errorKind?: string;
  meta?: Record<string, unknown>;
}

export interface MetricsRecorder {
  record(event: MetricEvent): void;
  snapshot(): MetricEvent[];
}

class InMemoryMetricsRecorder implements MetricsRecorder {
  // Bounded ring buffer so a long-running process never grows unbounded.
  private readonly buffer: MetricEvent[] = [];
  private readonly capacity = 500;

  record(event: MetricEvent): void {
    this.buffer.push(event);
    if (this.buffer.length > this.capacity) this.buffer.shift();
  }
  snapshot(): MetricEvent[] {
    return [...this.buffer];
  }
}

export const metrics: MetricsRecorder = new InMemoryMetricsRecorder();