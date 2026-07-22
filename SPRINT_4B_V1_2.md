# Publication manuelle de la RC2 sur GitHub

Le connecteur ChatGPT dispose actuellement d’un accès en lecture mais ne peut pas créer de branche. La procédure ci-dessous publie la RC sans modifier directement `main`.

## Avec Git sur un ordinateur

```bash
git clone https://github.com/hftk9d4hb4-cyber/surveillance-examens.git
cd surveillance-examens
git checkout -b release/v1.1.0-rc.2
```

Décompressez l’archive de livraison, puis copiez **le contenu** du dossier `surveillance-examens-v1.1.0-rc.2` à la racine du dépôt.

```bash
git add -A
git commit -m "release: prepare v1.1.0-rc.2"
git push -u origin release/v1.1.0-rc.2
```

Ouvrez ensuite une Pull Request vers `main`. Ne fusionnez qu’après le passage de GitHub Actions et la recette Vercel.

## Contrôles avant commit

```bash
npm ci
npx prisma generate
npm run check
npm run build
```

## Contrôles après déploiement Vercel

1. `/api/health` indique `1.1.0-rc.2` ;
2. activation d’un compte test ;
3. import des deux modèles ;
4. calcul d’affectations ;
5. envoi d’une convocation test ;
6. ouverture de l’ICS ;
7. export du planning.
