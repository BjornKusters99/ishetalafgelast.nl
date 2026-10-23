# Beveiliging en beheer

De site blijft statisch op GitHub Pages. Beveiliging kan risico verkleinen,
maar geen garantie geven dat ieder apparaat, account en toekomstige wijziging
veilig blijft. Dit document wordt niet in het website-artefact opgenomen.

## Beveiligde publicatie

De beveiligingspatch gebruikt een aparte branch vanaf de live `master`;
bestaande lokale featurewijzigingen zijn niet meegenomen. Publicatie bevat
alleen allowlisted runtimebestanden, met automatische service-worker-cachehash.
PR-tests draaien met read-only rechten zonder secrets; alleen de deploymentjob
op `master` heeft `pages: write` en `id-token: write`.

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
* Voor definitieve oplevering moet `security-checks` als verplichte check zijn
  ingesteld en Pages `build_type=workflow` gebruiken. Controleer deze settings;
  aanwezigheid van YAML alleen bewijst geen succesvolle live deployment.

## Periodieke accountcontrole

De actuele status van account- en registrarcontroles staat niet in deze
publieke repo, maar in de privé overdracht van de eigenaar.

1. GitHub: 2FA/passkeys, recoverycodes, actieve sessies, SSH-sleutels,
   OAuth/GitHub Apps en tokens. Trek alleen rechten in waarvan bevestigd is
   dat ze niet meer nodig zijn. Bewaar recoverycodes offline buiten de repo.
   Bescherm ook de herstelmailbox.
2. Registrar: MFA, accounttoegang, domeinverlenging en herstelgegevens.
3. GitHub account Settings > Pages > Verified domains: het apexdomein blijft
   geverifieerd met de daar uitgegeven TXT-record. Een geldig TLS-certificaat
   is geen bewijs van deze eigenaarsverificatie. Geen zelfbedachte
   challengewaarde gebruiken of domein loskoppelen als workaround.

Geef automatisering alleen de repo- en deployrechten die nodig zijn.

## Grenzen van GitHub Pages

GitHub Pages levert geen door dit project ingestelde responseheaders voor
HSTS, `X-Content-Type-Options` of CSP `frame-ancestors`. De CSP-meta-tag beperkt
scripts/API-hosts en blokkeert objecten; `no-referrer` voorkomt URL-referrers.
Meta-tags zijn geen vervanging voor echte HTTP-headers tegen framing.

Voor eigen HTTP-securityheaders is een host/edge-laag nodig die ze ondersteunt.
Er is geen betaalde migratie, nieuw DNS-pad, proxy of cloudresource aangemaakt.
Beoordeel die route apart als frameblokkering of HSTS vereist is. Voeg geen
`_headers`-bestand toe in de veronderstelling dat Pages dit toepast.

Een private bronrepo verbergt frontendassets niet. Verander zichtbaarheid niet
zonder controle van GitHub-plan en Pages-ondersteuning: de site kan uitvallen.
Bij migratie eerst nieuwe hosting, certificaten en DNS testen, pas na propagatie
en rollbackvenster de oude Pages-binding verwijderen. Geen verlaten GitHub-DNS
achterlaten. Verificatie en HTTPS actief houden tijdens de overgang.

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
andere monetisatie. Er is geen externe analytics- of trackingdienst toegevoegd.

## Incident met gewijzigde scripts of service worker

1. Bewaar de verdachte commit, deploymenttijden en gewijzigde instellingen.
   Stel account, herstelmail en DNS veilig vanaf een vertrouwd apparaat;
   verdachte credentials intrekken/roteren, zonder legitieme toegang blind wissen.
2. Publiceer een gezonde release of onderhoudspagina via een gecontroleerde PR.
   Laat domeinbinding niet los zolang DNS naar Pages wijst.
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
