# Tchopé — Restaurer les publicités AdMob

> **Contexte.** Le 16 août 2026, toutes les publicités (2 bannières, 4 blocs
> rewarded) et le système de crédits TchopAI ont été **entièrement retirés du
> code** : l'app est 100 % gratuite, IA illimitée, plus aucun portail. Le SDK
> `react-native-google-mobile-ads@16.3.4` et le plugin `app.json` ont été
> **volontairement conservés** (inactifs : jamais importés, jamais initialisés)
> pour éviter un changement de build natif. Ce document contient tout ce qu'il
> faut pour remettre les pubs à l'identique.
>
> Voir aussi `.claude/ADMOB_ADS.md` : l'historique complet de la mise en place
> initiale (validation app-ads.txt, conformité Play Console, pièges de build).
> ⚠️ Ce doc historique décrit des états DÉPASSÉS sur certains points (1 seul
> bloc rewarded, plafond 3/jour, `REWARDED_MESSAGES_PER_AD = 1`, iosAppId
> placeholder, gating premium Tchopé+) — les valeurs faisant foi au moment du
> retrait sont CELLES DU PRÉSENT DOCUMENT.

**Commit de référence (dernier état AVEC pubs)** : `bdacbc0e2ae9d60ab1571ca32d552b4665982611`
(`fix(ios): layout overflow on cooking screens`).
Tous les fichiers supprimés se récupèrent avec :

```bash
git show bdacbc0:<chemin/du/fichier> > <chemin/du/fichier>
```

---

## 1. Identifiants AdMob (compte `pub-2222017759396595`)

| Élément | Android | iOS |
|---|---|---|
| **ID d'application** (plugin `app.json`, toujours en place) | `ca-app-pub-2222017759396595~3414006095` | `ca-app-pub-2222017759396595~4857541165` |
| Bannière accueil « Tchope Banner Ad » | `ca-app-pub-2222017759396595/2143678108` | `ca-app-pub-2222017759396595/8194150944` |
| Bannière détail recette « Tchope Recipe Detail Banner » | `ca-app-pub-2222017759396595/2805909114` | `ca-app-pub-2222017759396595/1815306785` |
| Rewarded « TchopAI Rewarded Message » | `ca-app-pub-2222017759396595/3107451588` | `ca-app-pub-2222017759396595/8002579254` |
| Rewarded « Tchope AI Search Rewarded » | `ca-app-pub-2222017759396595/1424424545` | `ca-app-pub-2222017759396595/5172097865` |
| Rewarded « Tchope Meal Plan Rewarded » | `ca-app-pub-2222017759396595/5746812936` | `ca-app-pub-2222017759396595/6408589692` |
| Rewarded « Tchope Live Rewarded » | `ca-app-pub-2222017759396595/4768773187` | `ca-app-pub-2222017759396595/5898976315` |

Ancien bloc « First Block » `.../8723841394` : abandonné, ne plus utiliser.
Package Android : `com.lndev.tchope`. `app-ads.txt` doit rester servi sur
`lndev.me/app-ads.txt` ET `tchope.lndev.me/app-ads.txt` :
`google.com, pub-2222017759396595, DIRECT, f08c47fec0942fa0`
(attention au middleware de locale de `tchope-web` qui redirigeait
`/app-ads.txt` — déjà corrigé, commit `fa91ac3` de ce repo-là).

## 2. Réglages produit (valeurs au moment du retrait)

| Constante (`constants/ads.ts`) | Valeur | Rôle |
|---|---|---|
| `REWARDED_MESSAGES_PER_AD` | `3` | 1 pub = 3 messages TchopAI (photo = 1 crédit aussi) |
| `AI_WELCOME_CREDITS` | `2` | messages offerts UNE fois avant la première pub |
| `REWARDED_DAILY_LIMIT` | `10` | plafond quotidien TOUS placements rewarded confondus — borne le coût Claude par utilisateur |
| `REWARDED_FAILOPEN_DELAY_MS` | `10_000` | délai avant « Continuer sans pub » |

Un bloc distinct par placement pour suivre l'eCPM de chacun dans AdMob.
Live = placement le plus cher en API : ne jamais l'assouplir sans revoir
`REWARDED_DAILY_LIMIT`. Économie : message Haiku ≈ $0.0002–0.02 selon la
feature vs vue rewarded ≈ $0.001–0.015 selon la région.

## 3. Fichiers SUPPRIMÉS (à restaurer depuis git)

| Fichier | Rôle |
|---|---|
| `constants/ads.ts` | `AD_UNITS` (tableau ci-dessus, `Platform.select`) + 4 constantes produit |
| `components/AdBanner.tsx` | bannière adaptive ancrée, prop `placement` (`home`/`recipe`), `TestIds` en dev, `onAdFailedToLoad` → null. ⚠️ N'avait PAS de retry : au premier no-fill, la bannière restait invisible pour toute la session. À la restauration, backporter le retry+backoff de Travora (`components/AdBanner.tsx` côté Travora, `BANNER_MAX_RETRIES`/`BANNER_RETRY_BASE_DELAY_MS`) |
| `components/RewardedUnlockModal.tsx` | modale générique « 1 pub = 1 action » (recherche IA, plan) avec fail-open 10 s + état `capped` |
| `components/live-cooking/LiveUnlockScreen.tsx` | portail « 1 pub = 1 session Live » (remplacé par `LiveIntroScreen.tsx`, même écran sans pub) |
| `hooks/useRewardedAd.ts` | rewarded préchargée, `unitId` paramétrable par placement ; récompense à `CLOSED` si `EARNED_REWARD` ; réutilise la même instance (pattern plus propre que Travora) ; retry 60 s |
| `utils/adQuota.ts` | plafond quotidien partagé (`canWatchRewarded`, `recordRewardedView`) — clés `tchope_rewarded_day` / `tchope_rewarded_views`, fail-open sur erreur de stockage |
| `utils/aiCredits.ts` | solde persistant `tchope_ai_credits` + crédit de bienvenue (`tchope_ai_welcome_granted`) + purge des clés de l'ancien modèle 2025 (`tchope_free_messages*`, `tchope_rewarded_count`) |

## 4. Fichiers MODIFIÉS (ce qu'il faut remettre)

- **`app/_layout.tsx`** — `import mobileAds from 'react-native-google-mobile-ads';`
  et le `useEffect(() => { mobileAds().initialize(); }, []);` dans `InnerLayout`.
- **Bannières (5 écrans)** — `import AdBanner from '@/components/AdBanner';` puis :
  - `app/(tabs)/index.tsx` et `app/(tabs)/search.tsx` : `<AdBanner style={{ marginBottom: 64 + bottom }} />` (⚠️ tab bar en `position: 'absolute'` de hauteur `64 + bottom` — sans cette marge la pub charge mais reste invisible derrière la barre)
  - `app/recipe/[id].tsx` : `<AdBanner placement="recipe" style={{ marginBottom: bottom }} />`
  - `app/recipes-list.tsx`, `app/recipe-videos.tsx` : `<AdBanner style={{ marginBottom: bottom }} />`
  - Écrans volontairement SANS pub : cooking-mode, live-cooking, tchop-ai, timer (interaction critique) ; notes, cookbook, planner (espaces perso) ; add-recipe, settings, onboarding.
- **`app/tchop-ai.tsx`** — remettre : imports (useRewardedAd, AD_UNITS,
  REWARDED_MESSAGES_PER_AD, REWARDED_FAILOPEN_DELAY_MS, aiCredits, adQuota),
  état `credits` + chargement `loadAiCredits`, `locked = credits <= 0`,
  `adsCapped` (effet sur `locked`), `grantCredits`, `handleWatchRewarded`
  (haptique + `rewardedAd.show(() => { recordRewardedView(); grantCredits(...) })`),
  le garde `locked` dans `handleSend`, la décrémentation d'1 crédit après
  réponse réussie (texte ET photo — jamais sur erreur), le composant `AdGate`
  (remplace la zone de saisie à 0 crédit, fail-open → +1 message), et le
  compteur `aiMessagesLeft` sous le ChatInput (`canSend={!locked}`).
- **`app/ai-recipes.tsx`** — remettre le portail « 1 pub = 1 recherche libre » :
  états `showAdModal`/`adsCapped`, `useRewardedAd(AD_UNITS.rewardedSearch)`,
  `handleSearchFreeText` qui vérifie `aiAvailable` PUIS ouvre la modale (on ne
  fait pas regarder une pub pour une recherche qui échouera), et le
  `<RewardedUnlockModal>` en bas du JSX (onWatch → `recordRewardedView()` +
  `runFreeTextSearch()` ; onContinue = fail-open direct). La recherche par
  ingrédients reste SANS pub.
- **`app/(tabs)/planner.tsx`** — remettre le portail « 1 pub = 1 génération OU
  1 ajustement » : `useRewardedAd(AD_UNITS.rewardedPlan)`, états
  `showAdModal`/`adsCapped`/`pendingAction` (`'generate' | 'adjust'`),
  `handleGenerate`/`handleAdjust` qui ouvrent la modale au lieu d'appeler
  `doGenerate`/`doAdjust` directement, et le `<RewardedUnlockModal>` avec
  titres/textes selon `pendingAction`.
- **`app/live-cooking.tsx`** — re-brancher `LiveUnlockScreen` à la place de
  `LiveIntroScreen` (état `unlocked` au lieu de `started` ; « 1 pub = 1
  session » : le déblocage ne vaut que pour ce montage d'écran).
  `LiveIntroScreen.tsx` peut alors être supprimé (ou gardé comme écran
  d'explication post-pub).
- **`app/(tabs)/settings.tsx`** — re-préserver les clés dans
  `handleResetAllData` : `tchope_ai_credits`, `tchope_ai_welcome_granted`,
  `tchope_rewarded_day`, `tchope_rewarded_views` (sinon reset = crédits/quotas
  remis à zéro).
- **`PRIVACY_POLICY.md`** — remettre la section 8 « Publicité (Google AdMob) »
  FR + EN (3 données collectées/partagées : Advertising ID, interactions,
  diagnostics ; annonces non personnalisées ; lien opt-out), re-numéroter les
  sections suivantes, réviser l'intro et la section 2. Synchroniser avec le
  site (`tchope-web/lib/i18n.ts`, page `/privacy`).

## 5. Traductions à remettre (`constants/translations.ts`, FR + EN)

```ts
// FR
watchAdForMessage: "Regarder une pub = {count} message{plural}",
aiUnlockTitle: "Continuez avec TchopAI",
aiUnlockText: "Regardez une courte pub pour débloquer {count} messages.",
aiAdLoading: "Chargement de la pub…",
aiMessagesLeft: "Messages restants : {count}",
aiContinueNoAd: "Continuer sans pub · 1 message",
adUnlockWatch: "Regarder une pub",
adContinueNoAd: "Continuer sans pub",
adDailyLimitReached: "Vous avez atteint la limite de pubs pour aujourd'hui. Revenez demain !",
searchAdUnlockTitle: "Débloquer cette recherche",
searchAdUnlockText: "Regardez une courte pub pour lancer cette recherche IA.",
planAdUnlockTitle: "Générer votre plan de repas",
planAdUnlockText: "Regardez une courte pub pour générer votre plan avec l'IA.",
planAdjustUnlockTitle: "Ajuster votre plan de repas",
planAdjustUnlockText: "Regardez une courte pub pour ajuster votre plan avec l'IA.",
liveUnlockCta: "1 pub = 1 session de cuisine en direct",

// EN
watchAdForMessage: "Watch an ad = {count} message{plural}",
aiUnlockTitle: "Keep chatting with TchopAI",
aiUnlockText: "Watch a short ad to unlock {count} messages.",
aiAdLoading: "Loading ad…",
aiMessagesLeft: "Messages left: {count}",
aiContinueNoAd: "Continue without ad · 1 message",
adUnlockWatch: "Watch an ad",
adContinueNoAd: "Continue without ad",
adDailyLimitReached: "You've reached today's ad limit. Come back tomorrow!",
searchAdUnlockTitle: "Unlock this search",
searchAdUnlockText: "Watch a short ad to run this AI search.",
planAdUnlockTitle: "Generate your meal plan",
planAdUnlockText: "Watch a short ad to generate your plan with AI.",
planAdjustUnlockTitle: "Adjust your meal plan",
planAdjustUnlockText: "Adjust your plan with AI by watching a short ad.",
liveUnlockCta: "1 ad = 1 live cooking session",
```

À l'inverse, la clé `liveStartCta` (FR « Commencer la session » / EN « Start
the session ») a été AJOUTÉE pour `LiveIntroScreen` — la retirer si l'écran
redevient `LiveUnlockScreen`.

## 6. Clés AsyncStorage utilisées par le système

`tchope_ai_credits` (solde), `tchope_ai_welcome_granted` (bienvenue déjà
offerte), `tchope_rewarded_day` + `tchope_rewarded_views` (plafond quotidien
partagé). Legacy purgées par `aiCredits.ts` : `tchope_free_messages`,
`tchope_free_messages_date`, `tchope_rewarded_count`. Rien à migrer : le code
recrée tout.

## 7. Procédure de restauration pas à pas

1. `git show bdacbc0:constants/ads.ts > constants/ads.ts` — idem pour les 6
   autres fichiers supprimés (section 3).
2. Réappliquer les modifications de la section 4 (le diff inverse du commit de
   retrait des pubs donne le détail exact, fichier par fichier).
3. Remettre les clés de traduction (section 5).
4. `npx tsc --noEmit && npx expo lint`.
5. **Aucun rebuild natif nécessaire** si le SDK est resté dans
   `package.json`/`app.json` (c'est le cas au moment du retrait) : tout ceci est
   du JS pur, testable dans le dev build existant.
6. Checklist appareil : bannières de test sur les 5 écrans (fixes au scroll,
   au-dessus de la tab bar), portail TchopAI à 0 crédit, portail recherche
   libre, portail plan (génération + ajustement), portail Live, fail-open
   après 10 s réseau coupé, plafond 10 pubs/jour.
7. Console AdMob : app + 12 blocs actifs, app-ads.txt toujours crawlé.
8. Stores : remettre les déclarations (section 9).

## 8. Pièges connus (appris à la mise en place, ne pas re-payer)

- **NE PAS upgrader `react-native-google-mobile-ads` au-delà de 16.3.4 sous
  Expo SDK 54** : 16.4.x = SDK natif GMA 25.4.0 compilé en Kotlin 2.3,
  incompatible Kotlin 2.1 d'Expo 54 (échec Gradle `compileDebugKotlin`).
  Versions OK : 16.1.0–16.3.4 (GMA 25.0.0). Réévaluer à Expo SDK 55+.
- **Jamais un vrai bloc en `__DEV__`** — toujours `TestIds.*`.
- **Tab bar `position: 'absolute'`** (`64 + bottom`) : bug historique « la pub
  charge mais est invisible » — voir marges section 4.
- La **récompense rewarded** ne s'accorde qu'à `CLOSED` si `EARNED_REWARD` a
  été reçu.
- **Fail-open partout** : la régie ne bloque jamais une fonctionnalité.
- Un nouveau bloc peut mettre ~1 h à servir ; les vraies annonces ne viennent
  que via les stores, avec délai de remplissage.
- **Annonces non personnalisées** : pas de flux UMP au lancement. ⚠️ Google
  exige un **CMP certifié pour l'EEE/UK même en non-personnalisé** — à intégrer
  (`AdsConsent`) si le trafic diaspora européenne compte.
- iOS : renseigner `skAdNetworkItems` dans le plugin `app.json` à la
  restauration (attribution SKAdNetwork).
- Debug Android : `adb logcat --pid=$(adb shell pidof com.lndev.tchope) | grep -iE "Ads|MobileAds"`
  (les `console.log` JS ne sont PAS dans logcat en bridgeless — terminal Metro).

## 9. Déclarations stores à remettre à jour

- **Play Console → Contenu de l'application** : « Annonces » → Oui ;
  « Identifiant publicitaire » → Oui (Publicité/marketing + Prévention des
  fraudes) ; **Sécurité des données** : « Appareil ou autres ID »,
  « Interactions avec l'appli », « Diagnostics » — Collectées + Partagées,
  obligatoires (réf. :
  https://developers.google.com/admob/android/privacy/play-data-disclosure).
- **App Store Connect → App Privacy** : Identifiers / Usage Data / Diagnostics
  (Third-Party Advertising).
- **Site + fiche stores** : re-mentionner « quelques annonces discrètes » dans
  la description si souhaité ; resynchroniser la politique de confidentialité
  web.

> NB : tant que le SDK reste dans le binaire, la permission
> `com.google.android.gms.permission.AD_ID` reste dans le manifest Android —
> laisser la déclaration « Identifiant publicitaire » de la Play Console sur
> « Oui » même pubs retirées (sinon Google bloque l'AAB). Le piège inverse
> (première release AVEC pubs quand l'ancien bundle actif n'a pas la
> permission) est documenté dans `.claude/ADMOB_ADS.md`, étape 9.
