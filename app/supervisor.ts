import { spawn, type ChildProcess } from 'child_process';

// Use the current Node.js executable + tsx's ESM loader so we don't depend
// on tsx being on PATH (it's a local devDependency).
const APP_CMD  = process.execPath;
const APP_ARGS = ['--import', 'tsx/esm', 'app.ts'];

const FAST_RESTART_WINDOW_MS = 10_000;
const FAST_RESTART_THRESHOLD = 3;
const SLOW_RESTART_DELAY_MS  = 10_000;
const FAST_RESTART_DELAY_MS  = 1_000;

let child: ChildProcess | null = null;
let recentRestarts = 0;
let lastRestartTime = 0;

function start(): void {
    const now = Date.now();

    if (now - lastRestartTime < FAST_RESTART_WINDOW_MS) {
        recentRestarts++;
    } else {
        recentRestarts = 0;
    }
    lastRestartTime = now;

    const delay = recentRestarts >= FAST_RESTART_THRESHOLD ? SLOW_RESTART_DELAY_MS : FAST_RESTART_DELAY_MS;

    if (recentRestarts >= FAST_RESTART_THRESHOLD) {
        console.log(`[supervisor] Restarted ${recentRestarts} times quickly — backing off ${SLOW_RESTART_DELAY_MS / 1000}s`);
    }

    setTimeout(() => {
        console.log('[supervisor] Starting app...');
        child = spawn(APP_CMD, APP_ARGS, { stdio: 'inherit' });

        child.on('exit', (code, signal) => {
            console.log(`[supervisor] App exited (code=${code} signal=${signal}), restarting...`);
            child = null;
            start();
        });

        child.on('error', (err) => {
            console.error('[supervisor] Failed to start app:', err);
            child = null;
            start();
        });
    }, recentRestarts === 0 ? 0 : delay);
}

function shutdown(signal: NodeJS.Signals): void {
    console.log(`[supervisor] Received ${signal}, shutting down...`);
    if (child) {
        child.removeAllListeners('exit');
        child.kill(signal);
        child.on('exit', () => process.exit(0));
        setTimeout(() => process.exit(0), 5000).unref();
    } else {
        process.exit(0);
    }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

start();
