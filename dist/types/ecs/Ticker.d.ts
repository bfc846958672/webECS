export declare class Ticker {
    private lastTime;
    private running;
    private callbacks;
    constructor();
    add(callback: (dt: number) => void): void;
    remove(callback: (dt: number) => void): void;
    start(): void;
    stop(): void;
    private loop;
}
