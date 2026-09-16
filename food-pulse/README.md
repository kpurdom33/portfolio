# Food Pulse

A food search-interest dashboard for the United States, built by Kirby Purdom.

The dashboard compares selected food search terms using Google's own Trends
charts. It measures relative search interest, not food consumption or sales.

**Live:** https://kpurdom33.github.io/portfolio/food-pulse/

This directory is a standalone, dependency-free web project within the portfolio
repository. It deploys through the portfolio's existing GitHub Pages setup.

## Features

- Compare 2–5 food search terms; choose takeout, breakfast, or dessert presets.
- National state-comparison map plus a timeline for all 50 states, DC, or the U.S.
- Rolling windows from 7 days to 12 months.
- Shareable URLs preserve the foods, geography, period, and refresh preference.
- Chart requests repeat every 15 minutes while the page is visible and online.
  Refresh pauses while a chart has focus, and can be disabled or triggered manually.
- Responsive controls, keyboard focus indicators, explanatory source notes, and
  direct Google Trends links when embeds are unavailable.

## Run locally

From this directory, run `python -m http.server 8000` and open
`http://localhost:8000`. Use an HTTP server; browsers restrict module imports from
`file://` pages. No npm installation or API key is needed to use the dashboard.

To run the tests with Node.js 18 or newer:

```sh
npm test
```

`index.html` defines the dashboard; `styles.css` provides its responsive layout.
`core.mjs` handles query validation, share URLs, chart requests, and refresh rules.
`app.mjs` connects those functions to the controls and browser lifecycle.

## Data and interpretation

Data source: [Google Trends](https://trends.google.com/trends/).

The charts are Google's embedded visualizations. This project does not scrape
the Trends API, collect visitor searches in a database, or substitute synthetic
numbers when Google is unavailable. The developer's contribution is the dashboard
interface, query controls, URL state, refresh behavior, accessibility, and tests.

- The national map compares the selected food terms within each state. It is not
  an exhaustive ranking of foods or a measure of what people eat most.
- The timeline uses sampled search-interest indices normalized by Google, not
  raw search counts. Separate requests/charts can have different scales.
- The map stays national when a state is selected; the timeline changes to that
  state. All selected terms share the same window and geography within a chart.
- Queries use Web Search, all categories, and a UTC request time zone. Terms
  include searches containing those words, not all synonyms or related topics.
- `Charts requested at` is the browser's request time, not the data's publication
  timestamp. Google controls freshness; refreshing may return the same data.
- Low-volume states or terms may have missing data. Google can rate-limit requests,
  block embeds, or require user interaction. A cross-origin iframe load cannot
  establish that the chart rendered successfully. Use the direct source links.

The Google embed endpoints returned HTTP 429 during development in this environment.
The dashboard's query and refresh behavior can be tested locally, but the underlying
charts must also be checked from a browser that Google permits to load them.

## Source documentation

- [Export, embed, and cite Trends data](https://support.google.com/trends/answer/4365538?hl=en)
- [Regional comparisons](https://support.google.com/trends/answer/4355212?hl=en)
- [Sampling and normalization](https://support.google.com/trends/answer/4365533?hl=en)
- [Search terms and topics](https://support.google.com/trends/answer/4359550?hl=en)
- [Keeping embedded charts updated](https://newsinitiative.withgoogle.com/resources/trainings/storytelling-with-google-trends/)

Before release, check the chart contents, map interactions, desktop/mobile layout,
keyboard navigation, and link sharing in a connected browser. The automated tests
cover query construction and control behavior; they do not replace that visual check.
