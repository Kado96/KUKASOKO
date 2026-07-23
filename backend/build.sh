#!/usr/bin/env bash
# exit on error
set -o errexit

echo "🐍 Python version: $(python --version)"
echo "🚀 Installation des dépendances..."

pip install --upgrade pip

# --prefer-binary : force les wheels pré-compilés, évite la compilation Rust
pip install --prefer-binary -r requirements.txt

echo "✅ Build terminé avec succès !"
