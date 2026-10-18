import { AiApiError } from "./api";
import { isProRequired } from "./proBridge";
export function aiErrorMessage(error: unknown, fr: boolean) {
  if (isProRequired(error))
    return fr
      ? "Tchopé Pro est nécessaire pour continuer."
      : "Tchopé Pro is required to continue.";
  const code = error instanceof Error ? error.message : "";
  const messages: Record<string, [string, string]> = {
    "weekly-limit": [
      "Vos 100 réponses Live de la semaine sont utilisées. Les étapes de la recette restent disponibles.",
      "Your 100 Live responses for this week are used. Recipe steps remain available.",
    ],
    "weekly-photo-limit": [
      "Les 20 analyses photo Live de la semaine sont utilisées. Vous pouvez continuer en audio.",
      "Your 20 Live photo analyses for this week are used. You can continue in audio mode.",
    ],
    "live-busy": [
      "Une réponse est déjà en cours. Patientez un instant.",
      "A response is already being prepared. Please wait a moment.",
    ],
    "quota-unavailable": [
      "Le solde Live est momentanément indisponible. Réessayez dans un instant.",
      "Your Live balance is temporarily unavailable. Please try again shortly.",
    ],
    "subscription-unavailable": [
      "Impossible de vérifier votre abonnement pour le moment. Réessayez dans un instant.",
      "Your subscription cannot be verified right now. Please try again shortly.",
    ],
    "daily-limit": [
      "La limite du jour est atteinte. Réessayez demain.",
      "Today’s limit has been reached. Try again tomorrow.",
    ],
    "slow-down": [
      "Vous envoyez vos questions trop vite. Attendez quelques secondes.",
      "You are sending questions too quickly. Wait a few seconds.",
    ],
    timeout: [
      "La réponse prend trop de temps. Vérifiez votre connexion et réessayez.",
      "The response is taking too long. Check your connection and try again.",
    ],
    "app-only": [
      "TchopAI est disponible dans l’app iOS et Android.",
      "TchopAI is available in the iOS and Android app.",
    ],
    "live-context-too-large": [
      "Cette recette ou cet échange est trop long pour le mode Live. Commencez une nouvelle session.",
      "This recipe or conversation is too long for Live. Start a new session.",
    ],
    "update-app": [
      "Mettez Tchopé à jour pour utiliser cette fonction.",
      "Update Tchopé to use this feature.",
    ],
    "AI consent not granted": [
      "Autorisez le partage avec l’IA pour continuer.",
      "Allow sharing with AI to continue.",
    ],
    "image-too-large": [
      "Cette image est trop lourde. Choisissez une image plus petite.",
      "This image is too large. Choose a smaller image.",
    ],
  };
  if (messages[code]) return messages[code][fr ? 0 : 1];
  if (error instanceof AiApiError && error.status >= 500)
    return fr
      ? "TchopAI est momentanément indisponible. Réessayez dans un instant."
      : "TchopAI is temporarily unavailable. Please try again shortly.";
  return fr
    ? "La réponse n’a pas pu aboutir. Vérifiez votre connexion et réessayez."
    : "The response could not be completed. Check your connection and try again.";
}
