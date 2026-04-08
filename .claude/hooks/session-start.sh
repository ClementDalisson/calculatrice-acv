#!/bin/bash
set -euo pipefail

# Hook SessionStart — Calculatrice ACV
# Projet statique (HTML/CSS/JS) — aucune dépendance npm/pip à installer
# Ce hook s'exécute uniquement dans les sessions distantes (Claude Code web/mobile)

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

echo "=== Session start : calculatrice-acv ==="

# Vérification de l'environnement de base
echo "Node : $(node --version 2>/dev/null || echo 'non disponible')"
echo "Python : $(python3 --version 2>/dev/null || echo 'non disponible')"
echo "Git branch : $(git branch --show-current 2>/dev/null || echo 'inconnu')"
echo "Fichiers JS : $(ls app.js ui-perso.js ui-org.js calc.js router.js auth.js data.js 2>/dev/null | tr '\n' ' ')"
echo "Guide : CLAUDE.md (lire en priorité)"

echo "=== Environnement prêt ==="
