# Roadmap nieuwe features

De audit van oktober 2026 is afgerond (zie
[IMPLEMENTATIEPLAN.md](IMPLEMENTATIEPLAN.md)). Hierna bouwen we nieuwe
features. Elke feature krijgt een uitwerking in `docs/features/`, een
milestone en een tracking-issue in GitHub, en per taak een sub-issue.
Werkwijze per taak is dezelfde als bij de audit
([werkwijze](IMPLEMENTATIEPLAN.md#werkwijze-per-taak)): de PR sluit de issue
(`Closes #n`) en zet de status hieronder op ✅.

## Volgorde

| Feature | Onderwerp | Uitwerking | Tracking | Status |
| --- | --- | --- | --- | --- |
| F01 | Opstelling maken en delen, met de afgelastingskans erbij | [F01-opstelling.md](features/F01-opstelling.md) | [#65](https://github.com/BjornKusters99/ishetalafgelast.nl/issues/65) | Gepland |

F01 gaat eerst: de opstelling gaat elke vrijdag- en zaterdagavond in de
teamapp rond, nu uit een andere app. Als hij hier gemaakt wordt, met de kans
op afgelasting erbij, opent het hele team de site in plaats van één persoon.
Liefst live vóór de eerste vorstweekenden.

## F01 Opstelling maken en delen

Milestone **F01 Opstelling maken en delen**, label `f01-opstelling`.

| Taak | Issue | Onderwerp | Status |
| --- | --- | --- | --- |
| F01-1 | [#60](https://github.com/BjornKusters99/ishetalafgelast.nl/issues/60) | Opstellingskern: formaties, linkformaat en validatie | ☐ |
| F01-2 | [#61](https://github.com/BjornKusters99/ishetalafgelast.nl/issues/61) | Opstelling maken op /opstelling | ☐ |
| F01-3 | [#62](https://github.com/BjornKusters99/ishetalafgelast.nl/issues/62) | Delen en ontvangen met live kans | ☐ |
| F01-4 | [#63](https://github.com/BjornKusters99/ishetalafgelast.nl/issues/63) | Koppeling met de check | ☐ |
| F01-5 | [#64](https://github.com/BjornKusters99/ishetalafgelast.nl/issues/64) | Privacy, vindbaarheid en livegang | ☐ |

Fase 2 (deelplaatje, 7-tal, selectie delen met mede-trainer) krijgt issues
na de livegang van fase 1.

## Kandidaten

Nog niet ingepland, eerst een keuze van de eigenaar:

- Analytics, nodig om te meten of een feature werkt (#4).
- Aan- en afmelden voor een wedstrijd (vraagt een backend).
