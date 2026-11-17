# Beveiliging en beheer

De site is statisch en draait op Cloudflare Workers (alleen statische
bestanden, `wrangler.jsonc`). GitHub Pages is uitgeschakeld. Beveiliging kan risico verkleinen,
maar geen garantie geven dat ieder apparaat, account en toekomstige wijziging
veilig blijft. Dit document wordt niet in het website-artefact opgenomen.

## Beveiligde publicatie

De beveiligingspatch gebruikt een aparte branch vanaf de live `master`;
bestaande lokale featurewijzigingen zijn niet meegenomen. Publicatie bevat
alleen allowlisted runtimebestanden, met automatische service-worker-cachehash.
PR-tests draaien met read-only rechten zonder secrets. Alleen de job
`deploy-cloudflare` op `master` gebruikt `CLOUDFLARE_API_TOKEN` en
`CLOUDFLARE_ACCOUNT_ID`, via de environment `cloudflare-production` die alleen
`master` toestaat. Bewaar die secrets in de environment, niet op reponiveau.
Geef het token alleen "Workers Scripts: Edit" op dit account en roteer het na
elke verdenking. Rollback: revert-PR, of in Cloudflare onder Workers >
ishetalafgelast > Deployments een vorige versie terugzetten.

Repositoryinstellingen gecontroleerd/aangepast op 23 oktober 2026:

* HTTPS afdwingen staat aan, HTTP op beide hosts verwijst naar HTTPS.
* `master` vereist een PR, lineaire historie en opgeloste reviewgesprekken.
  Force-pushes en branchverwijdering zijn geblokkeerd, ook voor administrators.
* Er is geen verplichte tweede reviewer zolang alleen de eigenaar beschikbaar
  is. Een auteur kan zijn eigen PR niet goedkeuren. Voeg alleen een vertrouwde
  reviewer toe wanneer echte onafhankelijke controle nodig is.
* Actions zijn beperkt tot GitHub-owned Actions, met verplichte SHA-pinning.
  Externe bijdragers vereisen goedkeuring voor PR-workflows.
* Secret scanning en push protection blijven actief. De workflow scant ook
  bereikbare Git-historie en bronbestanden met Gitleaks.
* `security-checks` is een verplichte check. Aanwezigheid van YAML alleen
  bewijst geen succesvolle live deployment: controleer de site na elke release.

## Periodieke accountcontrole

De actuele status van account- en registrarcontroles staat niet in deze
publieke repo, maar in de privé overdracht van de eigenaar.

1. GitHub: 2FA/passkeys, recoverycodes, actieve sessies, SSH-sleutels,
   OAuth/GitHub Apps en tokens. Trek alleen rechten in waarvan bevestigd is
   dat ze niet meer nodig zijn. Bewaar recoverycodes offline buiten de repo.
   Bescherm ook de herstelmailbox.
2. Registrar: MFA, accounttoegang, domeinverlenging en herstelgegevens.
3. Cloudflare: 2FA, API-tokens (alleen het deploytoken hoort te bestaan),
   SSL/TLS op "Full (strict)", "Always Use HTTPS" aan, DNSSEC aan.
4. GitHub account Settings > Pages > Verified domains: verifieer het domein
   zodat niemand het via een eigen Pages-site kan claimen. Zet nooit DNS terug
   naar GitHub zonder deze verificatie.

Geef automatisering alleen de repo- en deployrechten die nodig zijn.

## Responseheaders

`_headers` zet HSTS (een jaar, inclusief subdomeinen), `nosniff`,
`X-Frame-Options: DENY` en CSP `frame-ancestors 'none'`, `no-referrer`,
`Permissions-Policy` en `Cross-Origin-Opener-Policy`. De rest van de CSP staat
als meta-tag in elke pagina. `workers_dev` en `preview_urls` staan uit, zodat
er geen tweede publieke kopie op `workers.dev` bestaat.

Een private bronrepo verbergt frontendassets niet.

## Normaal beheer en rollback

Test vóór merge met `npm test`, generator/build en browser-E2E. De verplichte
CI-check hoort dit te herhalen en secret-/artefactchecks te doen. Houd één
vorige gezonde release bij. Een rollback gaat als nieuwe revert-PR door dezelfde
checks; force-push of tijdelijk uitzetten van bescherming is niet de normale route.

Controleer maandelijks GitHub-/DNS-toegang, secret alerts, domeinverlenging,
TLS en HTTP-redirects. Een uptimecheck met HTTP 200 detecteert geen succesvolle
inhoudsmanipulatie: let ook op onverwachte deployment- en accountmeldingen.

Open-Meteo Free is voor niet-commercieel gebruik en heeft quota, zonder
beschikbaarheidsgarantie. Beoordeel betaalde voorwaarden vóór sponsoring of
andere monetisatie.

## Incident met gewijzigde scripts of service worker

1. Bewaar de verdachte commit, deploymenttijden en gewijzigde instellingen.
   Stel account, herstelmail en DNS veilig vanaf een vertrouwd apparaat;
   verdachte credentials intrekken/roteren, zonder legitieme toegang blind wissen.
2. Publiceer een gezonde release of onderhoudspagina via een gecontroleerde PR.
   Zet DNS niet terug naar GitHub Pages zonder geverifieerd domein.
3. Normale releases krijgen een nieuwe contenthash en schonen de appcaches op.
   De worker serveert geen ontwikkelbestanden uit cache en bewaart geen 503-pagina.
   Test ook een browser die de vorige worker geïnstalleerd heeft.
4. Als de worker echt is vervangen: herstel op dezelfde `/sw.js`-URL met de
   recovery-worker hieronder. Alleen de registratie uit de app verwijderen
   of het workerbestand wissen ruimt bestaande installaties niet op.

```javascript
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: "window" });
    await Promise.all(clients.map((client) => client.navigate(client.url)));
  })());
});
```

Deze recoverycode is alleen voor een bevestigd incident op deze eigen origin;
hij wist alle origin-caches en herlaadt geopende pagina's. Publiceer daarna een
gezonde worker via de gewone releaseprocedure. Volledig offline apparaten
ontvangen herstel pas bij de volgende verbinding. Zo nodig bezoekers uitleggen
hoe zij browser-sitegegevens voor dit domein wissen.

Nooit secrets in dit document, screenshots, workflowcode, logs of frontend
plaatsen. Bij nieuw serverbeheer, accounts of dataopslag een nieuwe
beveiligingsanalyse uitvoeren.
