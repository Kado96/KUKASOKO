# Configuration HTTPS & Routage pour InfinityFree (wuaze.com)

Ce document explique la configuration requise pour héberger correctement une application React (Single Page Application) sur InfinityFree / wuaze.com, tout en garantissant le fonctionnement de fonctionnalités natives comme la géolocalisation.

## 1. Pourquoi cette configuration ?

Les API HTML5 modernes (comme `navigator.geolocation`) exigent un contexte sécurisé (HTTPS). Bien qu'InfinityFree active HTTPS par défaut sur ses sous-domaines gratuits, les visiteurs atterrissent souvent sur la version HTTP non sécurisée.
De plus, React Router nécessite que toutes les requêtes soient redirigées vers `index.html` pour gérer le routage côté client.

## 2. Le fichier `.htaccess`

Le fichier `frontend/public/.htaccess` est automatiquement copié dans le dossier `dist/` lors du build par Vite. Il contient les règles suivantes :

```apache
Options -MultiViews

# ─── Forcer HTTPS (Let's Encrypt / wuaze.com) ───
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteCond %{HTTPS} off
  RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
</IfModule>

# ─── MIME Types (résout l'erreur "text/html" pour les modules JS) ───
AddType application/javascript .js .mjs
AddType text/css .css
AddType image/svg+xml .svg
AddType image/webp .webp
AddType application/json .json
AddType font/woff2 .woff2
AddType font/woff .woff

# ─── Compression Gzip ───
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css application/javascript
</IfModule>

# ─── Cache statique ───
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType application/javascript "access plus 1 year"
  ExpiresByType text/css "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 month"
  ExpiresByType image/png "access plus 1 month"
</IfModule>

# ─── SPA Routing (React Router) ───
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

## 3. Impact sur la Géolocalisation

Avec ce fichier :
1. Tout visiteur sur `http://kukasoko.wuaze.com` sera redirigé vers `https://kukasoko.wuaze.com`.
2. Chrome sur Android accordera alors l'accès à la géolocalisation au lieu de la bloquer silencieusement avec un code `PERMISSION_DENIED` (1).
