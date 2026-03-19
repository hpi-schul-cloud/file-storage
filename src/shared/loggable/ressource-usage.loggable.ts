import os from 'os';
import { Loggable, LogMessage, LogMessageData } from '@infra/logger';

export class RessourceUsage implements Loggable {
    private data:LogMessageData;
    constructor(readonly message?:string, params: Record<string, unknown> = {}) {
        // @ts-ignore undocumented API, but widely used in the ecosystem for debugging purposes
        const openHandles = typeof process._getActiveHandles === 'function' ? process._getActiveHandles().length : undefined;
        const mem = process.memoryUsage();
        const cpu = process.cpuUsage();
        this.data = {
            timestamp: new Date().toISOString(),
            params: JSON.stringify(params),
            memory: {
                heapUsed: this.toMB(mem.heapUsed),
                heapTotal: this.toMB(mem.heapTotal),
                rss: this.toMB(mem.rss),
            },
            cpu: {
                user: cpu.user,
                system: cpu.system,
            },
            openHandles,
            loadavg: JSON.stringify(os.loadavg()),
            freemem: this.toMB(os.freemem()),
            totalmem: this.toMB(os.totalmem()),
            cpus: os.cpus().length,
        };
    }

    private toMB = (bytes: number) => (bytes / 1024 / 1024).toFixed(2) + ' MB';
    public getLogMessage(): LogMessage {
        return {
            message: this.message || 'Ressource usage log',
            data: this.data,
        };
    }
}