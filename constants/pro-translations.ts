// Libellés de Tchopé Pro (abonnement mensuel : toutes les fonctions IA). Voir lib/pro.ts. Vouvoiement, comme l'app.
export type ProLang = "fr" | "en";

export const proDict = {
  fr: {
    title: "Passez à Tchopé Pro",
    subtitle:
      "Votre assistant pour cuisiner, planifier et trouver l’inspiration.",
    reasonChat: "Vous avez utilisé vos {n} messages TchopAI gratuits.",
    reasonFeature: "Cette fonction fait partie de Tchopé Pro.",
    perks:
      "TchopAI : techniques, substitutions, conseils et recettes adaptées\nPhoto de votre plat ou de votre frigo : TchopAI l’analyse\nAvec mes ingrédients et recherche libre : trouvez la bonne recette\nPlanning et guidage vocal : votre semaine composée, et TchopAI qui vous guide à voix haute en cuisine\nLive : 100 réponses par semaine, dont 20 analyses photo. Renouvellement lundi à 00 h UTC.",
    priceLine: "{price} / mois",
    priceLoading: "Prix selon votre store…",
    renewal:
      "Abonnement mensuel renouvelé automatiquement, facturé sur votre compte App Store / Google Play. Annulable à tout moment dans les réglages d’abonnement du store. « Restaurer mes achats » le retrouve sur vos autres appareils.",
    buy: "S'abonner pour {price} / mois",
    buyNoPrice: "S'abonner",
    buying: "Achat en cours…",
    pending:
      "Paiement enregistré, activation en cours. Si Tchopé Pro n’apparaît pas d’ici quelques minutes, utilisez « Restaurer mes achats ».",
    alreadyOwned:
      "Cet abonnement existe déjà sur votre compte : touchez « Restaurer mes achats ».",
    restore: "Restaurer mes achats",
    restored: "Abonnement retrouvé, bienvenue dans Tchopé Pro !",
    restoreNone: "Aucun abonnement Tchopé Pro trouvé sur ce compte.",
    unavailable:
      "L'achat n'est pas disponible pour le moment. Réessayez plus tard.",
    failed: "L'achat n'a pas abouti. Réessayez.",
    later: "Plus tard",
    terms: "Conditions d'utilisation",
    privacy: "Confidentialité",
    chatOfferedOne: "1 message offert sur {n}",
    chatOfferedMany: "{left} messages offerts sur {n}",
    chatOfferedNone: "Messages offerts utilisés",
    chatOfferedCta: "Voir Pro",
    proBadge: "PRO",
    localHint:
      "Résultats simples, sans IA. La recherche intelligente fait partie de Tchopé Pro.",
    errPro:
      "Le serveur n'a pas reconnu votre abonnement Tchopé Pro. Abonné ? Ouvrez Réglages → Tchopé Pro → « Restaurer mes achats ».",
    errUpdate:
      "Cette version de Tchopé n’est plus compatible avec l’IA : mettez l’application à jour.",
    block: "Tchopé Pro",
    active: "Abonnement actif : toutes les fonctions IA sont débloquées.",
    inactive:
      "Débloquez TchopAI, la photo, la recherche IA, le planning et le guidage vocal.",
    see: "Découvrir Tchopé Pro",
    manage: "Gérer mon abonnement",
    devToggle: "Simuler Pro (développement)",
    devTitle: "Mode développeur",
    devIgnoreStore: "Forcer sans abonnement, même si abonné",
    devHint: "Un seul mode à la fois. Désactivez les deux pour retrouver l’état réel du store. Ces simulations sont locales : le serveur continue de vérifier l’abonnement pour les appels IA.",
  },
  en: {
    title: "Go Tchopé Pro",
    subtitle: "Your assistant for cooking, planning and finding inspiration.",
    reasonChat: "You’ve used your {n} free TchopAI messages.",
    reasonFeature: "This feature is part of Tchopé Pro.",
    perks:
      "TchopAI: techniques, substitutions, tips and tailored recipes\nA photo of your dish or fridge: TchopAI analyzes it\nWith my ingredients and free search: find the right recipe\nMeal plan and voice guidance: your week planned, and TchopAI guiding you out loud as you cook\nLive: 100 responses per week, including 20 photo analyses. Resets Monday at 00:00 UTC.",
    priceLine: "{price} / month",
    priceLoading: "Price from your store…",
    renewal:
      "Monthly subscription, renewed automatically and billed to your App Store / Google Play account. Cancel anytime in the store’s subscription settings. “Restore purchases” finds it on your other devices.",
    buy: "Subscribe for {price} / month",
    buyNoPrice: "Subscribe",
    buying: "Purchasing…",
    pending:
      "Payment received, activating. If Tchopé Pro doesn’t appear within a few minutes, use “Restore purchases”.",
    alreadyOwned:
      "This subscription already exists on your account: tap “Restore purchases”.",
    restore: "Restore purchases",
    restored: "Subscription restored, welcome to Tchopé Pro!",
    restoreNone: "No Tchopé Pro subscription found on this account.",
    unavailable: "Purchases aren’t available right now. Try again later.",
    failed: "The purchase didn’t go through. Try again.",
    later: "Later",
    terms: "Terms of use",
    privacy: "Privacy",
    chatOfferedOne: "1 free message of {n}",
    chatOfferedMany: "{left} free messages of {n}",
    chatOfferedNone: "Free messages used",
    chatOfferedCta: "See Pro",
    proBadge: "PRO",
    localHint:
      "Simple results, without AI. Smart search is part of Tchopé Pro.",
    errPro:
      "The server didn’t recognise your Tchopé Pro subscription. Subscribed? Open Settings → Tchopé Pro → “Restore purchases”.",
    errUpdate:
      "This version of Tchopé no longer works with the AI: please update the app.",
    block: "Tchopé Pro",
    active: "Active subscription: all AI features are unlocked.",
    inactive:
      "Unlock TchopAI, photos, AI search, meal planning and voice guidance.",
    see: "Discover Tchopé Pro",
    manage: "Manage my subscription",
    devToggle: "Simulate Pro (development)",
    devTitle: "Developer mode",
    devIgnoreStore: "Force free mode, even with a subscription",
    devHint: "One mode at a time. Turn both off to use the actual store status. These simulations are local: the server still verifies the subscription for AI requests.",
  },
} as const;

export function fill(s: string, v: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (m, k) => (k in v ? String(v[k]) : m));
}
