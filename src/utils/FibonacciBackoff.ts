export class FibonacciBackoff {
  private readonly fibonacciSequence: number[] = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55];
  private currentBackoffIndex: number = 0;
  private updateInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly baseInterval: number,
    private readonly updateCallback: () => Promise<void>
  ) {}

  private getFibonacciBackoffMs(): number {
    const multiplier =
      this.fibonacciSequence[this.currentBackoffIndex] ||
      this.fibonacciSequence[this.fibonacciSequence.length - 1];
    return this.baseInterval * multiplier;
  }

  public handleSuccess(): void {
    if (this.currentBackoffIndex > 0) {
      this.currentBackoffIndex = 0;
      this.startUpdate(); // Restart with default interval
    }
  }

  public handleError(): void {
    this.currentBackoffIndex = Math.min(
      this.currentBackoffIndex + 1,
      this.fibonacciSequence.length - 1
    );
    this.startUpdate(this.getFibonacciBackoffMs());
  }

  public startUpdate(interval: number = this.baseInterval): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.updateInterval = setInterval(async () => {
      await this.updateCallback();
    }, interval);
  }

  public stopUpdate(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
}
