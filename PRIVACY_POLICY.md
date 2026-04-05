# Politique de Confidentialité — Tchopé

**Dernière mise à jour : 5 avril 2026**
**Développeur : LNDEV — [lndev.me](https://lndev.me)**

---

## 1. Introduction

Tchopé est une application mobile de recettes camerounaises. Votre vie privée est importante pour nous. Cette politique explique comment l'application gère vos données.

**En résumé : Tchopé ne collecte aucune donnée personnelle. Tout reste sur votre appareil.**

## 2. Collecte de données

Tchopé **ne collecte, ne transmet et ne stocke aucune donnée personnelle** sur un serveur distant. L'application :

- Ne requiert aucune création de compte
- Ne demande aucune information personnelle (nom, email, numéro de téléphone)
- N'utilise aucun service d'analytics ou de tracking
- N'intègre aucun SDK publicitaire
- Ne se connecte à aucun backend ou base de données distante
- Fonctionne entièrement hors ligne

## 3. Caméra et Photos

Tchopé demande l'accès à votre caméra et/ou à votre galerie photo dans deux cas :

### a) Recettes personnelles
Lorsque vous choisissez d'ajouter une photo à une recette personnelle :
- **Optionnelle** : vous pouvez créer des recettes sans ajouter de photo
- **Ponctuelle** : l'accès n'est demandé qu'au moment où vous appuyez sur le bouton d'ajout de photo
- **Locale** : les photos sélectionnées ou prises sont stockées uniquement sur votre appareil. Elles ne sont jamais envoyées, partagées ou uploadées vers un serveur

### b) TchopAI (analyse photo)
Lorsque vous envoyez une photo à TchopAI pour analyser un plat ou des ingrédients (fonctionnalité réservée aux abonnés Tchopé Plus) :
- **Optionnelle** : vous pouvez utiliser TchopAI sans envoyer de photo
- **Ponctuelle** : l'accès n'est demandé qu'au moment où vous appuyez sur le bouton photo dans le chat
- **Transmise à l'API Claude** : la photo est envoyée à l'API Claude (Anthropic) pour analyse. Anthropic traite l'image uniquement pour générer une réponse et ne la conserve pas. Consultez la [politique de confidentialité d'Anthropic](https://www.anthropic.com/privacy) pour plus de détails
- **Non stockée** : la photo n'est pas sauvegardée dans l'application après l'envoi. Elle est supprimée de la mémoire dès la réponse reçue

## 4. Microphone et Reconnaissance vocale

Tchopé utilise le microphone de votre appareil **uniquement** dans le cadre de la fonctionnalité TchopAI Live, qui permet de dialoguer vocalement avec l'assistant cuisine pendant que vous cuisinez.

- **Activation explicite** : le microphone n'est utilisé que lorsque vous lancez une session TchopAI Live et maintenez le bouton de parole. Il n'est jamais activé en arrière-plan.
- **Traitement sur l'appareil** : l'audio capté par le microphone est converti en texte directement sur votre appareil via les services de reconnaissance vocale du système d'exploitation (Google Speech Services sur Android, Speech Recognition sur iOS). Aucun flux audio n'est envoyé à un serveur distant.
- **Aucun enregistrement** : aucun enregistrement audio n'est stocké sur l'appareil ni transmis à un tiers.
- **Texte uniquement** : seul le texte transcrit par la reconnaissance vocale est envoyé à l'API Claude (Anthropic) pour générer une réponse. Anthropic ne reçoit jamais votre voix, uniquement du texte.
- **Pas de sauvegarde** : les conversations vocales (texte transcrit et réponses de l'IA) ne sont pas sauvegardées après la fin de la session TchopAI Live. Elles sont supprimées de la mémoire dès que vous quittez l'écran.
- **Révocable** : vous pouvez révoquer la permission microphone à tout moment dans les paramètres de votre téléphone (Réglages > Tchopé > Microphone).

## 5. Paiement et Licence

Les fonctionnalités IA de Tchopé (TchopAI Chat, Recherche IA, Meal Plan IA, TchopAI Live) nécessitent une licence payante. Le processus d'achat implique deux services tiers, tous deux opérés par Axa Zara LLC ([axazara.com](https://axazara.com)) :

- **Chariow** ([chariow.com](https://chariow.com)) : plateforme de vente qui gère la licence (génération de clé, activation, expiration). La page d'achat est hébergée sur Chariow, en dehors de l'application.
- **Moneroo** ([moneroo.io](https://moneroo.io)) : passerelle de paiement qui traite la transaction financière. C'est Moneroo qui collecte et traite les données de paiement (carte bancaire, mobile money, etc.).
- **Aucune donnée bancaire** : Tchopé ne collecte, ne stocke et ne traite aucune donnée bancaire ou financière. Aucune donnée de paiement ne transite par l'application. Tout est géré par les services tiers mentionnés ci-dessus.
- **Clé de licence** : après l'achat, vous recevez une clé de licence que vous saisissez dans l'application. Seule cette clé est stockée localement sur votre appareil (via AsyncStorage) pour vérifier votre accès aux fonctionnalités IA.

Pour plus d'informations sur le traitement de vos données par ces services, consultez leurs politiques de confidentialité respectives : [Chariow](https://chariow.com/privacy), [Moneroo](https://moneroo.io/privacy), [Axa Zara LLC](https://axazara.com).

## 6. Stockage local

L'application stocke localement sur votre appareil (via AsyncStorage) les données suivantes :

- **Vos favoris** : la liste des recettes que vous avez marquées comme favorites
- **Vos recettes personnelles** : les recettes que vous avez créées, incluant les photos éventuelles
- **Vos préférences** : le thème choisi (clair/sombre/système) et la langue (français/anglais)

Ces données :
- Sont stockées exclusivement sur votre appareil
- Ne sont jamais transmises à un tiers
- Peuvent être supprimées à tout moment depuis les paramètres de l'application ou en désinstallant l'application

## 7. Données de tiers

L'application charge des images depuis Wikimedia Commons et des miniatures vidéo depuis YouTube pour illustrer les recettes. Ces requêtes sont soumises aux politiques de confidentialité respectives de [Wikimedia](https://foundation.wikimedia.org/wiki/Privacy_policy) et [Google/YouTube](https://policies.google.com/privacy).

Lorsque vous choisissez de regarder une vidéo de recette, vous êtes redirigé vers YouTube via votre navigateur. Tchopé n'a aucun contrôle sur les données collectées par YouTube.

## 8. Modifications

Cette politique de confidentialité peut être mise à jour occasionnellement. Toute modification sera reflétée par la date de mise à jour en haut de ce document. Nous vous encourageons à consulter cette page régulièrement.

## 9. Contact

Pour toute question concernant cette politique de confidentialité :

- **Email** : leonelngoya@gmail.com
- **Site** : [lndev.me](https://lndev.me)
- **Telegram** : [@ln_dev7](https://t.me/ln_dev7)

---

# Privacy Policy — Tchopé

**Last updated: April 5, 2026**
**Developer: LNDEV — [lndev.me](https://lndev.me)**

---

## 1. Introduction

Tchopé is a mobile app for Cameroonian recipes. Your privacy matters to us. This policy explains how the app handles your data.

**In short: Tchopé does not collect any personal data. Everything stays on your device.**

## 2. Data Collection

Tchopé **does not collect, transmit, or store any personal data** on a remote server. The app:

- Does not require any account creation
- Does not ask for any personal information (name, email, phone number)
- Does not use any analytics or tracking services
- Does not integrate any advertising SDK
- Does not connect to any backend or remote database
- Works entirely offline

## 3. Camera and Photos

Tchopé requests access to your camera and/or photo library in two cases:

### a) Personal Recipes
When you choose to add a photo to a personal recipe:
- **Optional**: you can create recipes without adding a photo
- **On-demand**: access is only requested when you tap the photo button
- **Local**: selected or captured photos are stored exclusively on your device. They are never sent, shared, or uploaded to any server

### b) TchopAI (photo analysis)
When you send a photo to TchopAI to analyze a dish or ingredients (feature reserved for Tchopé Plus subscribers):
- **Optional**: you can use TchopAI without sending a photo
- **On-demand**: access is only requested when you tap the photo button in the chat
- **Sent to Claude API**: the photo is sent to the Claude API (Anthropic) for analysis. Anthropic processes the image solely to generate a response and does not retain it. See [Anthropic's privacy policy](https://www.anthropic.com/privacy) for more details
- **Not stored**: the photo is not saved in the application after sending. It is cleared from memory once the response is received

## 4. Microphone and Speech Recognition

Tchopé uses your device's microphone **only** within the TchopAI Live feature, which allows you to have a voice conversation with the cooking assistant while you cook.

- **Explicit activation**: the microphone is only used when you start a TchopAI Live session and hold the speak button. It is never activated in the background.
- **On-device processing**: the audio captured by the microphone is converted to text directly on your device using the operating system's built-in speech recognition services (Google Speech Services on Android, Speech Recognition on iOS). No audio stream is sent to a remote server.
- **No recordings**: no audio recording is stored on the device or transmitted to any third party.
- **Text only**: only the transcribed text from speech recognition is sent to the Claude API (Anthropic) to generate a response. Anthropic never receives your voice, only text.
- **No saving**: voice conversations (transcribed text and AI responses) are not saved after the TchopAI Live session ends. They are cleared from memory as soon as you leave the screen.
- **Revocable**: you can revoke the microphone permission at any time in your phone settings (Settings > Tchopé > Microphone).

## 5. Payment and License

The AI features of Tchopé (TchopAI Chat, AI Search, AI Meal Plan, TchopAI Live) require a paid license. The purchase process involves two third-party services, both operated by Axa Zara LLC ([axazara.com](https://axazara.com)):

- **Chariow** ([chariow.com](https://chariow.com)): sales platform that manages the license (key generation, activation, expiration). The purchase page is hosted on Chariow, outside the application.
- **Moneroo** ([moneroo.io](https://moneroo.io)): payment gateway that processes the financial transaction. Moneroo collects and processes payment data (credit card, mobile money, etc.).
- **No financial data**: Tchopé does not collect, store, or process any banking or financial data. No payment data passes through the application. Everything is handled by the third-party services mentioned above.
- **License key**: after purchase, you receive a license key that you enter in the application. Only this key is stored locally on your device (via AsyncStorage) to verify your access to AI features.

For more information on how your data is handled by these services, see their respective privacy policies: [Chariow](https://chariow.com/privacy), [Moneroo](https://moneroo.io/privacy), [Axa Zara LLC](https://axazara.com).

## 6. Local Storage

The app stores the following data locally on your device (via AsyncStorage):

- **Your favorites**: the list of recipes you have marked as favorites
- **Your personal recipes**: recipes you have created, including any photos
- **Your preferences**: your chosen theme (light/dark/system) and language (French/English)

This data:
- Is stored exclusively on your device
- Is never transmitted to any third party
- Can be deleted at any time from the app settings or by uninstalling the app

## 7. Third-Party Data

The app loads images from Wikimedia Commons and video thumbnails from YouTube to illustrate recipes. These requests are subject to the respective privacy policies of [Wikimedia](https://foundation.wikimedia.org/wiki/Privacy_policy) and [Google/YouTube](https://policies.google.com/privacy).

When you choose to watch a recipe video, you are redirected to YouTube via your browser. Tchopé has no control over the data collected by YouTube.

## 8. Changes

This privacy policy may be updated from time to time. Any changes will be reflected by the update date at the top of this document. We encourage you to review this page periodically.

## 9. Contact

For any questions regarding this privacy policy:

- **Email**: leonelngoya@gmail.com
- **Website**: [lndev.me](https://lndev.me)
- **Telegram**: [@ln_dev7](https://t.me/ln_dev7)
