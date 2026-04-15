import { exec } from 'child_process';
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

export class UpdateManager {

    private logger      = new Logger(['System', 'Update']);
    private releases:    GitHubRelease[] = [];
    private branches:    GitHubBranch[]  = [];
    private lastChecked: number | null   = null;
    private updating    = false;
    private updateError: string | null   = null;

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
        this.logger.info('Checking for updates...');
        this.updateError = null;

        if (!GH_API) {
            this.updateError = 'No GitHub repository URL found in package.json';
            this.logger.error(this.updateError);
            return this.getStatus();
        }

        try {
            const [releasesRes, branchesRes] = await Promise.all([
                fetch(`${GH_API}/releases`, { headers: { 'User-Agent': 'Beacon-Tally' } }),
                fetch(`${GH_API}/branches`, { headers: { 'User-Agent': 'Beacon-Tally' } }),
            ]);

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
            await this._exec(`git checkout ${ref}`);

            if (type === 'branch') {
                await this._exec(`git pull origin ${ref}`);
            }

            await this._exec('yarn install');
            this.logger.info('Update complete, restarting...');
        } catch (err) {
            this.updateError = (err as Error).message;
            this.updating    = false;
            this.logger.error('Update failed:', err);
            throw err;
        }

        process.exit(0);
    }

    private _exec(cmd: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.logger.info(`[update] ${cmd}`);
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
