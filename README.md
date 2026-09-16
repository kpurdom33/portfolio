# Kirby Purdom's portfolio

A static HTML, CSS, and JavaScript portfolio published at
[kpurdom33.github.io/portfolio](https://kpurdom33.github.io/portfolio/).

## Preview locally

Run `python -m http.server 8000` in this directory and open
`http://localhost:8000`. There are no build dependencies.

## Content and demo

- `index.html` contains the introduction, Food Logger case study, and a worked
  example rendered as accessible HTML (not a screenshot of the live app).
- `style.css` includes layouts for desktop, tablet, and mobile, visible keyboard
  focus, and reduced-motion support.
- `script.js` loads the embedded Streamlit app when the demo panel first opens.
  Closing and reopening the panel preserves the iframe's session. Direct app
  links also work without JavaScript.

The worked example uses **Chicken Breast Cooked** from the Food Logger's
`foods_master.csv`: 100 g = 165 calories and 31 g protein; 200 g = 330 calories
and 62 g protein. Update this example if that food record changes.

The live app must use its default per-session demo storage. Do not set
`FOOD_LOG_STORAGE=csv` on the public deployment; that mode is for a private,
single-user local installation. Demo sessions reset on browser reload.

Before publishing layout changes, check 320px, 375px, 768px, and desktop widths,
keyboard navigation, the demo panel, and the external app/source links.

## Food Pulse dashboard

The second portfolio project lives in [food-pulse/](food-pulse/README.md) and is
published at [Food Pulse](https://kpurdom33.github.io/portfolio/food-pulse/).
It compares food search interest using Google Trends embeds, state and time
filters, shareable URLs, and automatic chart requests while the page is active.
The metric is relative search interest, not consumption or sales. Google controls
chart availability and data freshness. See the project's README for setup,
tests, and interpretation details.

## Speaking

The homepage's `#speaking` section features the HIMSS 2026 presentation,
"Creating the Enterprise Semantic Model." The title, date, presenters, and
case study summary are based on the linked official HIMSS session listing.
