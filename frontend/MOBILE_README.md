# 📱 KUKASOKO Mobile App Wrapper (Capacitor)

Ce dossier contient la configuration pour encapsuler le site web **KUKASOKO** dans une application mobile native **Android** en utilisant **Node.js** et **Capacitor**.

---

## 🛠️ Prérequis système

Pour compiler et générer l'APK final sur votre ordinateur, vous devez avoir installé :
1. **Node.js** (LTS)
2. **Android Studio** (avec le SDK Android installé et configuré)
3. Un smartphone Android connecté en mode débogage USB ou un émulateur Android configuré dans Android Studio.

---

## 🚀 Flux de travail de développement (Générer l'application)

Chaque fois que vous modifiez le code web du frontend et que vous souhaitez mettre à jour l'application mobile, suivez ces 3 étapes simples :

### Étape 1 : Re-compiler le site web
Génère le dossier `dist/` à jour.
```bash
npm run build
```

### Étape 2 : Synchroniser avec le projet mobile
Copie les fichiers compilés du dossier `dist/` vers le conteneur natif Android.
```bash
npx cap sync
```

### Étape 3 : Ouvrir et Compiler dans Android Studio
Ouvre automatiquement le projet Android dans Android Studio.
```bash
npx cap open android
```

---

## 🎨 Personnalisation (Icône & Splash Screen Pro)

Pour configurer vos visuels personnalisés (logo et écran de démarrage) de manière professionnelle :

### 1. Préparer vos images
Ajoutez vos images dans le dossier `frontend/resources/` (à créer) ou utilisez l'outil automatique de Capacitor :

- **Icône de l'application** : `resources/icon.png` (dimensions : **1024 x 1024 px**)
- **Écran de démarrage (Splash)** : `resources/splash.png` (dimensions : **2732 x 2732 px**, logo centré)

### 2. Générer automatiquement les icônes pour toutes les tailles d'écrans
Installez l'outil de génération de ressources de Capacitor :
```bash
npm install -D @capacitor/assets
```

Puis lancez la génération automatique de toutes les icônes Android :
```bash
npx capacitor-assets generate --android
```
*(Cela va découper et placer automatiquement les images dans tous les formats requis par Android dans le dossier `android/app/src/main/res/`).*

---

## 🛠️ Commandes Utiles de Dépannage

- **Mettre à jour les dépendances mobiles** : `npx cap update`
- **Vérifier l'état de la configuration mobile** : `npx cap doctor`
