# vendor/ — bibliothèques tierces hébergées dans le projet

## xlsx.full.min.js — SheetJS 0.20.3 (Apache-2.0, voir `xlsx-LICENSE.txt`)

Utilisé par l'import (CSV, .xls, .xlsx) et l'export Excel. Chargé **à la demande** par `ensureXLSX()`
(`app13-excel-export.js`), avec une empreinte SRI, et mis en cache par le service worker (export hors ligne).

### Pourquoi il est ici et non sur un CDN
La version 0.18.5, dernière publiée sur npm, lisait les fichiers de façon vulnérable :
* **CVE-2023-30533** — pollution de prototype, corrigée en 0.19.3 ;
* **CVE-2024-22363** — déni de service par expression régulière, corrigé en 0.20.2.

Le point d'entrée à risque est l'**import** (un fichier fourni par l'utilisateur). SheetJS ne publie plus les
versions corrigées sur npm : elles ne sont distribuées que par `cdn.sheetjs.com`, que la CSP du projet
n'autorise pas. Hébergé ici, le fichier est de même origine : pas de CDN tiers, SRI vérifiable, export hors ligne.

### Provenance et contrôle (à faire une fois)
Ce fichier n'a **pas** été téléchargé depuis `cdn.sheetjs.com` (inaccessible au moment de l'intégration) mais
depuis npm, où deux mainteneurs sans lien republient les builds officiels : `@e965/xlsx@0.20.3` et
`xlsx-republish@0.20.3`. Leurs fichiers `dist/xlsx.full.min.js`, `dist/xlsx.mini.min.js` et `xlsx.js` sont
**strictement identiques** octet pour octet, la version déclarée est 0.20.3, et le bundle ne contient aucun appel
réseau (ni `fetch`, `XMLHttpRequest`, `eval`, `localStorage`…). Ce n'est pas une preuve : **recoupez avec la source officielle** :

```bash
curl -sL https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js | sha256sum
sha256sum vendor/xlsx.full.min.js
```
Les deux lignes doivent afficher exactement :
```
cc015130aa8521e7f088f88898eba949ccdcbfb38df0bd129b44b7273c3a6f41
```
Si elles diffèrent, **ne déployez pas** : remplacez le fichier par celui de `cdn.sheetjs.com` et recalculez l'empreinte SRI.

* SHA-256 : `cc015130aa8521e7f088f88898eba949ccdcbfb38df0bd129b44b7273c3a6f41`
* SRI (sha384) : `sha384-EnyY0/GSHQGSxSgMwaIPzSESbqoOLSexfnSMN2AP+39Ckmn92stwABZynq1JyzdT`  — c'est la valeur de `sc.integrity` dans `app13-excel-export.js`.

### Mettre à jour
1. Télécharger `https://cdn.sheetjs.com/xlsx-X.Y.Z/package/dist/xlsx.full.min.js` et `.../package/LICENSE`.
2. `openssl dgst -sha384 -binary vendor/xlsx.full.min.js | openssl base64 -A` → préfixer par `sha384-`.
3. Mettre cette empreinte dans `sc.integrity` (`app13-excel-export.js`), incrémenter `SW_VERSION` (`sw.js`).
4. Relancer `tests/e2e/run_tests.sh` : `test_static.py` vérifie l'empreinte et la version (≥ 0.20.2).
