// Klassiek script in <head>, vóór de eerste tekenbeurt: opent iemand een uitslaglink,
// dan tonen we de homepage niet eerst even. app.js haalt de klasse weg zodra er een
// scherm gekozen is; lukt dat niet, dan maakt de CSS de homepage na 3 s alsnog zichtbaar.
(function () {
  var p = new URLSearchParams(location.search);
  if (p.has("plaats") && p.has("datum")) document.documentElement.classList.add("is-uitslaglink");
  // De opstelling uit een deellink staat achter het hekje. Meteen opzij en uit de adresbalk, zodat de namen
  // nooit in de statistiekenscript of een server terechtkomen. De proef (?proef=1) leest ze hier weer uit.
  // Zonder de proef leest niemand ze, dan bewaren we ze ook niet (bij livegang deze voorwaarde weghalen).
  if (location.hash.indexOf("#opstelling=") === 0) {
    if (p.get("proef") === "1") {
      try { sessionStorage.setItem("ishetalafgelast:opstelling-link", location.hash.slice(12)); } catch (e) { /* geen opslag */ }
    }
    history.replaceState(history.state, "", location.pathname + location.search);
  }
})();
