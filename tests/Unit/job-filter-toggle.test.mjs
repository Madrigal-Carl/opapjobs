import assert from 'node:assert/strict';
import { test } from 'node:test';
import { toggleJobFilter } from '../../resources/js/lib/public-catalog.ts';

/** Clicks each filter in turn, starting from no filters. */
const clickAll = (clicks) =>
    clicks.reduce((active, filter) => toggleJobFilter(active, filter), []);

for (const [name, clicks, expected] of [
    ['nothing selected shows all', [], []],
    ['landbased, urgent', ['landbased', 'urgent'], ['landbased', 'urgent']],
    [
        'landbased, urgent, recent',
        ['landbased', 'urgent', 'recent'],
        ['landbased', 'urgent', 'recent'],
    ],
    ['landbased, recent', ['landbased', 'recent'], ['landbased', 'recent']],
    ['seabased, urgent', ['seabased', 'urgent'], ['seabased', 'urgent']],
    [
        'seabased, urgent, recent',
        ['seabased', 'recent', 'urgent'],
        ['seabased', 'urgent', 'recent'],
    ],
    ['seabased, recent', ['recent', 'seabased'], ['seabased', 'recent']],
    [
        'a second click turns a filter off',
        ['landbased', 'urgent', 'urgent'],
        ['landbased'],
    ],
    [
        'every filter can be switched back off',
        ['landbased', 'urgent', 'recent', 'landbased', 'urgent', 'recent'],
        [],
    ],
    [
        'seabased replaces landbased and keeps the rest',
        ['landbased', 'urgent', 'recent', 'seabased'],
        ['seabased', 'urgent', 'recent'],
    ],
    ['landbased replaces seabased', ['seabased', 'landbased'], ['landbased']],
]) {
    await test(`job filter toggle: ${String(name)}`, () => {
        assert.deepEqual(clickAll(clicks), expected);
    });
}

await test('job filter toggle: the two pathways are never on together', () => {
    const filters = ['landbased', 'seabased', 'urgent', 'recent'];
    let active = [];

    for (let step = 0; step < 200; step++) {
        active = toggleJobFilter(active, filters[(step * 7 + step * step) % 4]);
        assert.ok(
            !(active.includes('landbased') && active.includes('seabased')),
            active.join(','),
        );
    }
});
