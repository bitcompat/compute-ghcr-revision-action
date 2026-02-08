import * as core from '@actions/core';
import * as github from '@actions/github';

function escRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseVersion(version) {
    const parts = (version || '').trim().split('.').map(s => s.trim()).filter(Boolean);
    const major = parts[0];
    if (!/^\d+$/.test(major)) {
        throw new Error(`Invalid version number: "${version}"`);
    }
    const minor = parts[1] ?? '0';
    const patchPresent = parts.length >= 3 && parts[2] !== undefined && parts[2] !== '';
    const patch = patchPresent ? parts[2] : undefined;
    return { major, minor, patch, patchPresent };
}

async function listAllVersions(octokit, route) {
    const per_page = 100;
    let page = 1;
    let all = [];
    while (true) {
        const { data } = await octokit.request(route, { per_page, page });
        if (!Array.isArray(data) || data.length === 0) {
            break;
        }

        all = all.concat(data);
        if (data.length < per_page) {
            break;
        }

        page++;
    }
    return all;
}

async function fetchAllTags(octokit, owner, packageName) {
    // 1) try org
    try {
        const route = `/orgs/${owner}/packages/container/${encodeURIComponent(packageName)}/versions`;
        const versions = await listAllVersions(octokit, route);
        return versions.flatMap(v => (v?.metadata?.container?.tags) || []);
    } catch (e) {
        if (!e || (e.status !== 404 && e.status !== 403)) {
            throw e;
        }
    }

    // 2) fallback user
    const route = `/users/${owner}/packages/container/${encodeURIComponent(packageName)}/versions`;
    const versions = await listAllVersions(octokit, route);
    return versions.flatMap(v => (v?.metadata?.container?.tags) || []);
}

function computeTags({ major, minor, patch, patchPresent, codename, allTags }) {
    const base = patchPresent
        ? `${major}.${minor}.${patch}-${codename}`
        : `${major}.${minor}-${codename}`;

    const re = new RegExp(`^${escRegex(base)}-r(\\d+)$`);

    let max = 0;
    for (const t of allTags) {
        if (typeof t !== 'string') continue;
        const m = t.match(re);
        if (m) {
            const n = parseInt(m[1], 10);
            if (!Number.isNaN(n) && n > max) {
                max = n;
            }
        }
    }

    const revision = max + 1;
    const out = new Set();
    out.add(`${base}-r${revision}`);

    if (patchPresent) {
        out.add(`${major}.${minor}.${patch}-${codename}`);
        out.add(`${major}.${minor}.${patch}`);
    }
    out.add(`${major}.${minor}-${codename}`);
    out.add(`${major}.${minor}`);

    return { base, revision, tags: Array.from(out).filter(Boolean) };
}

async function run() {
    try {
        const token = core.getInput('github_token', { required: true });
        const octokit = github.getOctokit(token);

        const { owner, repo } = github.context.repo;

        const version = core.getInput('version', { required: true });
        const codename = core.getInput('debian_codename', { required: true });
        const imageNameInput = core.getInput('image_name') || '';
        const majorOnlyTag = (core.getInput('major_only_tag') || 'false').toLowerCase() === 'true';

        const imageName = imageNameInput.trim() || repo;
        const { major, minor, patch, patchPresent } = parseVersion(version);

        const allTags = await fetchAllTags(octokit, owner, imageName);
        const { base, revision, tags } = computeTags({ major, minor, patch, patchPresent, codename, allTags });

        if (majorOnlyTag) {
            tags.push(major);
        }

        // Outputs
        core.setOutput('tag', `${base}-r${revision}`);
        core.setOutput('base', base);
        core.setOutput('revision', String(revision));
        core.setOutput('tags', tags.join('\n'));
        core.setOutput('tags_json', JSON.stringify(tags));

        core.info(`Owner: ${owner}`);
        core.info(`Package: ${imageName}`);
        core.info(`Base: ${base}`);
        core.info(`Next revision: r${revision}`);
        core.info(`Tags: ${JSON.stringify(tags)}`);
    } catch (error) {
        core.setFailed(error.message);
    }
}

if (process.env.NODE_ENV !== 'test') {
    run();
}

export {
    escRegex,
    parseVersion,
    listAllVersions,
    fetchAllTags,
    computeTags,
    run,
};
