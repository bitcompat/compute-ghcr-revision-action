import test from 'node:test';
import assert from 'node:assert/strict';
import { parseVersion, computeTags } from '../src/index.js';

test('parseVersion handles major only', () => {
    const v = parseVersion('1');
    assert.equal(v.major, '1');
    assert.equal(v.minor, '0');
    assert.equal(v.patch, undefined);
    assert.equal(v.patchPresent, false);
});

test('parseVersion handles major.minor', () => {
    const v = parseVersion('1.2');
    assert.equal(v.major, '1');
    assert.equal(v.minor, '2');
    assert.equal(v.patch, undefined);
    assert.equal(v.patchPresent, false);
});

test('parseVersion handles major.minor.patch', () => {
    const v = parseVersion('1.2.3');
    assert.equal(v.major, '1');
    assert.equal(v.minor, '2');
    assert.equal(v.patch, '3');
    assert.equal(v.patchPresent, true);
});

test('parseVersion rejects invalid major', () => {
    assert.throws(() => parseVersion('v1.2.3'), /Invalid version number/);
});

test('computeTags with patch uses highest rN + 1', () => {
    const result = computeTags({
        major: '1',
        minor: '2',
        patch: '3',
        patchPresent: true,
        codename: 'trixie',
        allTags: [
            '1.2.3-trixie-r1',
            '1.2.3-trixie-r4',
            '1.2.3-bookworm-r20',
            '1.2-trixie-r9',
        ],
    });

    assert.equal(result.base, '1.2.3-trixie');
    assert.equal(result.revision, 5);

    const set = new Set(result.tags);
    assert.equal(set.has('1.2.3-trixie-r5'), true);
    assert.equal(set.has('1.2.3-trixie'), true);
    assert.equal(set.has('1.2.3'), true);
    assert.equal(set.has('1.2-trixie'), true);
    assert.equal(set.has('1.2'), true);
});

test('computeTags without patch uses major.minor base', () => {
    const result = computeTags({
        major: '2',
        minor: '5',
        patch: undefined,
        patchPresent: false,
        codename: 'trixie',
        allTags: ['2.5-trixie-r2', '2.5-trixie-r10'],
    });

    assert.equal(result.base, '2.5-trixie');
    assert.equal(result.revision, 11);

    const set = new Set(result.tags);
    assert.equal(set.has('2.5-trixie-r11'), true);
    assert.equal(set.has('2.5-trixie'), true);
    assert.equal(set.has('2.5'), true);
});
