#!/usr/bin/env bash
# exit on error
set -o errexit

echo "🚀 Début de l'installation des dépendances..."
pip install --upgrade pip
pip install -r requirements.txt

echo "✅ Build terminé avec succès !"
