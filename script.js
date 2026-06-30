/**
 * config.js
 * ---------------------------------------------------------------------------
 * Single place to point this site at the Huincul Transportes home page.
 * Loaded as a plain script (not an ES module) so the site still works if
 * someone opens index.html directly from disk, with no local server.
 *
 * UPDATE THIS the moment the home page is live on GitHub Pages:
 */
const EXTERNAL_HOME_URL = "https://agusneme16.github.io/huincul-homepage/";
/**
 * chart.js
 * ---------------------------------------------------------------------------
 * The real Figma Make file drew this with recharts (<AreaChart>). Pulling in
 * a charting library for one chart didn't seem worth it for a static site,
 * so this redraws the same two datasets as a small hand-built SVG area
 * chart — same curve, same gradient, same hover tooltip text ("Espera : X
 * min"), zero dependencies.
 */
(function () {
  "use strict";

  var W = 700, H = 260;
  var PAD_L = 8, PAD_R = 8, PAD_T = 26, PAD_B = 30;

  // Exact data points from the real source (dataPeak / dataOffPeak)
  var dataPeak = [
    { time: "04:00", value: 2 },
    { time: "07:00", value: 15 },
    { time: "10:00", value: 8 },
    { time: "13:00", value: 10 },
    { time: "18:00", value: 18 },
    { time: "21:00", value: 6 },
    { time: "00:00", value: 3 }
  ];
  var dataOffPeak = [
    { time: "04:00", value: 1 },
    { time: "07:00", value: 5 },
    { time: "10:00", value: 8 },
    { time: "13:00", value: 12 },
    { time: "18:00", value: 10 },
    { time: "21:00", value: 7 },
    { time: "00:00", value: 4 }
  ];

  var mount, svgEl, tooltipEl, currentPoints = [];

  function project(data) {
    var innerW = W - PAD_L - PAD_R;
    var innerH = H - PAD_T - PAD_B;
    var maxVal = Math.max.apply(null, data.map(function (d) { return d.value; })) * 1.2;
    return data.map(function (d, i) {
      return {
        x: PAD_L + innerW * (i / (data.length - 1)),
        y: PAD_T + innerH * (1 - d.value / maxVal),
        time: d.time,
        value: d.value
      };
    });
  }

  // Catmull-Rom -> cubic Bezier, gives the same smooth "monotone" feel
  // recharts uses without pulling in a library.
  function smoothPath(points) {
    if (points.length < 2) return "";
    var d = "M " + points[0].x + " " + points[0].y;
    for (var i = 0; i < points.length - 1; i++) {
      var p0 = points[i - 1] || points[i];
      var p1 = points[i];
      var p2 = points[i + 1];
      var p3 = points[i + 2] || p2;
      var c1x = p1.x + (p2.x - p0.x) / 6;
      var c1y = p1.y + (p2.y - p0.y) / 6;
      var c2x = p2.x - (p3.x - p1.x) / 6;
      var c2y = p2.y - (p3.y - p1.y) / 6;
      d += " C " + c1x + " " + c1y + ", " + c2x + " " + c2y + ", " + p2.x + " " + p2.y;
    }
    return d;
  }

  function render(data) {
    var pts = project(data);
    currentPoints = pts;
    var linePath = smoothPath(pts);
    var baseY = H - PAD_B;
    var areaPath = linePath + " L " + pts[pts.length - 1].x + " " + baseY +
      " L " + pts[0].x + " " + baseY + " Z";

    var labels = pts.map(function (p) {
      return '<text class="axis-label" x="' + p.x + '" y="' + (H - 8) + '" text-anchor="middle">' + p.time + "</text>";
    }).join("");

    svgEl.innerHTML =
      '<defs><linearGradient id="freqGradient" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="5%" stop-color="#0055FF" stop-opacity="0.6"/>' +
      '<stop offset="95%" stop-color="#0055FF" stop-opacity="0"/>' +
      "</linearGradient></defs>" +
      '<path class="area-path" d="' + areaPath + '"></path>' +
      '<path class="line-path" d="' + linePath + '"></path>' +
      '<line class="hover-line" id="hoverLine" x1="0" y1="' + PAD_T + '" x2="0" y2="' + baseY + '"></line>' +
      labels +
      '<circle class="hover-dot" id="hoverDot" r="6"></circle>';
  }

  function nearestPoint(clientX) {
    var rect = svgEl.getBoundingClientRect();
    var relX = ((clientX - rect.left) / rect.width) * W;
    var nearest = 0, minDist = Infinity;
    currentPoints.forEach(function (p, i) {
      var dist = Math.abs(p.x - relX);
      if (dist < minDist) { minDist = dist; nearest = i; }
    });
    return { point: currentPoints[nearest], rect: rect };
  }

  function showHover(clientX) {
    var found = nearestPoint(clientX);
    var p = found.point, rect = found.rect;

    var dot = svgEl.querySelector("#hoverDot");
    var hl = svgEl.querySelector("#hoverLine");
    if (dot) { dot.setAttribute("cx", p.x); dot.setAttribute("cy", p.y); dot.style.opacity = 1; }
    if (hl) { hl.setAttribute("x1", p.x); hl.setAttribute("x2", p.x); hl.style.opacity = 1; }

    var px = (p.x / W) * rect.width;
    var py = (p.y / H) * rect.height;
    tooltipEl.style.left = px + "px";
    tooltipEl.style.top = py + "px";
    tooltipEl.innerHTML = '<span class="tt-label">' + p.time + '</span><span class="tt-value">Espera : ' + p.value + " min</span>";
    tooltipEl.classList.add("is-visible");
  }

  function hideHover() {
    var dot = svgEl.querySelector("#hoverDot");
    var hl = svgEl.querySelector("#hoverLine");
    if (dot) dot.style.opacity = 0;
    if (hl) hl.style.opacity = 0;
    tooltipEl.classList.remove("is-visible");
  }

  function init() {
    mount = document.getElementById("freq-chart-mount");
    if (!mount) return;

    svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svgEl.setAttribute("viewBox", "0 0 " + W + " " + H);
    svgEl.setAttribute("preserveAspectRatio", "none");
    svgEl.classList.add("freq-chart");
    mount.appendChild(svgEl);

    tooltipEl = document.createElement("div");
    tooltipEl.className = "chart-tooltip";
    mount.appendChild(tooltipEl);

    render(dataPeak);

    svgEl.addEventListener("mousemove", function (e) { showHover(e.clientX); });
    svgEl.addEventListener("mouseleave", hideHover);
    svgEl.addEventListener("touchstart", function (e) { showHover(e.touches[0].clientX); }, { passive: true });
    svgEl.addEventListener("touchmove", function (e) { showHover(e.touches[0].clientX); }, { passive: true });
    svgEl.addEventListener("touchend", hideHover);
  }

  function setDataset(isWeekend) {
    render(isWeekend ? dataOffPeak : dataPeak);
    hideHover();
  }

  window.FreqChart = { init: init, setDataset: setDataset };
})();
/**
 * navigation.js
 * ---------------------------------------------------------------------------
 * - Keeps a --header-h CSS var in sync with the real (alert bar + header)
 *   height, since the alert bar can wrap to two lines on narrow screens.
 * - Hamburger opens a dropdown panel directly under the header (this is
 *   what the real source does — a Motion dropdown, not a fullscreen panel).
 * - Every in-page anchor smooth-scrolls and respects prefers-reduced-motion.
 * - Reads EXTERNAL_HOME_URL from config.js and applies it to every element
 *   carrying [data-external-home].
 */
(function () {
  "use strict";

  var menuToggle, iconMenu, iconClose, backdrop, panel;

  function syncHeaderHeight() {
    var wrap = document.getElementById("header-wrap");
    if (!wrap) return;
    document.documentElement.style.setProperty("--header-h", wrap.offsetHeight + "px");
  }

  function openMenu() {
    document.body.classList.add("menu-open");
    menuToggle.setAttribute("aria-expanded", "true");
    menuToggle.setAttribute("aria-label", "Cerrar menú");
    iconMenu.style.display = "none";
    iconClose.style.display = "block";
  }

  function closeMenu() {
    document.body.classList.remove("menu-open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Abrir menú");
    iconMenu.style.display = "block";
    iconClose.style.display = "none";
  }

  function toggleMenu() {
    if (document.body.classList.contains("menu-open")) closeMenu();
    else openMenu();
  }

  function smoothScrollTo(id) {
    var el = document.getElementById(id);
    if (!el) return;
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }

  function wireExternalHome() {
    var links = document.querySelectorAll("[data-external-home]");
    for (var i = 0; i < links.length; i++) {
      links[i].setAttribute("href", EXTERNAL_HOME_URL);
    }
  }

  function init() {
    syncHeaderHeight();
    wireExternalHome();

    menuToggle = document.getElementById("menu-toggle");
    iconMenu = document.getElementById("icon-menu");
    iconClose = document.getElementById("icon-close");
    backdrop = document.getElementById("mobile-backdrop");
    panel = document.getElementById("mobile-panel");

    menuToggle.addEventListener("click", toggleMenu);
    backdrop.addEventListener("click", closeMenu);

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeMenu();
    });

    var anchors = document.querySelectorAll('a[href^="#"]');
    for (var i = 0; i < anchors.length; i++) {
      anchors[i].addEventListener("click", function (e) {
        var id = this.getAttribute("href").slice(1);
        if (!id) return;
        e.preventDefault();
        closeMenu();
        smoothScrollTo(id);
      });
    }

    if (window.ResizeObserver) {
      new ResizeObserver(syncHeaderHeight).observe(document.getElementById("header-wrap"));
    }
    window.addEventListener("resize", syncHeaderHeight);
    window.addEventListener("orientationchange", syncHeaderHeight);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
/**
 * main.js
 * ---------------------------------------------------------------------------
 * Page-level behaviour that isn't navigation: the Hábiles/Fines de Semana
 * toggle (drives chart.js) and the simulated real-time frequency number,
 * which in the real source alternates between "Cada 4" and "Cada 3" min
 * every 4.5s via setInterval — reproduced exactly, including the cleanup.
 */
(function () {
  "use strict";

  function wireFrequencyTabs() {
    var tabHabiles = document.getElementById("tab-habiles");
    var tabFinde = document.getElementById("tab-finde");
    if (!tabHabiles || !tabFinde) return;

    function setWeekend(isWeekend) {
      tabHabiles.classList.toggle("is-active", !isWeekend);
      tabFinde.classList.toggle("is-active", isWeekend);
      tabHabiles.setAttribute("aria-selected", String(!isWeekend));
      tabFinde.setAttribute("aria-selected", String(isWeekend));
      if (window.FreqChart) window.FreqChart.setDataset(isWeekend);
    }

    tabHabiles.addEventListener("click", function () { setWeekend(false); });
    tabFinde.addEventListener("click", function () { setWeekend(true); });
  }

  function wireFrequencyNumber() {
    var el = document.getElementById("freq-number");
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    var nextBus = 4;
    setInterval(function () {
      nextBus = nextBus === 4 ? 3 : 4;
      el.textContent = "Cada " + nextBus;
    }, 4500);
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (window.FreqChart) window.FreqChart.init();
    wireFrequencyTabs();
    wireFrequencyNumber();
  });
})();