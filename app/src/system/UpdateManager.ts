import { exec } from 'child_process';
import { rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import pkg from '../../package.json' with { type: 'json' };
import { Logger } from '../logging/Logger';
import SystemInfoUtil from './SystemInfoUtil';
import type { UpdateStatus, GitHubRelease, GitHubBranch } from '../types/UpdateTypes';

// Parse owner/repo from the repository URL in package.json.
// Handles both https://github.com/owner/repo and git@github.com:owner/repo forms.
function parseGitHubRepo(url: string): { owner: string; repo: string } | null {
    const m = url.match(/github\.com[/:]([^/]+)\/([^/.]+)/);
    if (!m) return null;
    return { owner: m[1], repo: m[2] };
}

const repoInfo = parseGitHubRepo(pkg.repository?.url ?? '');
const GH_API   = repoInfo
    ? `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}`
    : null;

// Semver-aware comparison: returns true if tag `a` is strictly older than tag `b`.
// Tags are expected in vX.Y.Z form; strips git-describe suffixes (e.g. v3.0.0-14-gabcdef).
// Non-conforming tags are not filtered out / treated as not-older.
function isOlderThan(a: string, b: string): boolean {
    const parse = (t: string) => t.replace(/^v/, '').split('-')[0].split('.').map(Number);
    const [aMaj, aMin, aPat] = parse(a);
    const [bMaj, bMin, bPat] = parse(b);
    if (isNaN(aMaj) || isNaN(bMaj)) return false;
    if (aMaj !== bMaj) return aMaj < bMaj;
    if (aMin !== bMin) return aMin < bMin;
    return aPat < bPat;
}

// Oldest release that includes the self-updater. Releases before this tag
// are hidden from the update UI — updating to them would break self-update.
const MIN_UPDATABLE_TAG = 'v3.0.0';
const MIN_CHECK_INTERVAL_MS = 10 * 60 * 1000; // 10 MINS
const UPDATE_HTTP_TIMEOUT_MS = 15 * 1000; // 15 SECS

export class UpdateManager {

    private logger      = new Logger(['System', 'Update']);
    private releases:    GitHubRelease[] = [];
    private branches:    GitHubBranch[]  = [];
    private lastChecked: number | null   = null;
    private updating    = false;
    private updateError: string | null   = null;
    private checking: Promise<UpdateStatus> | null = null;
    
    getStatus(): UpdateStatus {
        const current = SystemInfoUtil.getFirmwareVersion();
        const hasUpdate = this.releases
            .filter(r => !r.prerelease)
            .some(r => isOlderThan(current, r.tag));
        return {
            current,
            releases:    this.releases,
            branches:    this.branches,
            lastChecked: this.lastChecked,
            updating:    this.updating,
            updateError: this.updateError,
            hasUpdate,
        };
    }

    async checkForUpdates(): Promise<UpdateStatus> {
        if (this.checking) 
            return this.checking;

        if (this.lastChecked && Date.now() < this.lastChecked + MIN_CHECK_INTERVAL_MS) {
            this.logger.info('Checked for updates recently, returning cached status.');
            return this.getStatus();
        }

        this.checking = this._checkForUpdatesInternal();  
        
        try {
            return await this.checking;
        }
        finally {
            this.checking = null;
        }
    }

    private async _checkForUpdatesInternal(): Promise<UpdateStatus> {

        this.logger.info('Checking for updates...');
        this.updateError = null;

        if (!GH_API) {
            this.updateError = 'No GitHub repository URL found in package.json';
            this.logger.error(this.updateError);
            return this.getStatus();
        }

        try {
           
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), UPDATE_HTTP_TIMEOUT_MS);
            timeoutId.unref();

            let releasesRes: Response;
            let branchesRes: Response;

            try {
                [releasesRes, branchesRes] = await Promise.all([
                    fetch(`${GH_API}/releases`, { 
                        headers: {
                            'User-Agent': 'Beacon-Tally',
                            'Accept': 'application/vnd.github+json',
                        },
                        signal: controller.signal 
                    }),
                    fetch(`${GH_API}/branches`, { 
                        headers: {
                            'User-Agent': 'Beacon-Tally',
                            'Accept': 'application/vnd.github+json',
                        },
                        signal: controller.signal 
                    }),
                ]);

            } finally {
                clearTimeout(timeoutId);
            }


            if (!releasesRes.ok) throw new Error(`GitHub releases API error: ${releasesRes.status}`);
            if (!branchesRes.ok) throw new Error(`GitHub branches API error: ${branchesRes.status}`);

            const rawReleases = await releasesRes.json() as Array<Record<string, unknown>>;
            const rawBranches = await branchesRes.json() as Array<Record<string, unknown>>;

            this.releases = rawReleases
                .map(r => ({
                    tag:         r['tag_name']    as string,
                    name:        (r['name'] as string) || (r['tag_name'] as string),
                    publishedAt: r['published_at'] as string,
                    prerelease:  r['prerelease']  as boolean,
                }))
                .filter(r => !isOlderThan(r.tag, MIN_UPDATABLE_TAG));

            this.branches = rawBranches.map(b => ({
                name: b['name'] as string,
            }));

            this.lastChecked = Date.now();
            this.logger.info(`Found ${this.releases.length} release(s) and ${this.branches.length} branch(es).`);
        } catch (err) {
            this.updateError = (err as Error).message;
            this.logger.error('Failed to check for updates:', err);
        }

        return this.getStatus();
    }

    async applyUpdate(ref: string, type: 'release' | 'branch'): Promise<void> {
        if (this.updating) {
            this.logger.warn('Update already in progress, ignoring request.');
            return;
        }

        this.updating    = true;
        this.updateError = null;
        this.logger.info(`Applying update: ${type} "${ref}"...`);

        try {
            await this._exec('git fetch origin');

            if (type === 'branch') {
                await this._exec(`git checkout -B ${ref} origin/${ref}`);
            } else {
                await this._exec(`git checkout ${ref}`);
            }

            await this._exec('yarn install');

            // Clear Vite's pre-bundle cache so the next startup always does a
            // clean rebuild. Without this, Vite serves stale pre-bundled deps
            // after package changes, causing module fetches to fail on first boot.
            const viteCache = join(process.cwd(), 'ui', '.vite');
            if (existsSync(viteCache)) {
                rmSync(viteCache, { recursive: true, force: true });
                this.logger.info('Cleared Vite dep cache.');
            }

            if (process.env.NODE_ENV === 'production') {
                await this._exec('yarn build');
            }

        } catch (err) {
            this.updateError = (err as Error).message;
            this.updating    = false;
            this.logger.error('Update failed:', err);
            throw err;
        }

        // process.exit(0);
        this.logger.info('Update complete, triggering graceful restart...');
        setTimeout(() => {
            process.kill(process.pid, 'SIGTERM');
        }, 500).unref();
    }

    private _exec(cmd: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.logger.info(`${cmd}`);
            exec(cmd, { cwd: process.cwd() }, (err, _stdout, stderr) => {
                if (err) {
                    reject(new Error(`Command failed: ${cmd}\n${stderr || err.message}`));
                } else {
                    resolve();
                }
            });
        });
    }
}
