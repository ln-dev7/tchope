# Tchopé Pro — abonnement (17 oct. 2026)

**Décision de LN** : toutes les fonctions IA de Tchopé passent dans **Tchopé Pro, 2,99 $ / mois**, sans exception, sauf
le chat TchopAI qui garde **3 messages texte gratuits au total** (comme Travora Pro). Même conception que Travora
(`travora-app/docs/PRO.md`, `REVENUECAT.md`, `STORES.md`).

## Pas d'IA sur le site, pas de publicité (17 oct. 2026)
- Site `tchope-web` : aucune IA (comme Travora). Chaque entrée IA ouvre la fenêtre « TchopAI est dans l'app »
  (`components/app-only.tsx`) ; plus de routes `/api/claude` ni `/api/fetch-recipe-url` côté site.
- Plus aucune publicité : SDK `react-native-google-mobile-ads` et plugin retirés (plus d'identifiant publicitaire ni de
  permission AD_ID), `app-ads.txt` retiré du site. Ne pas réintroduire sans décision de LN.

## Ce qui est gratuit / Pro
- Gratuit : recettes, recherche classique, planning manuel, courses, notes, minuteurs, mode cuisson ; « Avec mes
  ingrédients » sans abonnement = recherche LOCALE (sans IA), avec un bandeau « Résultats simples… Voir Pro ».
- Avant-goût : 3 messages TchopAI texte au total (`FREE_CHAT_MESSAGES`, `tchope_pro_usage`), décomptés seulement
  après une réponse réussie du serveur.
- Pro : TchopAI illimité, photo dans le chat, lien de recette au-delà de l'avant-goût, recherche IA par ingrédients,
  recherche libre, planning IA (générer / ajuster), guidage vocal TchopAI Live.

## Où la règle est appliquée (une seule fois)
- `utils/api.ts` : `callClaude(params, feature)` / `callClaudeLive(params, feature)` → `assertAiAllowed(feature)`
  (`utils/proBridge.ts`) AVANT le cache ; sans abonnement : écran Pro ouvert + `ProRequiredError` (les écrans se taisent
  avec `isProRequired(e)`). Les écrans appellent aussi `requireAi(feature)` au début de l'action (rien d'affiché).
- `feature` : `chat`, `chat-photo`, `ingredients`, `search`, `plan`, `plan-adjust`, `live-cooking` (même liste que
  `server/lib/pro-check.ts`). Toute nouvelle fonction IA DOIT passer par `callClaude*` avec sa `feature`.
- État : `context/ProContext.tsx` (RevenueCat via `lib/pro.ts`, monté dans `app/_layout.tsx`), écran
  `components/Paywall.tsx` (prix du store uniquement, règle Apple 3.1.2), bloc `components/ProSettingsCard.tsx`
  (Réglages). Plein écran modal (cuisson, Live) : `<Paywall local />` sur place, iOS ne présentant pas la modale de la
  racine par-dessus.
- Libellés : `constants/pro-translations.ts` (FR vouvoiement, EN).

## Serveur (`server/`, projet Vercel `tchope-api`)
- `api/claude.ts` : relais VERROUILLÉ (`lib/claude-policy.ts` : modèles autorisés `ALLOWED_MODELS`, défaut Haiku 4.5 ;
  max_tokens ≤ 2048 ; 60 messages, 120 000 caractères, 2 images au plus) + contrôle Pro (`lib/pro-check.ts`).
- Contrôle Pro : en-têtes `x-tchope-user` (identifiant anonyme RevenueCat) / `x-tchope-pro` ; API v2 de RevenueCat
  (`REVENUECAT_SECRET_KEY` v2 + `REVENUECAT_PROJECT_ID`, droits en lecture « Customer information » et « Project
  configuration »). Modes off / legacy / verified ; `PRO_REQUIRE_DEVICE=on` refuse les anciennes apps (le chat de
  l'ancienne app affiche « mettez à jour » + lien du store). 402 `pro-required` → écran Pro ; 403 `unknown-device` →
  réessai unique après 2 s (`fetchWithDeviceRetry`).
- Limites : anciennes apps 60/min, 1 500/jour par IP (lien de recette 300) ; abonné 30/min, 400/jour par appareil ;
  avant-goût 5/jour par appareil, 300/jour par IP.
- `api/fetch-recipe-url.ts` : même contrôle, hôtes internes refusés, redirections revérifiées.
- `api/pro-status.ts` : diagnostic (`"active": true` attendu). `api/version.ts` : `MIN_APP_VERSION` (Vercel) → l'app
  (UpdateModal) invite à mettre à jour ; `FORCE_UPDATE=on` l'impose.
- Tests : `cd server && npm test`.

## Mise en place (stores, RevenueCat, Vercel)
- RevenueCat, projet « LN Dev » (17 oct. 2026) : app « Tchopé (App Store) » (`com.lndev.tchope`, clé d'achats intégrés
  App Store Connect déjà utilisée par Travora), produit `tchope_pro_monthly` ; app « Tchopé (Play Store) » (18 oct. 2026, produit
  `tchope_pro_monthly:monthly`, compte de service `revenuecat@travora-511407` avec accès à Tchope dans Play Console,
  « Valid credentials », notifications en temps réel sur le topic `projects/travora-511407/topics/Play-Store-Notifications`
  partagé avec Travora, test reçu) ;
  entitlement
  `tchope_pro` (propre à Tchopé : un abonné Travora n'a pas Tchopé Pro, et inversement), offre `tchope`, paquet Monthly → produit `tchope_pro_monthly`.
- App Store Connect : groupe « Tchopé Pro », produit `tchope_pro_monthly`, 1 mois, 2,99 $ ; Play Console : abonnement
  `tchope_pro_monthly`, plan de base `monthly` (exige d'abord un build contenant la permission BILLING).
- Clés publiques RevenueCat dans `constants/revenuecat.ts`. Rebuild natif (module `react-native-purchases`).
- Vercel `tchope-api` : `REVENUECAT_SECRET_KEY` (la clé v2 du projet LN Dev, la même que Travora), `REVENUECAT_PROJECT_ID` ; puis `/api/pro-status` → `active: true`.
  Une fois la 2.0.0 en ligne : `MIN_APP_VERSION=2.0.0` (invitation à mettre à jour) et `PRO_REQUIRE_DEVICE=on`.
