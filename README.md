# Isoko — Marketplace Géolocalisée du Burundi 🇧🇮

Application web fullstack moderne (React/TypeScript + FastAPI/Python) pour l'achat, la vente, et la livraison à Bujumbura et dans tout le Burundi, avec chat en temps réel, navigation cartographique et support multilingue.

```
isoko/
├── frontend/   # React + Vite + TypeScript + TailwindCSS + Leaflet + i18n
└── backend/    # FastAPI + SQLAlchemy + SQLite (dev) / PostgreSQL (prod) + WebSockets
```

> 💡 **Base de données par défaut** : Le projet est préconfiguré pour utiliser **SQLite en local** (création automatique sans installation) et prend en charge **PostgreSQL** pour l'hébergement en ligne (Supabase, Neon, Render, Railway).

---

## 🚀 Démarrage Rapide

### Prérequis
- **Node.js** (version 18 ou supérieure)
- **Python** (version 3.11 ou supérieure)

---

### 1. Lancement du Backend (FastAPI)

Depuis le dossier racine :

```powershell
# Déplacement dans le dossier backend
cd backend

# Création de l'environnement virtuel (venv)
python -m venv venv

# Activation de l'environnement virtuel
# Sur Windows (PowerShell) :
.\venv\Scripts\activate
# Sur Windows (Command Prompt)
.\venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

# 2. Installer les dépendances
pip install -r requirements.txt

# 3. Lancer le serveur (façon django)
python runserver.py
```

* 📖 **Documentation interactive des APIs (Swagger UI)** : [http://localhost:8000/docs](http://localhost:8000/docs)
* 🔴 **Serveur de logs & API en direct** : [http://localhost:8000/](http://localhost:8000/)

---

### 2. Lancement du Frontend (React)

Ouvrez un **deuxième terminal**, puis :

```powershell
# Déplacement dans le dossier frontend
cd frontend

# Installation des paquets Node.js (Vite, TailwindCSS, Lucide Icons, etc.)
npm install

# Lancement du serveur Vite de développement
npm run dev
```

* 🌐 **Lien de l'application locale** : [http://localhost:5173](http://localhost:5173)

---

## ✨ Fonctionnalités Principales

- **🔑 Authentification complète (JWT)** : Inscription, connexion, persistance de session avec token sécurisé et chiffrement des mots de passe.
- **🗺️ Carte interactive (Leaflet)** :
  - Recherche et géolocalisation des annonces sur Bujumbura.
  - Filtres dynamiques par catégorie de produits.
  - Calcul d'itinéraires en temps réel (Piéton, Vélo, Voiture) via l'API OSRM.
- **💬 Chat en temps réel (WebSockets)** : Discussions instantanées entre acheteurs et marchands avec historique persistant.
- **📍 Suivi GPS en direct** : Partage de position géographique en direct pour le suivi des livraisons.
- **🛒 Espace Marchand** : Pages profils dédiées pour les vendeurs, listes de produits par boutique.
- **🌍 Support Multilingue (i18n)** : Traduction complète et dynamique de l'interface en 4 langues :
  - 🇫🇷 **Français**
  - 🇬🇧 **English**
  - 🇧🇮 **Kirundi**
  - 🇹🇿 **Kiswahili**

---

## 🗃️ Choix et Configuration de la Base de Données

### 🏠 Mode Local (SQLite)
Par défaut, le fichier `.env` du backend utilise SQLite :
```env
DATABASE_URL=sqlite:///./isoko.db
```
*Il n'y a rien à installer.* Le fichier `isoko.db` se crée automatiquement dans le dossier `backend` au démarrage du serveur FastAPI.

### ☁️ Mode Production / En ligne (PostgreSQL)
Pour déployer la base de données en ligne, modifiez `DATABASE_URL` dans `backend/.env` avec vos accès cloud :

- **[Supabase](https://supabase.com)** (Recommandé) : `postgresql://postgres:[MOT_DE_PASSE]@db.[PROJET_ID].supabase.co:5432/postgres`
- **[Neon](https://neon.tech)** : `postgresql://[USER]:[MOT_DE_PASSE]@[HOST]/[DB]?sslmode=require`
- **[Railway](https://railway.app)** : `postgresql://postgres:[MOT_DE_PASSE]@[HOST]:5432/railway`
- **[Render](https://render.com)** : `postgres://[USER]:[MOT_DE_PASSE]@[HOST]/[DB]` *(corrigé automatiquement en postgresql:// par le backend)*

---

## 🛠️ Outil de Migration de la Base de Données (Alembic)

Pour créer et synchroniser vos tables SQL après modification de vos structures de données :

```powershell
cd backend
# Activer le venv s'il ne l'est pas
.\venv\Scripts\activate

# 1. Générer le fichier de migration automatique
alembic revision --autogenerate -m "initial_migration"

# 2. Appliquer les tables à votre base de données (SQLite ou Postgres)
alembic upgrade head
```


