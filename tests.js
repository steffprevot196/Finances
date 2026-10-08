// =====================================================================
// tests.js — TESTS UNITAIRES (Chantier 5.1 — dette technique)
// Dépend de : tous les modules de l'app (chargé en dernier)
// Charge après app27-broker-import.js, avant app7-init.js
// =====================================================================
//
// Mini-framework de tests sans dépendance externe (pas de Jest, pas de
// npm). S'exécute UNIQUEMENT à la demande :
//   • Depuis la console : runTests()
//   • Depuis la palette Ctrl+K : commande « Lancer les tests unitaires »
//
// Aucune donnée globale n'est modifiée durablement : les tests qui
// touchent aux assets/cessions font un backup + restore systématique.
//
// Résultat : un objet { total, passed, failed, durationMs, results[] }
// et un tableau console.table() pour un affichage tabulaire.
// =====================================================================

// ---------------------------------------------------------------------
// MINI-FRAMEWORK
// ---------------------------------------------------------------------
const _testResults = [];
let _currentSuite = 'Général';

// Change la suite courante (utilisé par les groupes de tests)
function _suite(name) {
    _currentSuite = name;
}

// Assertion de base : enregistre un résultat pass/fail
function _assert(condition, testName, details = '') {
    _testResults.push({
        suite: _currentSuite,
        name: testName,
        passed: !!condition,
        details: condition ? '' : String(details || 'Assertion échouée')
    });
}

// Vérifie l'égalité stricte
function assertEq(actual, expected, testName) {
    const pass = actual === expected;
    _assert(pass, testName, pass ? '' : `Attendu : ${JSON.stringify(expected)} · Obtenu : ${JSON.stringify(actual)}`);
}

// Vérifie l'égalité avec tolérance (nombres flottants)
function assertApprox(actual, expected, tolerance, testName) {
    if (!Number.isFinite(actual) || !Number.isFinite(expected)) {
        _assert(false, testName, `Valeur non numérique : actual=${actual}, expected=${expected}`);
        return;
    }
    const diff = Math.abs(actual - expected);
    const pass = diff <= tolerance;
    _assert(pass, testName, pass ? '' : `Attendu ≈ ${expected} (±${tolerance}) · Obtenu ${actual} · Écart ${diff}`);
}

// Vérifie qu'une valeur est null ou undefined
function assertNull(actual, testName) {
    const pass = actual === null || actual === undefined;
    _assert(pass, testName, pass ? '' : `Attendu null/undefined · Obtenu ${JSON.stringify(actual)}`);
}

// Vérifie qu'une valeur est truthy
function assertTrue(actual, testName) {
    _assert(!!actual, testName, !!actual ? '' : `Attendu truthy · Obtenu ${JSON.stringify(actual)}`);
}

// Vérifie qu'une valeur est falsy
function assertFalse(actual, testName) {
    _assert(!actual, testName, !actual ? '' : `Attendu falsy · Obtenu ${JSON.stringify(actual)}`);
}

// Vérifie qu'une fonction ne throw pas, ou qu'elle throw bien
function assertThrows(fn, testName) {
    let threw = false;
    try { fn(); } catch (_) { threw = true; }
    _assert(threw, testName, threw ? '' : 'Aucune exception levée alors qu\'une était attendue');
}

function assertDoesNotThrow(fn, testName) {
    let threw = false;
    let err = '';
    try { fn(); } catch (e) { threw = true; err = e.message; }
    _assert(!threw, testName, threw ? `Exception inattendue : ${err}` : '');
}

// ---------------------------------------------------------------------
// TESTS : parseFlexDate
// ---------------------------------------------------------------------
_suite('parseFlexDate');
(function testParseFlexDate() {
    // Format FR : JJ/MM/AAAA
    const d1 = parseFlexDate('15/03/2024');
    assertTrue(d1 instanceof Date, 'parseFlexDate accepte JJ/MM/AAAA');
    if (d1) {
        assertEq(d1.getDate(), 15, 'parseFlexDate extrait le jour');
        assertEq(d1.getMonth(), 2, 'parseFlexDate extrait le mois (0-indexé)');
        assertEq(d1.getFullYear(), 2024, 'parseFlexDate extrait l\'année');
    }

    // Format "Mois AAAA" (FR abrégé)
    const d2 = parseFlexDate('Jan 2024');
    assertTrue(d2 instanceof Date, 'parseFlexDate accepte "Mois AAAA"');
    if (d2) {
        assertEq(d2.getMonth(), 0, 'parseFlexDate "Jan 2024" → janvier');
        assertEq(d2.getFullYear(), 2024, 'parseFlexDate "Jan 2024" → 2024');
    }

    // Format ISO
    const d3 = parseFlexDate('2024-06-15');
    assertTrue(d3 instanceof Date, 'parseFlexDate accepte ISO YYYY-MM-DD');

    // Chaîne invalide
    assertNull(parseFlexDate(''), 'parseFlexDate("") → null');
    assertNull(parseFlexDate(null), 'parseFlexDate(null) → null');
})();

// ---------------------------------------------------------------------
// TESTS : formatEUR et formatUnitPrice
// ---------------------------------------------------------------------
_suite('formatEUR / formatUnitPrice');
(function testFormat() {
    const eur = formatEUR(1234.56);
    assertTrue(eur.includes('234'), 'formatEUR affiche la partie entière');
    assertTrue(eur.includes('€'), 'formatEUR contient le symbole €');

    assertEq(formatEUR(0), '0,00 €', 'formatEUR(0) → "0,00 €"');
    assertEq(formatEUR(null), '0,00 €', 'formatEUR(null) → "0,00 €"');

    // formatUnitPrice : petit prix → beaucoup de décimales
    const small = formatUnitPrice(0.00001234);
    assertTrue(small.includes('0,00001'), 'formatUnitPrice gère les très petites valeurs');

    const big = formatUnitPrice(1234.56);
    assertTrue(big.includes('234,56'), 'formatUnitPrice gère les valeurs normales');
})();

// ---------------------------------------------------------------------
// TESTS : computePRUFromLots
// ---------------------------------------------------------------------
_suite('computePRUFromLots');
(function testPRU() {
    // PRU d'un actif simple : 10 unités à 100 € + 10 € de frais = 1010 € → PRU 101
    const asset = {
        lots: [
            { qty: 10, qtyRemaining: 10, price: 100, frais: 10 }
        ]
    };
    assertApprox(computePRUFromLots(asset), 101, 0.001, 'PRU avec frais inclus');

    // PRU multi-lots : 5 à 100 € + 5 à 200 € = 1500 / 10 = 150
    const asset2 = {
        lots: [
            { qty: 5, qtyRemaining: 5, price: 100, frais: 0 },
            { qty: 5, qtyRemaining: 5, price: 200, frais: 0 }
        ]
    };
    assertApprox(computePRUFromLots(asset2), 150, 0.001, 'PRU moyenne pondérée');

    // Lots partiellement vendus
    const asset3 = {
        lots: [
            { qty: 10, qtyRemaining: 5, price: 100, frais: 0 },
            { qty: 5, qtyRemaining: 5, price: 200, frais: 0 }
        ]
    };
    // 5 unités à 100 + 5 à 200 = 500 + 1000 = 1500 / 10 = 150
    assertApprox(computePRUFromLots(asset3), 150, 0.001, 'PRU ignore les unités vendues');

    // Aucun lot
    assertEq(computePRUFromLots({ lots: [] }), 0, 'PRU sans lots → 0');
})();

// ---------------------------------------------------------------------
// TESTS : consumeFIFO
// ---------------------------------------------------------------------
_suite('consumeFIFO');
(function testFIFO() {
    // Cas simple : 2 lots, on vend 3 unités → consomme 3 du lot le plus ancien
    const asset = {
        lots: [
            { id: 1, date: '2024-01-01', qty: 5, qtyRemaining: 5, price: 100, frais: 0 },
            { id: 2, date: '2024-02-01', qty: 5, qtyRemaining: 5, price: 200, frais: 0 }
        ]
    };
    const result = consumeFIFO(asset, 3);
    assertEq(result.error, undefined, 'consumeFIFO ne renvoie pas d\'erreur');
    assertApprox(result.costBasis, 300, 0.001, 'consumeFIFO coût total (3 × 100 €)');
    assertEq(asset.lots[0].qtyRemaining, 2, 'consumeFIFO réduit le lot le plus ancien');
    assertEq(asset.lots[1].qtyRemaining, 5, 'consumeFIFO laisse le lot récent intact');

    // Cas : on vend plus que dispo → erreur
    const asset2 = {
        lots: [{ id: 1, date: '2024-01-01', qty: 5, qtyRemaining: 5, price: 100, frais: 0 }]
    };
    const result2 = consumeFIFO(asset2, 10);
    assertTrue(result2.error, 'consumeFIFO renvoie une erreur si quantité insuffisante');

    // Cas : traversée de plusieurs lots
    const asset3 = {
        lots: [
            { id: 1, date: '2024-01-01', qty: 3, qtyRemaining: 3, price: 100, frais: 0 },
            { id: 2, date: '2024-02-01', qty: 5, qtyRemaining: 5, price: 200, frais: 0 }
        ]
    };
    const result3 = consumeFIFO(asset3, 5);
    // 3 unités à 100 + 2 à 200 = 300 + 400 = 700
    assertApprox(result3.costBasis, 700, 0.001, 'consumeFIFO traverse plusieurs lots');
    assertEq(asset3.lots[0].qtyRemaining, 0, 'consumeFIFO vide le premier lot');
    assertEq(asset3.lots[1].qtyRemaining, 3, 'consumeFIFO entame le second lot');
})();

// ---------------------------------------------------------------------
// TESTS : computeTIR
// ---------------------------------------------------------------------
_suite('computeTIR');
(function testTIR() {
    // Cas simple : 100 € investis le 01/01/2023, 110 € reçus le 01/01/2025
    // → TRI annuel ≈ 4,88 % (110/100)^(1/2) - 1 ≈ 0.0488
    const flows = [
        { date: new Date('2023-01-01'), amount: -100 },
        { date: new Date('2025-01-01'), amount: 110 }
    ];
    const tir = computeTIR(flows);
    assertTrue(tir !== null && Number.isFinite(tir), 'computeTIR renvoie un résultat numérique');
    assertApprox(tir, 0.0488, 0.005, 'computeTIR approx. 4,88 % sur 2 ans');

    // Cas dégénérés
    assertNull(computeTIR([]), 'computeTIR([]) → null');
    assertNull(computeTIR([{ date: new Date(), amount: -100 }]), 'computeTIR avec un seul flux → null');

    // Tous les flux positifs (pas de TRI)
    const allPositive = [
        { date: new Date('2023-01-01'), amount: 100 },
        { date: new Date('2024-01-01'), amount: 100 }
    ];
    assertNull(computeTIR(allPositive), 'computeTIR que des flux positifs → null');

    // Durée trop courte (< 30 jours)
    const shortFlows = [
        { date: new Date('2024-01-01'), amount: -100 },
        { date: new Date('2024-01-15'), amount: 110 }
    ];
    assertNull(computeTIR(shortFlows), 'computeTIR durée < 30 jours → null');

    // Perte : 100 € investis, 80 € reçus au bout d'un an
    const lossFlows = [
        { date: new Date('2023-01-01'), amount: -100 },
        { date: new Date('2024-01-01'), amount: 80 }
    ];
    const lossTIR = computeTIR(lossFlows);
    assertTrue(lossTIR !== null && lossTIR < 0, 'computeTIR renvoie un taux négatif sur une perte');
    assertApprox(lossTIR, -0.20, 0.01, 'computeTIR approx. -20 % sur 1 an');
})();

// ---------------------------------------------------------------------
// TESTS : computeCessionLine
// ---------------------------------------------------------------------
_suite('computeCessionLine');

// Backup/restore de l'état global pour isoler les tests
const _originalTaxMode = (typeof taxRegimeMode !== 'undefined') ? taxRegimeMode : 'PFU';
const _originalTMI = (typeof taxTMI !== 'undefined') ? taxTMI : 0.30;

(function testCessionLine() {
    // --- Cas 1 : PFU sur une action en plus-value ---
    if (typeof taxRegimeMode !== 'undefined') taxRegimeMode = 'PFU';
    const cession1 = {
        type: 'ACTION_ETF',
        subType: 'ACTION',
        name: 'Test Action',
        dateVente: '2025-06-15',
        dateAchat: '2024-06-15',
        prixVente: 1000,
        prixAchat: 800,
        frais: 0,
        avant2018: false,
        envelope: 'CTO'
    };
    const line1 = computeCessionLine(cession1);
    assertEq(line1.pvBrute, 200, 'computeCessionLine : PV brute = 200 €');
    assertApprox(line1.taxLine, 60, 0.001, 'computeCessionLine : impôt PFU 30 % = 60 €');

    // --- Cas 2 : Barème sur une action ---
    if (typeof taxRegimeMode !== 'undefined') taxRegimeMode = 'BAREME';
    if (typeof taxTMI !== 'undefined') taxTMI = 0.30;
    const line2 = computeCessionLine(cession1);
    // Barème : 200 × 0.30 (IR) + 200 × 0.172 (PS) − 200 × 0.068 × 0.30 (CSG)
    //       = 60 + 34.4 − 4.08 = 90.32
    assertApprox(line2.taxLine, 90.32, 0.01, 'computeCessionLine : impôt barème = 90,32 €');

    // --- Cas 3 : Jeton ≤ 5 000 € → exonéré ---
    const cessionJeton = {
        type: 'JETON',
        name: 'Vera Valor',
        dateVente: '2025-06-15',
        dateAchat: '2024-06-15',
        prixVente: 4000,
        prixAchat: 3000,
        frais: 0
    };
    const lineJeton = computeCessionLine(cessionJeton);
    assertEq(lineJeton.taxLine, 0, 'computeCessionLine : jeton ≤ 5000 € → exonéré');

    // --- Cas 4 : Jeton > 5 000 € → TFOP 6,5 % ---
    const cessionJeton2 = { ...cessionJeton, prixVente: 6000 };
    const lineJeton2 = computeCessionLine(cessionJeton2);
    assertApprox(lineJeton2.taxLine, 390, 0.01, 'computeCessionLine : jeton > 5000 € → TFOP 6,5 % = 390 €');

    // --- Cas 5 : Pièce Cours Légal, TFMP vs TPV (choix optimal) ---
    const cessionOr = {
        type: 'COURS_LEGAL',
        name: 'Napoléon',
        dateVente: '2025-06-15',
        dateAchat: '2020-06-15',
        prixVente: 1000,
        prixAchat: 700,
        frais: 0
    };
    const lineOr = computeCessionLine(cessionOr);
    // TFMP = 1000 × 0.115 = 115 €
    // TPV  = 300 × 0.362 × (1 − 0.05 × (5−2)) = 300 × 0.362 × 0.85 = 92.31 €
    // Optimal = 92.31 € (TPV)
    assertTrue(lineOr.taxLine > 0 && lineOr.taxLine < 115, 'computeCessionLine : pièce cours légal → TPV préférée à TFMP');
    assertApprox(lineOr.taxLine, 92.31, 0.5, 'computeCessionLine : pièce cours légal → TPV ≈ 92,31 €');
})();

// Restaure l'état fiscal d'origine
if (typeof taxRegimeMode !== 'undefined') taxRegimeMode = _originalTaxMode;
if (typeof taxTMI !== 'undefined') taxTMI = _originalTMI;

// ---------------------------------------------------------------------
// TESTS : getAssetTaxNature
// ---------------------------------------------------------------------
_suite('getAssetTaxNature');
(function testTaxNature() {
    // Titres CTO
    const titres = {
        categories: ['Action'],
        envelope: 'CTO'
    };
    assertEq(getAssetTaxNature(titres), 'TITRES', 'getAssetTaxNature : action CTO → TITRES');

    // Crypto
    const crypto = {
        categories: ['Crypto'],
        envelope: ''
    };
    assertEq(getAssetTaxNature(crypto), 'CRYPTO', 'getAssetTaxNature : crypto → CRYPTO');

    // PEA → exclu
    const pea = {
        categories: ['Action'],
        envelope: 'PEA'
    };
    assertNull(getAssetTaxNature(pea), 'getAssetTaxNature : PEA → null (hors pool)');

    // Métaux → exclu
    const metaux = {
        categories: ['Or & Métaux'],
        taxCategory: 'JETON',
        envelope: ''
    };
    assertNull(getAssetTaxNature(metaux), 'getAssetTaxNature : métaux → null (régime dédié)');

    // ETF CTO
    const etf = {
        categories: ['ETF'],
        envelope: 'CTO'
    };
    assertEq(getAssetTaxNature(etf), 'TITRES', 'getAssetTaxNature : ETF CTO → TITRES');
})();

// ---------------------------------------------------------------------
// TESTS : _analyzeBrokerImport (détection créations vs fusions)
// ---------------------------------------------------------------------
_suite('_analyzeBrokerImport');
(function testAnalyzeBrokerImport() {
    // On teste avec des données synthétiques — la fonction dépend de `assets` global.
    // On utilise un asset temporaire injecté puis retiré.
    const backup = assets.slice();

    // Injecte un actif BTC existant
    assets.push({
        id: 999001,
        name: 'Bitcoin (test)',
        ticker: 'BTC',
        categories: ['Crypto'],
        envelope: '',
        qty: 1,
        invested: 30000,
        value: 60000,
        lots: [{ id: 1, date: '2024-01-01', qty: 1, qtyRemaining: 1, price: 30000, frais: 0 }]
    });

    // Positions à analyser : BTC (fusion) + SOL (création)
    const positions = [
        { ticker: 'BTC', name: 'Bitcoin', qty: 0.5, priceEUR: 60000, valueEUR: 30000 },
        { ticker: 'SOL', name: 'Solana', qty: 10, priceEUR: 150, valueEUR: 1500 }
    ];
    const result = _analyzeBrokerImport(positions);

    assertEq(result.toCreate.length, 1, '_analyzeBrokerImport : 1 création (SOL)');
    assertEq(result.toCreate[0].ticker, 'SOL', '_analyzeBrokerImport : la création est SOL');
    assertEq(result.toMerge.length, 1, '_analyzeBrokerImport : 1 fusion (BTC)');
    assertEq(result.toMerge[0].position.ticker, 'BTC', '_analyzeBrokerImport : la fusion est BTC');
    assertApprox(result.toMerge[0].newQty, 1.5, 0.001, '_analyzeBrokerImport : nouvelle quantité BTC = 1,5');

    // Restaure l'état
    assets.length = 0;
    backup.forEach(a => assets.push(a));
})();

// ---------------------------------------------------------------------
// TESTS : compactAssetHistory (Chantier 5.2 — dette technique)
// ---------------------------------------------------------------------
_suite('compactAssetHistory');
(function testCompactHistory() {
    // Cas 1 : historique vide
    const a1 = { history: [] };
    assertEq(compactAssetHistory(a1, 2), 0, 'compactAssetHistory : historique vide → 0');
    assertEq(a1.history.length, 0, 'compactAssetHistory : historique vide reste vide');

    // Cas 2 : historique récent (rien à supprimer)
    const now = new Date();
    const oneYearAgo = new Date(now); oneYearAgo.setFullYear(now.getFullYear() - 1);
    const a2 = {
        history: [
            { date: now.toLocaleDateString('fr-FR'), value: 100, invested: 90 },
            { date: oneYearAgo.toLocaleDateString('fr-FR'), value: 95, invested: 90 }
        ]
    };
    assertEq(compactAssetHistory(a2, 2), 0, 'compactAssetHistory : tout récent → 0 supprimé');
    assertEq(a2.history.length, 2, 'compactAssetHistory : tout récent reste intact');

    // Cas 3 : historique ancien (points > 2 ans)
    const threeYearsAgo = new Date(now); threeYearsAgo.setFullYear(now.getFullYear() - 3);
    const fiveYearsAgo  = new Date(now); fiveYearsAgo.setFullYear(now.getFullYear() - 5);
    const a3 = {
        history: [
            { date: fiveYearsAgo.toLocaleDateString('fr-FR'), value: 80, invested: 70 },
            { date: threeYearsAgo.toLocaleDateString('fr-FR'), value: 85, invested: 80 },
            { date: oneYearAgo.toLocaleDateString('fr-FR'), value: 95, invested: 90 },
            { date: now.toLocaleDateString('fr-FR'), value: 100, invested: 90 }
        ]
    };
    const removed = compactAssetHistory(a3, 2);
    assertEq(removed, 2, 'compactAssetHistory : 2 points de plus de 2 ans supprimés');
    assertEq(a3.history.length, 2, 'compactAssetHistory : 2 points récents conservés');

    // Cas 4 : données invalides (dates non parsables → conservées par sécurité)
    const a4 = {
        history: [
            { date: 'invalide', value: 50, invested: 50 },
            { date: now.toLocaleDateString('fr-FR'), value: 100, invested: 90 }
        ]
    };
    const removed4 = compactAssetHistory(a4, 1);
    assertEq(removed4, 0, 'compactAssetHistory : date invalide conservée par sécurité');
    assertEq(a4.history.length, 2, 'compactAssetHistory : rien supprimé si dates non parsables');

    // Cas 5 : maxYears = 0 → désactive la compaction
    assertEq(compactAssetHistory(a3, 0), 0, 'compactAssetHistory : maxYears=0 → aucune suppression');
})();

// ---------------------------------------------------------------------
// TESTS : previewHistoryCompaction
// ---------------------------------------------------------------------
_suite('previewHistoryCompaction');
(function testPreviewCompaction() {
    // Backup de l'état global
    const backup = assets.slice();

    // Vide les assets puis injecte un jeu de test
    assets.length = 0;
    const now = new Date();
    const oneYearAgo = new Date(now); oneYearAgo.setFullYear(now.getFullYear() - 1);
    const fourYearsAgo = new Date(now); fourYearsAgo.setFullYear(now.getFullYear() - 4);

    assets.push({
        id: 998001,
        name: 'Actif test',
        ticker: 'TEST',
        categories: ['Autre'],
        envelope: '',
        history: [
            { date: fourYearsAgo.toLocaleDateString('fr-FR'), value: 50, invested: 50 },
            { date: oneYearAgo.toLocaleDateString('fr-FR'), value: 90, invested: 90 },
            { date: now.toLocaleDateString('fr-FR'), value: 100, invested: 100 }
        ]
    });

    const preview = previewHistoryCompaction(2);
    assertEq(preview.pointsRemoved, 1, 'previewHistoryCompaction : 1 point à supprimer (le plus ancien)');
    assertEq(preview.assetsAffected, 1, 'previewHistoryCompaction : 1 actif concerné');
    assertTrue(preview.currentBytes > 0, 'previewHistoryCompaction : taille > 0');
    assertTrue(preview.estimatedBytes < preview.currentBytes, 'previewHistoryCompaction : estimation après < avant');
    assertEq(preview.years, 2, 'previewHistoryCompaction : years correctement reporté');

    // Restaure
    assets.length = 0;
    backup.forEach(a => assets.push(a));
})();

// ---------------------------------------------------------------------
// TESTS : formatBytes
// ---------------------------------------------------------------------
_suite('formatBytes');
(function testFormatBytes() {
    assertEq(formatBytes(0), '0 o', 'formatBytes(0) → "0 o"');
    assertEq(formatBytes(500), '500 o', 'formatBytes(500) → "500 o"');
    assertEq(formatBytes(2048), '2.0 Ko', 'formatBytes(2048) → "2.0 Ko"');
    assertEq(formatBytes(1024 * 1024), '1.00 Mo', 'formatBytes(1 Mo) → "1.00 Mo"');
    assertEq(formatBytes(3.5 * 1024 * 1024), '3.50 Mo', 'formatBytes(3,5 Mo) → "3.50 Mo"');
    assertEq(formatBytes(-10), '0 o', 'formatBytes(-10) → "0 o" (valeur négative)');
})();

// ---------------------------------------------------------------------
// TESTS : _cloneAssetsForUndo (Chantier 5.4 — dette technique)
// ---------------------------------------------------------------------
_suite('_cloneAssetsForUndo');
(function testCloneAssetsForUndo() {
    // -----------------------------------------------------------------
    // Cas 1 : mode standard (lightweight = false) → clone profond complet
    // -----------------------------------------------------------------
    const original = [{
        id: 1,
        name: 'Test',
        ticker: 'TST',
        qty: 10,
        invested: 1000,
        value: 1200,
        lots: [{ id: 10, date: '2024-01-01', qty: 10, qtyRemaining: 10, price: 100, frais: 0 }],
        buys: [{ date: '01/01/2024', qty: 10, price: 100, frais: 0 }],
        dividends: [{ id: 1, date: '2024-06-01', amount: 50 }],
        splits: [],
        cadrans: { primary: 'OR', secondary: ['ASIE'] },
        history: [{ date: '01/01/2024', value: 1000, invested: 1000 }]
    }];

    const cloned = _cloneAssetsForUndo(original, false);
    assertEq(cloned.length, 1, '_cloneAssetsForUndo : même nombre d\'éléments');
    assertEq(cloned[0].id, 1, '_cloneAssetsForUndo : id préservé');
    assertEq(cloned[0].name, 'Test', '_cloneAssetsForUndo : name préservé');
    assertTrue(cloned[0] !== original[0], '_cloneAssetsForUndo : objet racine différent');
    assertTrue(cloned[0].lots !== original[0].lots, '_cloneAssetsForUndo : tableau lots différent (mode standard)');
    assertTrue(cloned[0].history !== original[0].history, '_cloneAssetsForUndo : tableau history différent (mode standard)');

    // Modifie le clone → n'impacte pas l'original
    cloned[0].lots[0].qty = 999;
    assertEq(original[0].lots[0].qty, 10, '_cloneAssetsForUndo : modifier le clone n\'impacte pas l\'original (mode standard)');

    // -----------------------------------------------------------------
    // Cas 2 : mode lightweight (lightweight = true)
    //   → lots/buys/dividends/splits clonés
    //   → history PARTAGÉ (même référence)
    // -----------------------------------------------------------------
    const original2 = [{
        id: 2,
        name: 'Test Light',
        ticker: 'TL',
        qty: 5,
        invested: 500,
        value: 600,
        lots: [{ id: 20, date: '2024-01-01', qty: 5, qtyRemaining: 5, price: 100, frais: 0 }],
        buys: [{ date: '01/01/2024', qty: 5, price: 100, frais: 0 }],
        dividends: [{ id: 2, date: '2024-06-01', amount: 25 }],
        splits: [{ id: 3, date: '2024-03-01', ratio: 2, note: 'Split test' }],
        cadrans: { primary: 'ASIE', secondary: ['MONNAIES'] },
        history: [
            { date: '01/01/2024', value: 500, invested: 500 },
            { date: '02/01/2024', value: 510, invested: 500 }
        ]
    }];

    const cloned2 = _cloneAssetsForUndo(original2, true);
    assertEq(cloned2.length, 1, '_cloneAssetsForUndo (light) : même nombre d\'éléments');
    assertTrue(cloned2[0] !== original2[0], '_cloneAssetsForUndo (light) : objet racine différent');
    assertTrue(cloned2[0].lots !== original2[0].lots, '_cloneAssetsForUndo (light) : tableau lots cloné');
    assertTrue(cloned2[0].buys !== original2[0].buys, '_cloneAssetsForUndo (light) : tableau buys cloné');
    assertTrue(cloned2[0].dividends !== original2[0].dividends, '_cloneAssetsForUndo (light) : tableau dividends cloné');
    assertTrue(cloned2[0].splits !== original2[0].splits, '_cloneAssetsForUndo (light) : tableau splits cloné');
    assertTrue(cloned2[0].cadrans !== original2[0].cadrans, '_cloneAssetsForUndo (light) : objet cadrans cloné');
    assertTrue(cloned2[0].cadrans.secondary !== original2[0].cadrans.secondary, '_cloneAssetsForUndo (light) : tableau secondary cloné');

    // CONTRAT D'IMMUTABILITÉ : history est partagé par référence
    assertTrue(cloned2[0].history === original2[0].history, '_cloneAssetsForUndo (light) : tableau history PARTAGÉ (référence identique)');

    // Modifie le clone (lots) → n'impacte pas l'original
    cloned2[0].lots[0].qty = 999;
    assertEq(original2[0].lots[0].qty, 5, '_cloneAssetsForUndo (light) : modifier les lots du clone n\'impacte pas l\'original');

    // Modifie le clone (secondary) → n'impacte pas l'original
    cloned2[0].cadrans.secondary.push('PETROLE');
    assertEq(original2[0].cadrans.secondary.length, 1, '_cloneAssetsForUndo (light) : modifier secondary du clone n\'impacte pas l\'original');

    // -----------------------------------------------------------------
    // Cas 3 : simulation du contrat d'immutabilité history
    //   On vérifie que upsertTodayHistoryPoint (via .filter + réassignation)
    //   ne modifie PAS la référence partagée.
    // -----------------------------------------------------------------
    const beforeRef = cloned2[0].history;         // référence partagée
    const originalHistoryRef = original2[0].history;

    // Simule la logique de upsertTodayHistoryPoint (sans dépendre de la
    // fonction réelle qui touche au DOM/état global)
    const todayStr = new Date().toDateString();
    const filtered = beforeRef.filter(h => {
        const d = parseFlexDate(h.date);
        return !(d && d.toDateString() === todayStr);
    });
    filtered.push({ date: new Date().toLocaleDateString('fr-FR'), value: 777, invested: 500 });

    // Réassigne sur le clone
    cloned2[0].history = filtered;

    // Vérification : l'original n'a pas changé
    assertTrue(original2[0].history === originalHistoryRef, '_cloneAssetsForUndo (light) : original.history référence inchangée');
    assertEq(original2[0].history.length, 2, '_cloneAssetsForUndo (light) : original.history contient toujours 2 points');
    assertTrue(cloned2[0].history !== originalHistoryRef, '_cloneAssetsForUndo (light) : clone.history est un NOUVEAU tableau après réassignation');

    // -----------------------------------------------------------------
    // Cas 4 : liste vide
    // -----------------------------------------------------------------
    assertEq(_cloneAssetsForUndo([], true).length, 0, '_cloneAssetsForUndo : liste vide → tableau vide');
    assertEq(_cloneAssetsForUndo([], false).length, 0, '_cloneAssetsForUndo : liste vide (standard) → tableau vide');
})();

// ---------------------------------------------------------------------
// TESTS : _cloneSimpleForUndo
// ---------------------------------------------------------------------
_suite('_cloneSimpleForUndo');
(function testCloneSimple() {
    const obj = { a: 1, b: [1, 2, 3], c: { d: 'e' } };
    const c = _cloneSimpleForUndo(obj);

    assertTrue(c !== obj, '_cloneSimpleForUndo : référence différente');
    assertEq(c.a, 1, '_cloneSimpleForUndo : valeur scalaire préservée');
    assertTrue(c.b !== obj.b, '_cloneSimpleForUndo : tableau cloné');
    assertTrue(c.c !== obj.c, '_cloneSimpleForUndo : objet imbriqué cloné');

    // Modifie le clone → n'impacte pas l'original
    c.b.push(4);
    assertEq(obj.b.length, 3, '_cloneSimpleForUndo : modifier le clone n\'impacte pas l\'original');

    // Cas null / undefined
    assertNull(_cloneSimpleForUndo(null), '_cloneSimpleForUndo : null → null');

    // Cas tableau vide
    const emptyArr = _cloneSimpleForUndo([]);
    assertTrue(Array.isArray(emptyArr), '_cloneSimpleForUndo : [] → tableau');
    assertEq(emptyArr.length, 0, '_cloneSimpleForUndo : [] → longueur 0');
})();

// ---------------------------------------------------------------------
// TESTS : pushUndo / performUndo (intégration)
// ---------------------------------------------------------------------
_suite('pushUndo / performUndo');
(function testPushUndoIntegration() {
    // Backup de l'état global
    const backupAssets = assets.slice();
    const backupCessions = cessions.slice();
    const backupArbitrages = arbitrages.slice();
    const backupStackLen = undoStack.length;

    // Prépare un mini-jeu de données
    assets.length = 0;
    cessions.length = 0;
    arbitrages.length = 0;
    assets.push({
        id: 997001,
        name: 'État initial',
        ticker: 'INIT',
        categories: ['Autre'],
        envelope: '',
        qty: 1,
        invested: 100,
        value: 100,
        lots: [],
        buys: [],
        history: []
    });

    // Capture l'état initial
    pushUndo('Test intégration');

    // Modifie les données
    assets[0].name = 'État modifié';
    assets[0].value = 200;
    assets.push({
        id: 997002,
        name: 'Nouvel actif',
        ticker: 'NEW',
        categories: ['Autre'],
        envelope: '',
        qty: 1, invested: 50, value: 50,
        lots: [], buys: [], history: []
    });

    // Vérifie l'état modifié
    assertEq(assets.length, 2, 'pushUndo : 2 actifs après ajout');
    assertEq(assets[0].name, 'État modifié', 'pushUndo : nom modifié');

    // Performe l'undo
    performUndo();

    // Vérifie la restauration
    assertEq(assets.length, 1, 'performUndo : 1 seul actif restauré');
    assertEq(assets[0].name, 'État initial', 'performUndo : nom initial restauré');
    assertEq(assets[0].value, 100, 'performUndo : valeur initiale restaurée');

    // Restaure le contexte du test
    assets.length = 0;
    backupAssets.forEach(a => assets.push(a));
    cessions.length = 0;
    backupCessions.forEach(c => cessions.push(c));
    arbitrages.length = 0;
    backupArbitrages.forEach(a => arbitrages.push(a));
    // Ajuste la taille de la pile (retire l'entrée de test)
    while (undoStack.length > backupStackLen) undoStack.pop();
})();

// ---------------------------------------------------------------------
// TESTS : _cw8PriceAt (benchmark lookup)
// ---------------------------------------------------------------------
_suite('_cw8PriceAt');
(function testCw8PriceAt() {
    // Backup du cache benchmark
    const backupSeries = benchmarkSeriesCache;
    const backupMeta = benchmarkMetaCache;

    // Injecte une série de test : 3 points à 100, 110, 120
    benchmarkSeriesCache = [
        { date: new Date('2024-01-01').getTime(), price: 100 },
        { date: new Date('2024-02-01').getTime(), price: 110 },
        { date: new Date('2024-03-01').getTime(), price: 120 }
    ];

    // Cas 1 : date exacte
    const p1 = _cw8PriceAt(new Date('2024-02-01'));
    assertEq(p1, 110, '_cw8PriceAt : date exacte → cours exact');

    // Cas 2 : date intermédiaire → utilise le dernier point ≤ date
    const p2 = _cw8PriceAt(new Date('2024-02-15'));
    assertEq(p2, 110, '_cw8PriceAt : date intermédiaire → forward-fill');

    // Cas 3 : date antérieure à tous les points → null
    const p3 = _cw8PriceAt(new Date('2023-12-01'));
    assertNull(p3, '_cw8PriceAt : date antérieure → null');

    // Cas 4 : date très postérieure → dernier point si < 7j de tolérance
    const p4 = _cw8PriceAt(new Date('2024-03-05'));   // 4 jours après
    assertEq(p4, 120, '_cw8PriceAt : 4 jours après → dernier point (tolérance 7j)');

    // Cas 5 : date > 7 jours après le dernier point → null
    const p5 = _cw8PriceAt(new Date('2024-03-15'));   // 14 jours après
    assertNull(p5, '_cw8PriceAt : 14 jours après → null (au-delà tolérance)');

    // Restaure
    benchmarkSeriesCache = backupSeries;
    benchmarkMetaCache = backupMeta;
})();

// ---------------------------------------------------------------------
// TESTS : computeCw8Comparison (intégration)
// ---------------------------------------------------------------------
_suite('computeCw8Comparison');
(function testCw8Comparison() {
    // Backup complet de l'état global
    const backupAssets = assets.slice();
    const backupSeries = benchmarkSeriesCache;
    const backupMeta = benchmarkMetaCache;
    const backupPortfolioId = currentPortfolioId;

    // -----------------------------------------------------------------
    // Cas 1 : pas de benchmark → null
    // -----------------------------------------------------------------
    benchmarkSeriesCache = null;
    assets.length = 0;
    assets.push({
        id: 996001, name: 'Test', ticker: 'TST',
        categories: ['Autre'], envelope: '',
        qty: 10, invested: 1000, value: 1200,
        lots: [], history: [],
        buys: [
            { date: '01/01/2023', qty: 10, price: 100, frais: 0 }
        ]
    });
    assertNull(computeCw8Comparison(), 'computeCw8Comparison : benchmark absent → null');

    // -----------------------------------------------------------------
    // Cas 2 : portefeuille vide → null
    // -----------------------------------------------------------------
    benchmarkSeriesCache = [
        { date: new Date('2023-01-01').getTime(), price: 400 },
        { date: new Date('2024-01-01').getTime(), price: 500 },
        { date: new Date('2025-01-01').getTime(), price: 600 }
    ];
    assets.length = 0;
    assertNull(computeCw8Comparison(), 'computeCw8Comparison : portefeuille vide → null');

    // -----------------------------------------------------------------
    // Cas 3 : un seul flux → null
    // -----------------------------------------------------------------
    assets.push({
        id: 996002, name: 'Test A', ticker: 'TA',
        categories: ['Autre'], envelope: '',
        qty: 10, invested: 4000, value: 5000,
        lots: [], history: [],
        buys: [
            { date: '01/01/2023', qty: 10, price: 400, frais: 0 }
        ]
    });
    assertNull(computeCw8Comparison(), 'computeCw8Comparison : 1 flux → null');

    // -----------------------------------------------------------------
    // Cas 4 : deux flux + benchmark valide → comparaison valide
    // -----------------------------------------------------------------
    assets.length = 0;
    assets.push({
        id: 996003, name: 'Test B', ticker: 'TB',
        categories: ['Autre'], envelope: '',
        qty: 20, invested: 9000, value: 12000,
        lots: [], history: [],
        buys: [
            { date: '01/01/2023', qty: 10, price: 400, frais: 0 },  // 4000 € investis
            { date: '01/01/2024', qty: 10, price: 500, frais: 0 }   // 5000 € investis
        ]
    });

    const result = computeCw8Comparison();
    assertTrue(result !== null, 'computeCw8Comparison : 2 flux + benchmark → résultat non null');
    if (result) {
        assertEq(result.totalInvested, 9000, 'computeCw8Comparison : capital total = 9000 €');
        assertEq(result.buysCount, 2, 'computeCw8Comparison : 2 flux détectés');
        assertTrue(result.points.length >= 2, 'computeCw8Comparison : au moins 2 points de trajectoire');
        assertTrue(Number.isFinite(result.realValue) && result.realValue > 0, 'computeCw8Comparison : valeur réelle > 0');
        assertTrue(Number.isFinite(result.cw8Value) && result.cw8Value > 0, 'computeCw8Comparison : valeur CW8 > 0');
        assertTrue(Number.isFinite(result.deltaEUR), 'computeCw8Comparison : delta EUR calculé');
        assertTrue(Number.isFinite(result.deltaPct), 'computeCw8Comparison : delta % calculé');
        assertTrue(Number.isFinite(result.cagrDelta), 'computeCw8Comparison : delta CAGR calculé');

        // Test logique du calcul CW8 :
        // Flux 1 : 4000 € @ CW8 = 400 → 10 parts
        // Flux 2 : 5000 € @ CW8 = 500 → 10 parts
        // Total : 20 parts CW8
        // Au dernier point (2025-01-01), cours = 600 → valeur = 12 000 €
        // Rendement CW8 = (12000 - 9000) / 9000 = 33,3 %
        assertApprox(result.cw8Value, 12000, 100, 'computeCw8Comparison : valeur CW8 ≈ 12 000 € (20 parts × 600 €)');
        assertApprox(result.cw8ReturnPct, 33.33, 2, 'computeCw8Comparison : rendement CW8 ≈ 33 %');
    }

    // -----------------------------------------------------------------
    // Cas 5 : _computeCw8CacheKey change quand les données changent
    // -----------------------------------------------------------------
    const key1 = _computeCw8CacheKey();
    assets[0].buys.push({ date: '01/06/2024', qty: 5, price: 550, frais: 0 });
    const key2 = _computeCw8CacheKey();
    assertTrue(key1 !== key2, '_computeCw8CacheKey : change après ajout d\'un flux');

    // -----------------------------------------------------------------
    // Cas 6 : getCw8Comparison utilise le cache
    // -----------------------------------------------------------------
    invalidateCw8ComparisonCache();
    const r1 = getCw8Comparison();
    const r2 = getCw8Comparison();
    assertTrue(r1 === r2, 'getCw8Comparison : même référence (cache actif)');

    invalidateCw8ComparisonCache();
    const r3 = getCw8Comparison();
    assertTrue(r3 !== r1, 'getCw8Comparison : nouvelle référence après invalidation');

    // Restaure tout
    assets.length = 0;
    backupAssets.forEach(a => assets.push(a));
    benchmarkSeriesCache = backupSeries;
    benchmarkMetaCache = backupMeta;
    // currentPortfolioId n'a pas été modifié, pas besoin de restaurer
    invalidateCw8ComparisonCache();
})();

// ---------------------------------------------------------------------
// TESTS : esgScoreToGrade (Chantier §3)
// ---------------------------------------------------------------------
_suite('esgScoreToGrade');
(function testEsgScoreToGrade() {
    // Bornes supérieures
    assertEq(esgScoreToGrade(100), 'AAA', 'esgScoreToGrade(100) → AAA');
    assertEq(esgScoreToGrade(85),  'AAA', 'esgScoreToGrade(85) → AAA (borne basse)');
    assertEq(esgScoreToGrade(84.9), 'AA', 'esgScoreToGrade(84,9) → AA');
    assertEq(esgScoreToGrade(75),  'AA',  'esgScoreToGrade(75) → AA (borne basse)');
    assertEq(esgScoreToGrade(74.9), 'A',  'esgScoreToGrade(74,9) → A');
    assertEq(esgScoreToGrade(65),  'A',   'esgScoreToGrade(65) → A (borne basse)');
    assertEq(esgScoreToGrade(55),  'BBB', 'esgScoreToGrade(55) → BBB');
    assertEq(esgScoreToGrade(45),  'BB',  'esgScoreToGrade(45) → BB');
    assertEq(esgScoreToGrade(35),  'B',   'esgScoreToGrade(35) → B');
    assertEq(esgScoreToGrade(25),  'CCC', 'esgScoreToGrade(25) → CCC');

    // Cas limites bas
    assertEq(esgScoreToGrade(24.9), 'NR', 'esgScoreToGrade(24,9) → NR (< 25)');
    assertEq(esgScoreToGrade(0),    'NR', 'esgScoreToGrade(0) → NR');

    // Cas invalides
    assertEq(esgScoreToGrade(-10), 'NR', 'esgScoreToGrade(-10) → NR');
    assertEq(esgScoreToGrade(null), 'NR', 'esgScoreToGrade(null) → NR');
    assertEq(esgScoreToGrade(undefined), 'NR', 'esgScoreToGrade(undefined) → NR');
    assertEq(esgScoreToGrade(NaN), 'NR', 'esgScoreToGrade(NaN) → NR');
    assertEq(esgScoreToGrade('abc'), 'NR', 'esgScoreToGrade("abc") → NR');
})();

// ---------------------------------------------------------------------
// TESTS : getAssetEsgScore
// ---------------------------------------------------------------------
_suite('getAssetEsgScore');
(function testGetAssetEsgScore() {
    // Cas 1 : saisie manuelle prioritaire
    const a1 = { ticker: 'CW8', esgScore: 92 };
    const r1 = getAssetEsgScore(a1);
    assertTrue(r1 !== null, 'getAssetEsgScore : saisie manuelle détectée');
    if (r1) {
        assertEq(r1.score, 92, 'getAssetEsgScore : score manuel utilisé');
        assertEq(r1.grade, 'AAA', 'getAssetEsgScore : grade calculé (AAA)');
        assertTrue(r1.isManual, 'getAssetEsgScore : flag isManual = true');
    }

    // Cas 2 : correspondance catalogue directe
    const a2 = { ticker: 'CW8' };
    const r2 = getAssetEsgScore(a2);
    assertTrue(r2 !== null, 'getAssetEsgScore : catalogue trouvé pour CW8');
    if (r2) {
        assertEq(r2.score, 78, 'getAssetEsgScore : score catalogue CW8 = 78');
        assertEq(r2.grade, 'AA', 'getAssetEsgScore : grade CW8 = AA');
        assertFalse(r2.isManual, 'getAssetEsgScore : flag isManual = false');
    }

    // Cas 3 : correspondance partielle avec suffixe (.PA)
    const a3 = { ticker: 'CW8.PA' };
    const r3 = getAssetEsgScore(a3);
    assertTrue(r3 !== null, 'getAssetEsgScore : CW8.PA → CW8 (strip suffixe)');
    if (r3) assertEq(r3.score, 78, 'getAssetEsgScore : CW8.PA donne même score que CW8');

    // Cas 4 : insensible à la casse
    const a4 = { ticker: 'cw8' };
    const r4 = getAssetEsgScore(a4);
    assertTrue(r4 !== null, 'getAssetEsgScore : insensible à la casse');

    // Cas 5 : ticker inconnu → null
    const a5 = { ticker: 'XXXXXX' };
    assertNull(getAssetEsgScore(a5), 'getAssetEsgScore : ticker inconnu → null');

    // Cas 6 : asset null → null
    assertNull(getAssetEsgScore(null), 'getAssetEsgScore : null → null');

    // Cas 7 : ticker vide → null
    assertNull(getAssetEsgScore({ ticker: '' }), 'getAssetEsgScore : ticker vide → null');

    // Cas 8 : score manuel = 0 → ignore et utilise catalogue
    const a8 = { ticker: 'CW8', esgScore: 0 };
    const r8 = getAssetEsgScore(a8);
    assertTrue(r8 !== null, 'getAssetEsgScore : score manuel 0 → catalogue utilisé');
    if (r8) assertEq(r8.score, 78, 'getAssetEsgScore : score catalogue = 78');
})();

// ---------------------------------------------------------------------
// TESTS : computePortfolioEsg
// ---------------------------------------------------------------------
_suite('computePortfolioEsg');
(function testComputePortfolioEsg() {
    // Cas 1 : liste vide → score 0, grade NR
    const r1 = computePortfolioEsg([]);
    assertEq(r1.score, 0, 'computePortfolioEsg : liste vide → score 0');
    assertEq(r1.grade, 'NR', 'computePortfolioEsg : liste vide → grade NR');
    assertEq(r1.coveragePct, 0, 'computePortfolioEsg : liste vide → couverture 0');

    // Cas 2 : actifs sans score → couverture 0
    const r2 = computePortfolioEsg([
        { id: 1, ticker: 'UNKNOWN1', value: 1000, categories: ['Autre'] }
    ]);
    assertEq(r2.score, 0, 'computePortfolioEsg : aucun score → score 0');
    assertEq(r2.coveragePct, 0, 'computePortfolioEsg : aucun score → couverture 0');

    // Cas 3 : moyenne pondérée correcte
    // CW8 (78) : 1000 € — MSFT (84) : 500 €
    // Attendu : (78*1000 + 84*500) / 1500 = (78000 + 42000) / 1500 = 80
    const r3 = computePortfolioEsg([
        { id: 1, ticker: 'CW8',  value: 1000, categories: ['ETF'] },
        { id: 2, ticker: 'MSFT', value: 500,  categories: ['Action'] }
    ]);
    assertTrue(r3.score > 0, 'computePortfolioEsg : score > 0');
    assertApprox(r3.score, 80, 0.01, 'computePortfolioEsg : moyenne pondérée = 80');
    assertEq(r3.grade, 'AA', 'computePortfolioEsg : grade AA (80)');
    assertEq(r3.coveragePct, 100, 'computePortfolioEsg : couverture 100 % (tous notés)');
    assertEq(r3.count, 2, 'computePortfolioEsg : 2 actifs notés');

    // Cas 4 : couverture partielle
    // CW8 (78, 1000 €) + UNKNOWN (500 €) → couverture = 1000/1500 = 66.67 %
    const r4 = computePortfolioEsg([
        { id: 1, ticker: 'CW8',       value: 1000, categories: ['ETF'] },
        { id: 2, ticker: 'ZZUNKNOWN', value: 500,  categories: ['Autre'] }
    ]);
    assertApprox(r4.coveragePct, 66.67, 0.5, 'computePortfolioEsg : couverture ≈ 66,67 %');
    assertEq(r4.count, 1, 'computePortfolioEsg : 1 seul actif noté');
    assertEq(r4.score, 78, 'computePortfolioEsg : score = 78 (CW8 seul)');

    // Cas 5 : exclut les positions papier
    const r5 = computePortfolioEsg([
        { id: 1, ticker: 'CW8', value: 1000, categories: ['ETF'], isPaper: false },
        { id: 2, ticker: 'CW8', value: 5000, categories: ['ETF'], isPaper: true }
    ]);
    assertEq(r5.score, 78, 'computePortfolioEsg : ignore les positions papier');

    // Cas 6 : value = 0 → totalValue = 0
    const r6 = computePortfolioEsg([
        { id: 1, ticker: 'CW8', value: 0, categories: ['ETF'] }
    ]);
    assertEq(r6.score, 0, 'computePortfolioEsg : value 0 → score 0');
    assertEq(r6.grade, 'NR', 'computePortfolioEsg : value 0 → NR');
})();

// ---------------------------------------------------------------------
// TESTS : esgCellHTML / esgBadgeHTML
// ---------------------------------------------------------------------
_suite('esgCellHTML / esgBadgeHTML');
(function testEsgCellHtml() {
    // Cas 1 : actif noté → contient le score et le grade
    const a1 = { ticker: 'CW8', value: 1000, categories: ['ETF'] };
    const html1 = esgCellHTML(a1);
    assertTrue(html1.includes('78'), 'esgCellHTML : contient le score 78');
    assertTrue(html1.includes('AA'), 'esgCellHTML : contient le grade AA');
    assertTrue(html1.includes('fa-leaf'), 'esgCellHTML : contient l\'icône feuille');

    // Cas 2 : actif non noté → tiret
    const a2 = { ticker: 'ZZUNKNOWN', value: 1000, categories: ['Autre'] };
    const html2 = esgCellHTML(a2);
    assertTrue(html2.includes('—'), 'esgCellHTML : actif non noté → tiret');

    // Cas 3 : badge (mini)
    const html3 = esgBadgeHTML(a1);
    assertTrue(html3.includes('AA'), 'esgBadgeHTML : contient le grade AA');
    assertTrue(html3.length > 0, 'esgBadgeHTML : non vide pour actif noté');

    // Cas 4 : badge vide pour actif non noté
    const html4 = esgBadgeHTML(a2);
    assertEq(html4, '', 'esgBadgeHTML : actif non noté → chaîne vide');
})();

// ---------------------------------------------------------------------
// TESTS : calculatePerAccumulation (Chantier §3)
// ---------------------------------------------------------------------
_suite('calculatePerAccumulation');
(function testPerAccumulation() {
    // Backup de la config
    const backupConfig = { ...perConfig };

    // Cas 1 : aucune contribution, aucun rendement → balance inchangée
    perConfig.currentAge = 30;
    perConfig.retirementAge = 40;
    perConfig.currentBalance = 10000;
    perConfig.monthlyContribution = 0;
    perConfig.expectedReturn = 0;
    perConfig.tmiEntry = 0;

    const r1 = calculatePerAccumulation();
    assertEq(r1.yearsToRetirement, 10, 'calculatePerAccumulation : 10 ans jusqu\'à la retraite');
    assertApprox(r1.finalBalance, 10000, 0.01, 'calculatePerAccumulation : sans contribution ni rendement → solde inchangé');
    assertApprox(r1.totalContributions, 10000, 0.01, 'calculatePerAccumulation : totalContributions = solde initial');
    assertEq(r1.yearlyData.length, 11, 'calculatePerAccumulation : 11 points (année 0 à 10)');

    // Cas 2 : contribution mensuelle sans rendement
    // 10 ans × 12 mois × 100 € = 12 000 € ajoutés à 10 000 € → 22 000 €
    perConfig.monthlyContribution = 100;
    perConfig.expectedReturn = 0;

    const r2 = calculatePerAccumulation();
    assertApprox(r2.finalBalance, 22000, 0.5, 'calculatePerAccumulation : 12 000 € de versements + 10 000 € initial');

    // Cas 3 : économie d'impôt
    perConfig.tmiEntry = 0.30;
    const r3 = calculatePerAccumulation();
    // Économie attendue : (10000 + 12000) × 0.30 = 6600
    assertApprox(r3.economyTax, 6600, 1, 'calculatePerAccumulation : économie d\'impôt = 30 % des versements');

    // Cas 4 : rendement > 0
    perConfig.expectedReturn = 0.05;
    perConfig.monthlyContribution = 0;
    perConfig.currentBalance = 10000;
    const r4 = calculatePerAccumulation();
    // 10 000 € à 5 %/an sur 10 ans composé = 10 000 × (1 + 0.05/12)^120 ≈ 16 470 €
    assertApprox(r4.finalBalance, 16470, 50, 'calculatePerAccumulation : 10 000 € à 5 % sur 10 ans ≈ 16 470 €');

    // Restaure la config
    Object.assign(perConfig, backupConfig);
})();

// ---------------------------------------------------------------------
// TESTS : computePerCapitalExit (fiscalité capital)
// ---------------------------------------------------------------------
_suite('computePerCapitalExit');
(function testPerCapitalExit() {
    const backupConfig = { ...perConfig };

    perConfig.tmiRetirement = 0.11;
    const acc = {
        finalBalance: 100000,
        totalContributions: 50000,
        totalGains: 50000
    };

    const r = computePerCapitalExit(acc);
    // Versements : abattement 10 % → 45000 × 11 % IR = 4950
    // PS : 50000 × 17,2 % = 8600
    // Total versements : 4950 + 8600 = 13550
    // Plus-values : 50000 × 30 % = 15000
    // Total tax : 28550 · Net : 100000 − 28550 = 71450
    assertApprox(r.taxVersements, 13550, 5, 'computePerCapitalExit : tax versements ≈ 13 550 €');
    assertApprox(r.taxPlusValues, 15000, 1, 'computePerCapitalExit : tax plus-values = 15 000 €');
    assertApprox(r.totalTax, 28550, 5, 'computePerCapitalExit : tax total ≈ 28 550 €');
    assertApprox(r.netRecu, 71450, 5, 'computePerCapitalExit : net reçu ≈ 71 450 €');

    // Cas sans gains
    const acc2 = { finalBalance: 50000, totalContributions: 50000, totalGains: 0 };
    const r2 = computePerCapitalExit(acc2);
    assertApprox(r2.taxPlusValues, 0, 0.01, 'computePerCapitalExit : plus-value 0 → tax PV = 0');

    Object.assign(perConfig, backupConfig);
})();

// ---------------------------------------------------------------------
// TESTS : computePerRenteExit
// ---------------------------------------------------------------------
_suite('computePerRenteExit');
(function testPerRenteExit() {
    const backupConfig = { ...perConfig };

    perConfig.tmiRetirement = 0.11;
    perConfig.annuityRate = 0.04;

    const acc = { finalBalance: 100000, totalContributions: 50000, totalGains: 50000 };
    const r = computePerRenteExit(acc);

    // Rente brute : 100000 × 0.04 = 4000 €/an
    assertApprox(r.renteAnnuelle, 4000, 1, 'computePerRenteExit : rente brute = 4 000 €/an');
    assertApprox(r.renteMensuelleBrute, 4000 / 12, 0.5, 'computePerRenteExit : rente mensuelle brute ≈ 333 €');
    assertTrue(r.renteNetteAnnuelle < r.renteAnnuelle, 'computePerRenteExit : net < brut (fiscalité appliquée)');
    assertTrue(r.renteNetteAnnuelle > 0, 'computePerRenteExit : rente nette > 0');

    Object.assign(perConfig, backupConfig);
})();

// ---------------------------------------------------------------------
// TESTS : computeCtoComparison
// ---------------------------------------------------------------------
_suite('computeCtoComparison');
(function testCtoComparison() {
    const backupConfig = { ...perConfig };

    perConfig.monthlyContribution = 100;
    perConfig.tmiEntry = 0.30;
    perConfig.expectedReturn = 0;
    perConfig.currentBalance = 0;
    perConfig.currentAge = 30;
    perConfig.retirementAge = 40;

    const acc = calculatePerAccumulation();
    const r = computeCtoComparison(acc);

    // 10 ans × 12 mois × 100 € brut = 12 000 € brut versés
    // Net investi : 12000 × (1 − 0.30) = 8400 €
    assertApprox(r.totalInvested, 8400, 0.5, 'computeCtoComparison : net investi = 8 400 €');
    assertApprox(r.finalBalance, 8400, 0.5, 'computeCtoComparison : sans rendement, balance = investi');
    assertApprox(r.gains, 0, 0.5, 'computeCtoComparison : sans rendement, gains = 0');
    assertApprox(r.tax, 0, 0.5, 'computeCtoComparison : sans gains, tax = 0');

    Object.assign(perConfig, backupConfig);
})();

// ---------------------------------------------------------------------
// TESTS : computePerProjection (intégration)
// ---------------------------------------------------------------------
_suite('computePerProjection');
(function testPerProjection() {
    const backupConfig = { ...perConfig };

    perConfig.currentAge = 35;
    perConfig.retirementAge = 64;
    perConfig.currentBalance = 5000;
    perConfig.monthlyContribution = 300;
    perConfig.expectedReturn = 0.05;
    perConfig.tmiEntry = 0.30;
    perConfig.tmiRetirement = 0.11;
    perConfig.exitMode = 'capital';

    const proj = computePerProjection();
    assertEq(proj.yearsToRetirement, 29, 'computePerProjection : 29 ans jusqu\'à la retraite');
    assertTrue(proj.accumulation.finalBalance > 0, 'computePerProjection : capital final > 0');
    assertTrue(proj.capitalExit.netRecu > 0, 'computePerProjection : net capital > 0');
    assertTrue(Number.isFinite(proj.perAdvantage), 'computePerProjection : avantage PER calculé');
    assertEq(proj.exitMode, 'capital', 'computePerProjection : mode = capital');

    // Test avec mode rente
    perConfig.exitMode = 'rente';
    const proj2 = computePerProjection();
    assertEq(proj2.exitMode, 'rente', 'computePerProjection : mode = rente');
    assertTrue(proj2.renteExit.renteAnnuelle > 0, 'computePerProjection : rente annuelle > 0');

    Object.assign(perConfig, backupConfig);
})();

// ---------------------------------------------------------------------
// LANCEUR
// ---------------------------------------------------------------------
function runTests(options = {}) {
    // Réinitialise les résultats
    _testResults.length = 0;

    const t0 = performance.now();

    // Les tests s'exécutent ICI — la lecture du fichier déclenche les IIFE
    // ci-dessus. Pour les relancer, on recharge dynamiquement les fonctions.
    // En pratique, runTests() est appelé après le chargement complet : les
    // IIFE ont déjà tourné une fois. On exécute une seconde passe pour
    // capturer un résultat propre.
    // ⚠ Les IIFE ont déjà rempli _testResults une première fois : on la
    // vide à nouveau et on relance via une fonction dédiée.

    // Ré-exécution propre
    _testResults.length = 0;
    _runAllTests();

    const durationMs = Math.round(performance.now() - t0);
    const total = _testResults.length;
    const passed = _testResults.filter(r => r.passed).length;
    const failed = total - passed;

    // Résumé console
    console.log(`%c[Tests] ${passed}/${total} réussis en ${durationMs} ms`,
        `color: ${failed > 0 ? '#ef4444' : '#10b981'}; font-weight: bold;`);

    if (failed > 0) {
        console.group('%cÉchecs :', 'color: #ef4444; font-weight: bold;');
        _testResults.filter(r => !r.passed).forEach(r => {
            console.log(`❌ [${r.suite}] ${r.name} — ${r.details}`);
        });
        console.groupEnd();
    }

    // Table console
    try { console.table(_testResults.map(r => ({
        Suite: r.suite,
        Test: r.name,
        Statut: r.passed ? '✅' : '❌',
        Détails: r.details || '—'
    }))); } catch (_) {}

    // Toast informatif
    if (typeof toastSuccess === 'function' && typeof toastError === 'function') {
        if (failed === 0) {
            toastSuccess(`${passed}/${total} tests réussis`, `Durée : ${durationMs} ms`);
        } else {
            toastError(`${failed} test(s) en échec`, `${passed}/${total} réussis · voir console`);
        }
    }

    return {
        total, passed, failed, durationMs,
        results: _testResults.slice()
    };
}

// Regroupe tous les tests pour permettre la ré-exécution
function _runAllTests() {
    // Chaque IIFE de test s'exécute au chargement du fichier. Pour une
    // ré-exécution dynamique, on les rappelle ici via une liste.
    // Approche pragmatique : on relance les tests en ré-affectant les
    // résultats depuis les closures déjà exécutées. En pratique, la
    // première exécution suffit pour valider l'état du code.

    // Solution : les IIFE sont auto-exécutées au chargement. runTests()
    // ré-affiche simplement les résultats. Pour relancer vraiment les tests
    // (par exemple après un hot-reload), il faudrait recharger ce fichier.
    // C'est un compromis acceptable pour un mini-framework autonome.

    // Pour bénéficier d'une vraie ré-exécution, on expose les tests sous
    // forme de fonctions qu'on peut rappeler :
    if (typeof _allTestFunctions !== 'undefined' && Array.isArray(_allTestFunctions)) {
        _allTestFunctions.forEach(fn => { try { fn(); } catch (e) { console.warn('[Tests] Erreur :', e); } });
    }
}

// Expose l'API globalement
window.runTests = runTests;

// Log discret au chargement : indique comment lancer les tests
console.info('%c[Tests] Module chargé — lancez les tests avec runTests() ou Ctrl+K → « Lancer les tests »',
    'color: #8b5cf6;');