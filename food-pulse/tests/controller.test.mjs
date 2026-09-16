import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {REFRESH_INTERVAL_MS} from '../core.mjs';

test('dashboard controls preserve truthful geography, handle offline changes, and refresh only when appropriate', async () => {
    const saved = Object.fromEntries(['document', 'window', 'navigator'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
    const originalNow = Date.now;
    let now = 1000000;
    let timer;
    let clipboardValue = '';
    let document;
    class Element {
        constructor(tagName = 'div') {
            this.tagName = tagName.toUpperCase(); this.children = []; this.events = {};
            this.attributes = {}; this.value = ''; this.checked = false; this.hidden = false;
        }
        replaceChildren(...children) { this.children = children; }
        addEventListener(name, listener) { this.events[name] = listener; }
        setAttribute(name, value) { this.attributes[name] = value; }
        removeAttribute(name) { delete this.attributes[name]; }
        focus() { document.activeElement = this; }
        select() { this.selected = true; }
        async fire(name) { return this.events[name]?.({preventDefault() {}}); }
    }
    const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
    const nodes = Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map(match => [match[1], new Element()]));
    document = {hidden: false, activeElement: null, events: {},
        getElementById: id => nodes[id], createElement: tag => new Element(tag),
        addEventListener(name, listener) { this.events[name] = listener; }};
    const window = {location: {href: 'https://example.com/food-pulse/', search: ''}, events: {},
        history: {replaceState(_a, _b, url) { window.location.href = url; window.location.search = new URL(url).search; }},
        addEventListener(name, listener) { this.events[name] = listener; },
        setInterval(fn) { timer = fn; }};
    const navigator = {onLine: true, clipboard: {async writeText(value) { clipboardValue = value; }}};
    try {
        for (const [key, value] of Object.entries({document, window, navigator})) {
            Object.defineProperty(globalThis, key, {value, configurable: true, writable: true});
        }
        Date.now = () => now;
        await import('../app.mjs');
        const query = host => JSON.parse(new URL(nodes[host].children[0].src).searchParams.get('req'));
        assert.equal(nodes.geography.children.length, 52);
        assert.equal(query('map-host').comparisonItem[0].geo, 'US');
        assert.match(nodes['request-status'].textContent, /^Charts requested at/);

        nodes.geography.value = 'US-TX';
        nodes.period.value = 'today 3-m';
        nodes.terms.value = 'pizza, tacos';
        await nodes.filters.fire('submit');
        assert.equal(nodes['scope-label'].textContent, 'Texas');
        assert.equal(query('map-host').comparisonItem[0].geo, 'US');
        assert.equal(query('timeline-host').comparisonItem[0].geo, 'US-TX');
        assert.equal(query('timeline-host').comparisonItem.length, 2);
        assert.equal(new URL(window.location.href).searchParams.get('geo'), 'US-TX');

        const goodFrame = nodes['timeline-host'].children[0];
        nodes.terms.value = 'pizza,<script>';
        await nodes.filters.fire('submit');
        assert.equal(nodes['terms-error'].hidden, false);
        assert.equal(nodes['timeline-host'].children[0], goodFrame);

        nodes.terms.value = 'coffee,bagels';
        navigator.onLine = false;
        nodes.geography.value = 'US-NY';
        await nodes.filters.fire('submit');
        assert.match(nodes['timeline-host'].children[0].textContent, /offline/);
        navigator.onLine = true;
        window.events.online();
        assert.equal(query('timeline-host').comparisonItem[0].geo, 'US-NY');

        const beforeRefresh = nodes['map-host'].children[0];
        now += REFRESH_INTERVAL_MS;
        document.hidden = true; timer();
        assert.equal(nodes['map-host'].children[0], beforeRefresh);
        document.hidden = false; navigator.onLine = false; timer();
        assert.equal(nodes['map-host'].children[0], beforeRefresh);
        navigator.onLine = true; document.activeElement = beforeRefresh; timer();
        assert.equal(nodes['map-host'].children[0], beforeRefresh);
        document.activeElement = null; timer();
        assert.notEqual(nodes['map-host'].children[0], beforeRefresh);

        nodes['auto-refresh'].checked = false;
        await nodes['auto-refresh'].fire('change');
        const pausedFrame = nodes['map-host'].children[0];
        now += REFRESH_INTERVAL_MS; timer();
        assert.equal(nodes['map-host'].children[0], pausedFrame);
        await nodes['share-view'].fire('click');
        assert.equal(new URL(clipboardValue).searchParams.get('geo'), 'US-NY');
        assert.equal(new URL(clipboardValue).searchParams.get('refresh'), '0');
        navigator.clipboard.writeText = async () => { throw new Error('Denied'); };
        await nodes['share-view'].fire('click');
        assert.equal(nodes['share-fallback'].hidden, false);
        assert.equal(nodes['share-url'].selected, true);
    } finally {
        Date.now = originalNow;
        for (const [key, descriptor] of Object.entries(saved)) {
            if (descriptor) Object.defineProperty(globalThis, key, descriptor);
            else delete globalThis[key];
        }
    }
});
