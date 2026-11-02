import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    JOB_FILTERS,
    toggleJobFilter,
} from '../../resources/js/lib/public-catalog.ts';

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
    ['urgent, recent', ['recent', 'urgent'], ['urgent', 'recent']],
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

for (const filter of JOB_FILTERS) {
    await test(`job filter toggle: ${filter} turns on, then off`, () => {
        const on = toggleJobFilter([], filter);

        assert.deepEqual(on, [filter]);
        assert.deepEqual(toggleJobFilter(on, filter), []);
    });
}

for (const pathway of ['landbased', 'seabased']) {
    await test(`job filter toggle: urgent and recent never clear ${pathway}`, () => {
        let active = [pathway];

        for (const click of [
            'urgent',
            'recent',
            'urgent',
            'recent',
            'urgent',
        ]) {
            active = toggleJobFilter(active, click);
            assert.ok(active.includes(pathway), active.join(','));
        }
    });
}

/** Every allowed non-empty selection: an optional pathway with any of urgent / recent. */
const COMBINATIONS = [
    ['landbased'],
    ['seabased'],
    ['urgent'],
    ['recent'],
    ['urgent', 'recent'],
    ['landbased', 'urgent'],
    ['landbased', 'recent'],
    ['landbased', 'urgent', 'recent'],
    ['seabased', 'urgent'],
    ['seabased', 'recent'],
    ['seabased', 'urgent', 'recent'],
];

/** All orders of a list. */
const orders = (items) =>
    items.length <= 1
        ? [items]
        : items.flatMap((item, index) =>
              orders(items.filter((_, other) => other !== index)).map(
                  (rest) => [item, ...rest],
              ),
          );

for (const combination of COMBINATIONS) {
    await test(`job filter toggle: ${combination.join(' + ')} from any click order, in a stable order`, () => {
        for (const clicks of orders(combination)) {
            assert.deepEqual(clickAll(clicks), combination, clicks.join(','));
        }
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
        assert.deepEqual(
            active,
            JOB_FILTERS.filter((id) => active.includes(id)),
            'kept in the pill order',
        );
    }
});
