// Load the app only when requested; closing the panel preserves the demo session.
const demo = document.querySelector("#live-demo");
const frame = demo?.querySelector("iframe[data-src]");

if (demo && frame) {
    const loadDemo = () => {
        if (demo.open && !frame.hasAttribute("src")) {
            frame.src = frame.dataset.src;
        }
    };
    demo.addEventListener("toggle", loadDemo);
    loadDemo();
}
