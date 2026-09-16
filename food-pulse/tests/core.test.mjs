import test from 'node:test';
import assert from 'node:assert/strict';
import {
    STATES, DEFAULT_SETTINGS, REFRESH_INTERVAL_MS, normalizeSettings, parseSettings,
    validateTerms, buildShareQuery, buildExploreUrl, buildEmbedUrl, shouldAutoRefresh,
} from '../core.mjs';

test('geography covers all 50 states, DC, and the national view without duplicates', () => {
    assert.equal(STATES.length, 52);
    assert.equal(new Set(STATES.map(state => state.code)).size, 52);
    for (const geo of ['US', 'US-DC', 'US-AK', 'US-HI', 'US-WY']) {
        assert.equal(normalizeSettings({geo}).geo, geo);
    }
});

test('terms are normalized and deduplicated without accepting empty or unsafe values', () => {
    assert.deepEqual(validateTerms(' Pizza , ice   cream, PIZZA').terms, ['pizza', 'ice cream']);
    for (const input of ['pizza', 'pizza,pizza', 'pizza,', 'a,pizza', 'pizza,<script>',
        'pizza,tacos,sushi,burgers,barbecue,cookies', 'x'.repeat(41) + ',tacos', null, [5, 'pizza']]) {
        assert.equal(validateTerms(input).valid, false, String(input));
    }
    assert.equal(validateTerms("ice cream, shepherd's pie, plant-based burgers").valid, true);
});

test('malformed URL parameters fall back to bounded defaults', () => {
    const settings = parseSettings('?geo=evil&period=all&terms=%3Cscript%3E&refresh=0');
    assert.equal(settings.geo, 'US');
    assert.equal(settings.period, DEFAULT_SETTINGS.period);
    assert.deepEqual(settings.terms, DEFAULT_SETTINGS.terms);
    assert.equal(settings.autoRefresh, false);
    assert.deepEqual(normalizeSettings(null), normalizeSettings());
    assert.deepEqual(parseSettings('?preset=__proto__').terms, DEFAULT_SETTINGS.terms);
});

test('shared views round-trip their geography, food terms, period, and refresh preference', () => {
    const settings = normalizeSettings({geo: 'US-NY', period: 'now 7-d', terms: ['ice cream', "shepherd's pie"], autoRefresh: false});
    assert.deepEqual(parseSettings(buildShareQuery(settings)), settings);
    assert.equal(parseSettings('?preset=breakfast').terms[0], 'coffee');
});

test('map request stays national while timeline honors the selected state', () => {
    const settings = normalizeSettings({geo: 'US-TX', period: 'today 3-m', terms: ['pizza', 'tacos']});
    for (const [kind, override, expected] of [['GEO_MAP', 'US', 'US'], ['TIMESERIES', undefined, 'US-TX']]) {
        const url = new URL(buildEmbedUrl(kind, settings, override));
        assert.equal(url.origin, 'https://trends.google.com');
        assert.equal(url.pathname, `/trends/embed/explore/${kind}`);
        const request = JSON.parse(url.searchParams.get('req'));
        assert.deepEqual(request.comparisonItem, settings.terms.map(keyword => ({keyword, geo: expected, time: settings.period})));
        assert.equal(request.category, 0);
        assert.equal(request.property, '');
        assert.equal(url.searchParams.get('tz'), '0');
        assert.equal(new URLSearchParams(url.searchParams.get('eq')).get('geo'), expected);
    }
    assert.throws(() => buildEmbedUrl('../unsafe', settings));
});

test('source links preserve the query and cannot redirect to untrusted hosts', () => {
    const settings = normalizeSettings({geo: 'US-CA', terms: ['pizza', 'ice cream']});
    const url = new URL(buildExploreUrl(settings));
    assert.equal(url.origin, 'https://trends.google.com');
    assert.equal(url.searchParams.get('q'), 'pizza,ice cream');
    assert.equal(url.searchParams.get('geo'), 'US-CA');
    assert.equal(new URL(buildExploreUrl(settings, 'US')).searchParams.get('geo'), 'US');
});

test('auto-refresh waits fifteen minutes and pauses when hidden, offline, or interacting', () => {
    const current = {enabled: true, visible: true, online: true, interacting: false, lastRequestedAt: 1000, now: 1000 + REFRESH_INTERVAL_MS};
    assert.equal(shouldAutoRefresh(current), true);
    assert.equal(shouldAutoRefresh({...current, now: current.now - 1}), false);
    for (const patch of [{enabled: false}, {visible: false}, {online: false}, {interacting: true}, {lastRequestedAt: null}, {now: NaN}, {now: 0}]) {
        assert.equal(shouldAutoRefresh({...current, ...patch}), false);
    }
});
