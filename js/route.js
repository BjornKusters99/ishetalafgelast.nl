// Klassiek script in <head>, vóór de eerste tekenbeurt: opent iemand een uitslaglink,
// dan tonen we de homepage niet eerst even. app.js haalt de klasse weg zodra er een
// scherm gekozen is; lukt dat niet, dan maakt de CSS de homepage na 3 s alsnog zichtbaar.
(function () {
  var p = new URLSearchParams(location.search);
  if (p.has("plaats") && p.has("datum")) document.documentElement.classList.add("is-uitslaglink");
  // De opstelling uit een deellink staat achter het hekje. Meteen opzij en uit de adresbalk, zodat de namen
  // nooit in de statistiekenscript of een server terechtkomen. lab/proef.js leest ze hier weer uit.
  if (location.hash.indexOf("#opstelling=") === 0) {
    try { sessionStorage.setItem("ishetalafgelast:opstelling-link", location.hash.slice(12)); } catch (e) { /* geen opslag */ }
    history.replaceState(history.state, "", location.pathname + location.search);
  }
})();
