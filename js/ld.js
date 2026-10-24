// Structured data (JSON-LD) voor zoekmachines. Een extern bestand, omdat de CSP
// geen inline scripts toestaat; de gegevens komen uit de pagina zelf.
const BASE = "https://www.ishetalafgelast.nl";
const canonical = document.querySelector('link[rel="canonical"]')?.href || `${BASE}/`;
const city = document.querySelector("#city");
// Alleen plaatspagina's hebben vaste coördinaten bij het plaatsveld.
const plaats = city?.dataset.lat ? city.value : "";

const crumbs = [["IsHetAlAfgelast.nl", `${BASE}/`]];
if (plaats) crumbs.push(["Plaatsen", `${BASE}/plaatsen/`], [plaats, canonical]);

const graph = [
  { "@type": "WebSite", "@id": `${BASE}/#website`, name: "IsHetAlAfgelast.nl", url: `${BASE}/`, inLanguage: "nl-NL" },
  {
    "@type": "WebApplication",
    name: plaats ? `Afgelastingscheck ${plaats}` : "IsHetAlAfgelast.nl",
    url: canonical,
    description: document.querySelector('meta[name="description"]')?.content || "",
    applicationCategory: "SportsApplication",
    operatingSystem: "Any",
    inLanguage: "nl-NL",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
    isPartOf: { "@id": `${BASE}/#website` },
  },
];
if (crumbs.length > 1) {
  graph.push({
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map(([name, item], i) => ({ "@type": "ListItem", position: i + 1, name, item })),
  });
}

const el = document.createElement("script");
el.type = "application/ld+json";
el.textContent = JSON.stringify({ "@context": "https://schema.org", "@graph": graph });
document.head.append(el);
