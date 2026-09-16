export const REFRESH_INTERVAL_MS = 15 * 60 * 1000;

export const STATES = [
    ['US', 'United States'], ['US-AL', 'Alabama'], ['US-AK', 'Alaska'],
    ['US-AZ', 'Arizona'], ['US-AR', 'Arkansas'], ['US-CA', 'California'],
    ['US-CO', 'Colorado'], ['US-CT', 'Connecticut'], ['US-DE', 'Delaware'],
    ['US-DC', 'District of Columbia'], ['US-FL', 'Florida'], ['US-GA', 'Georgia'],
    ['US-HI', 'Hawaii'], ['US-ID', 'Idaho'], ['US-IL', 'Illinois'],
    ['US-IN', 'Indiana'], ['US-IA', 'Iowa'], ['US-KS', 'Kansas'],
    ['US-KY', 'Kentucky'], ['US-LA', 'Louisiana'], ['US-ME', 'Maine'],
    ['US-MD', 'Maryland'], ['US-MA', 'Massachusetts'], ['US-MI', 'Michigan'],
    ['US-MN', 'Minnesota'], ['US-MS', 'Mississippi'], ['US-MO', 'Missouri'],
    ['US-MT', 'Montana'], ['US-NE', 'Nebraska'], ['US-NV', 'Nevada'],
    ['US-NH', 'New Hampshire'], ['US-NJ', 'New Jersey'], ['US-NM', 'New Mexico'],
    ['US-NY', 'New York'], ['US-NC', 'North Carolina'], ['US-ND', 'North Dakota'],
    ['US-OH', 'Ohio'], ['US-OK', 'Oklahoma'], ['US-OR', 'Oregon'],
    ['US-PA', 'Pennsylvania'], ['US-RI', 'Rhode Island'], ['US-SC', 'South Carolina'],
    ['US-SD', 'South Dakota'], ['US-TN', 'Tennessee'], ['US-TX', 'Texas'],
    ['US-UT', 'Utah'], ['US-VT', 'Vermont'], ['US-VA', 'Virginia'],
    ['US-WA', 'Washington'], ['US-WV', 'West Virginia'], ['US-WI', 'Wisconsin'],
    ['US-WY', 'Wyoming'],
].map(([code, name]) => Object.freeze({code, name}));

export const PERIODS = Object.freeze({
    'now 7-d': 'Past 7 days',
    'today 1-m': 'Past month',
    'today 3-m': 'Past 3 months',
    'today 12-m': 'Past 12 months',
});

export const PRESETS = Object.freeze({
    takeout: {label: 'Takeout favorites', terms: ['pizza', 'tacos', 'sushi', 'burgers', 'barbecue']},
    breakfast: {label: 'Breakfast table', terms: ['coffee', 'eggs', 'pancakes', 'oatmeal', 'bagels']},
    desserts: {label: 'Something sweet', terms: ['ice cream', 'cookies', 'cake', 'donuts', 'pie']},
});

export const DEFAULT_SETTINGS = Object.freeze({
    geo: 'US', period: 'today 1-m', terms: Object.freeze([...PRESETS.takeout.terms]), autoRefresh: true,
});

export function validateTerms(input) {
    const raw = typeof input === 'string' ? input.split(',') : input;
    if (!Array.isArray(raw) || raw.some(term => typeof term !== 'string')) {
        return {valid: false, terms: [], error: 'Enter 2 to 5 food search terms, separated by commas.'};
    }
    const terms = [...new Set(raw.map(term => term.trim().replace(/\s+/g, ' ').toLowerCase()))];
    if (terms.some(term => !/^[a-z0-9][a-z0-9 '\-]{1,39}$/.test(term))) {
        return {valid: false, terms: [], error: 'Use 2–40 characters per term: letters, numbers, spaces, apostrophes, or hyphens.'};
    }
    if (terms.length < 2 || terms.length > 5) {
        return {valid: false, terms: [], error: 'Compare 2 to 5 different food search terms.'};
    }
    return {valid: true, terms, error: ''};
}

export function normalizeSettings(input = {}) {
    const candidate = input && typeof input === 'object' ? input : {};
    const preset = Object.hasOwn(PRESETS, candidate.preset) ? PRESETS[candidate.preset] : PRESETS.takeout;
    const result = validateTerms(candidate.terms ?? preset.terms);
    return {
        geo: STATES.some(state => state.code === candidate.geo) ? candidate.geo : DEFAULT_SETTINGS.geo,
        period: Object.hasOwn(PERIODS, candidate.period) ? candidate.period : DEFAULT_SETTINGS.period,
        terms: result.valid ? result.terms : [...DEFAULT_SETTINGS.terms],
        autoRefresh: ![false, '0', 'false'].includes(candidate.autoRefresh),
    };
}

export function parseSettings(search = '') {
    const params = new URLSearchParams(search);
    return normalizeSettings({
        geo: params.get('geo'), period: params.get('period'),
        terms: params.has('terms') ? params.get('terms') : undefined,
        preset: params.get('preset'), autoRefresh: params.get('refresh'),
    });
}

export function buildShareQuery(input) {
    const settings = normalizeSettings(input);
    return new URLSearchParams({
        geo: settings.geo, period: settings.period,
        terms: settings.terms.join(','), refresh: settings.autoRefresh ? '1' : '0',
    }).toString();
}

export function buildExploreUrl(input, geoOverride) {
    const settings = normalizeSettings(input);
    const geo = normalizeSettings({geo: geoOverride ?? settings.geo}).geo;
    const url = new URL('https://trends.google.com/trends/explore');
    url.search = new URLSearchParams({geo, date: settings.period, q: settings.terms.join(','), hl: 'en-US'});
    return url.href;
}

export function buildEmbedUrl(kind, input, geoOverride) {
    if (!['GEO_MAP', 'TIMESERIES'].includes(kind)) throw new Error('Unsupported Google Trends chart.');
    const settings = normalizeSettings(input);
    const geo = normalizeSettings({geo: geoOverride ?? settings.geo}).geo;
    const req = {
        comparisonItem: settings.terms.map(keyword => ({keyword, geo, time: settings.period})),
        category: 0, property: '',
    };
    const url = new URL(`https://trends.google.com/trends/embed/explore/${kind}`);
    url.search = new URLSearchParams({
        req: JSON.stringify(req), tz: '0', hl: 'en-US',
        eq: new URL(buildExploreUrl(settings, geo)).search.slice(1),
    });
    return url.href;
}

export function shouldAutoRefresh({enabled, visible, online, interacting = false, lastRequestedAt, now}) {
    return Boolean(enabled && visible && online && !interacting
        && Number.isFinite(lastRequestedAt) && Number.isFinite(now)
        && now - lastRequestedAt >= REFRESH_INTERVAL_MS);
}
