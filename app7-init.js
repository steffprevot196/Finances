// =====================================================================
// app7-init.js — POINT D'ENTRÉE (chargé en dernier)
// Dépend de : app1 à app6 (toutes les fonctions doivent être définies)
// =====================================================================

window.addEventListener('DOMContentLoaded', () => {
    // 1. Migration des données v1 -> v2 (sauvegarde avant, normalisation après)
    bootMigration();

    // 2. Restauration des préférences fiscales
    document.getElementById('tax-regime-pfu').checked    = taxRegimeMode === 'PFU';
    document.getElementById('tax-regime-bareme').checked = taxRegimeMode === 'BAREME';
    document.getElementById('tax-tmi-select').value      = taxTMI.toFixed(2);

    // 3. Initialisation des chips de tags du formulaire d'ajout
    renderAssetTagChips();

    // 4. Premier rendu complet de l'interface
    refreshAllUI();

    // 5. Simulateur fiscal pré-rempli
    calculateMetalTaxSim();

    // 6. Préchargement du cache de volatilité réelle (async, se termine plus tard)
    primeRealVolCache();

    // 7. Pop-up de reclassement Action/ETF si nécessaire
    maybeShowReclassModal();

    // 8. Snapshot quotidien (une seule fois par jour)
    checkDailyAutoBackup();

    // 9. État initial du modal Google Drive
    initDriveSyncUI();

    // 9b. Debounce sur la recherche d'actifs (300 ms — évite de spammer CoinGecko)
    const searchInput = document.getElementById('add-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(triggerAssetSearch, 300));
    }

    // 9c. Flag « champ Valeur Actuelle touché » pour ne plus écraser une saisie manuelle
    const addValueInput = document.getElementById('add-value');
    if (addValueInput) {
        addValueInput.addEventListener('input', () => { _addValueTouched = true; });
    }
        // 10. Force l'ouverture du calendrier natif sur tous les champs date (utile sur Firefox/Linux)
        document.querySelectorAll('input[type="date"]').forEach(inp => {
            inp.style.colorScheme = 'dark';
            inp.addEventListener('focus', () => {
                try { if (typeof inp.showPicker === 'function') inp.showPicker(); } catch (_) { /* fallback silencieux */ }
            });
        });

    // 11. Fermeture des modaux avec la touche Échap
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.fixed.inset-0:not(.hidden)').forEach(m => m.classList.add('hidden'));
        }
    });
});