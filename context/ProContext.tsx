// État « Tchopé Pro » (lib/pro.ts) + avant-goût gratuit du chat, pour toute l'app (même conception que Travora Pro).
// - `pro` : abonnement actif (RevenueCat), ou simulation en développement.
// - `chatUsed` : messages TchopAI gratuits déjà consommés (3 au total), gardés sur l'appareil.
// - `paywall` : écran d'achat ouvert depuis n'importe où (`openPaywall()`), rendu dans app/_layout.tsx. Il est aussi
//   ouvert par utils/api.ts (pont `utils/proBridge.ts`) quand une fonction IA est demandée sans abonnement.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSettings } from '@/context/SettingsContext';
import { proDict } from '@/constants/pro-translations';
import { FREE_CHAT_MESSAGES, configurePurchases, fetchOffer, fetchPro, purchase, restore, type ProOffer, type ProState, type PurchaseResult } from '@/lib/pro';
import { registerProBridge, type PaywallReason } from '@/utils/proBridge';

const USAGE_KEY = 'tchope_pro_usage';
const DEV_KEY = 'tchope_pro_dev';
type DevMode = 'store' | 'pro' | 'free';

interface Ctx {
  configured: boolean;
  ready: boolean;
  pro: boolean;
  managementURL: string | null;
  offer: ProOffer | null;
  /** Messages TchopAI gratuits restants (sans objet si Pro). */
  freeChatLeft: number;
  buy: () => Promise<PurchaseResult>;
  /** true : abonnement retrouvé ; false : aucun ; null : impossible (non configuré / réseau). */
  restorePurchases: () => Promise<boolean | null>;
  paywall: PaywallReason | null;
  openPaywall: (reason: PaywallReason) => void;
  closePaywall: () => void;
  devPro: boolean;
  setDevPro: (v: boolean) => void;
  /** Développement seulement : forcer le parcours gratuit, même avec un abonnement réel. */
  devIgnoreStore: boolean;
  setDevIgnoreStore: (v: boolean) => void;
  /** Écrans en plein écran modal (cuisson, Live) : l'écran Pro y est affiché sur place (components/Paywall.tsx `local`),
   *  car iOS ne présente pas une modale de la racine par-dessus. */
  localHosts: number;
  registerLocalHost: () => () => void;
}

const ProContext = createContext<Ctx>({
  configured: false,
  ready: false,
  pro: false,
  managementURL: null,
  offer: null,
  freeChatLeft: FREE_CHAT_MESSAGES,
  buy: async () => 'failed',
  restorePurchases: async () => null,
  paywall: null,
  openPaywall: () => {},
  closePaywall: () => {},
  devPro: false,
  setDevPro: () => {},
  devIgnoreStore: false,
  setDevIgnoreStore: () => {},
  localHosts: 0,
  registerLocalHost: () => () => {},
});

export function ProProvider({ children }: { children: React.ReactNode }) {
  const [configured, setConfigured] = useState(false);
  const [ready, setReady] = useState(false);
  const [store, setStore] = useState<ProState>({ pro: false, managementURL: null });
  // Un seul mode garantit que les deux interrupteurs ne puissent pas se contredire.
  const [devMode, setDevMode] = useState<DevMode>('store');
  const devChangedRef = useRef(false);
  const devWriteRef = useRef(Promise.resolve());
  const [chatUsed, setChatUsed] = useState(0);
  const [offer, setOffer] = useState<ProOffer | null>(null);
  const [paywall, setPaywall] = useState<PaywallReason | null>(null);
  const [localHosts, setLocalHosts] = useState(0);
  const registerLocalHost = useCallback(() => {
    setLocalHosts((n) => n + 1);
    return () => setLocalHosts((n) => Math.max(0, n - 1));
  }, []);
  // Miroirs synchrones pour le pont (appelé hors rendu par utils/api.ts).
  const usedRef = useRef(0);
  const proRef = useRef(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [u, d] = await Promise.all([
          AsyncStorage.getItem(USAGE_KEY),
          __DEV__ ? AsyncStorage.getItem(DEV_KEY) : Promise.resolve(null),
        ]);
        if (!alive) return;
        const stored = Number(JSON.parse(u ?? '{}')?.chat ?? 0) || 0;
        // Jamais en arrière : une consommation a pu arriver pendant la lecture.
        usedRef.current = Math.max(stored, usedRef.current);
        setChatUsed(usedRef.current);
        if (__DEV__ && !devChangedRef.current) {
          // '1' était la valeur de l'ancien interrupteur « Simuler Pro ».
          setDevMode(d === '1' || d === 'pro' ? 'pro' : d === 'free' ? 'free' : 'store');
        }
      } catch {}
      let ok = false;
      try {
        ok = await configurePurchases((s) => alive && setStore(s));
      } catch {
        ok = false;
      }
      if (!alive) return;
      setConfigured(ok);
      if (ok) {
        const s = await fetchPro();
        if (alive && s) setStore(s);
        fetchOffer().then((o) => alive && o && setOffer(o));
      }
      if (alive) setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const devPro = __DEV__ && devMode === 'pro';
  const devIgnoreStore = __DEV__ && devMode === 'free';
  const pro = devIgnoreStore ? false : store.pro || devPro;
  proRef.current = pro;

  const consumeChat = useCallback(() => {
    if (proRef.current) return;
    usedRef.current += 1;
    setChatUsed(usedRef.current);
    AsyncStorage.setItem(USAGE_KEY, JSON.stringify({ chat: usedRef.current })).catch(() => {});
  }, []);

  const openPaywall = useCallback(
    (reason: PaywallReason) => {
      setPaywall(reason);
      // Prix du store : si le 1er chargement a échoué (hors connexion au lancement), on réessaie ici.
      if (configured && !offer) fetchOffer().then((o) => o && setOffer(o));
    },
    [configured, offer]
  );
  const closePaywall = useCallback(() => setPaywall(null), []);

  // 402 du serveur alors que l'app voit l'abonnement actif (achat tout juste fait et pas encore vu par le serveur,
  // ou abonnement d'un autre compte) : l'écran Pro se refermerait aussitôt et l'action échouerait sans un mot.
  const { settings } = useSettings();
  const langRef = useRef<'fr' | 'en'>('fr');
  langRef.current = settings.language === 'en' ? 'en' : 'fr';
  const serverRefused = useCallback(
    (reason: PaywallReason) => {
      if (!proRef.current) return openPaywall(reason);
      const d = proDict[langRef.current];
      Alert.alert(d.block, d.errPro);
    },
    [openPaywall]
  );

  // Pont pour utils/api.ts : savoir si une fonction est permise, décompter un message gratuit, ouvrir l'écran.
  useEffect(
    () =>
      registerProBridge({
        isPro: () => proRef.current,
        freeChatLeft: () => Math.max(0, FREE_CHAT_MESSAGES - usedRef.current),
        consumeChat,
        openPaywall,
        serverRefused,
      }),
    [consumeChat, openPaywall, serverRefused]
  );

  const buy = useCallback(async (): Promise<PurchaseResult> => {
    const o = offer ?? (await fetchOffer());
    if (!o) return 'failed';
    if (!offer) setOffer(o);
    return purchase(o);
  }, [offer]);

  const restorePurchases = useCallback(async () => {
    const s = await restore();
    if (!s) return null;
    setStore(s);
    return s.pro;
  }, []);

  const changeDevMode = useCallback((mode: DevMode) => {
    if (!__DEV__) return;
    devChangedRef.current = true;
    setDevMode(mode);
    // Sérialiser les écritures : des bascules rapides doivent persister le dernier choix.
    devWriteRef.current = devWriteRef.current
      .then(() => AsyncStorage.setItem(DEV_KEY, mode))
      .catch(() => {});
  }, []);
  const setDevPro = useCallback((v: boolean) => changeDevMode(v ? 'pro' : 'store'), [changeDevMode]);
  const setDevIgnoreStore = useCallback((v: boolean) => changeDevMode(v ? 'free' : 'store'), [changeDevMode]);

  const freeChatLeft = Math.max(0, FREE_CHAT_MESSAGES - chatUsed);
  const value = useMemo<Ctx>(
    () => ({ configured, ready, pro, managementURL: store.managementURL, offer, freeChatLeft, buy, restorePurchases, paywall, openPaywall, closePaywall, devPro, setDevPro, devIgnoreStore, setDevIgnoreStore, localHosts, registerLocalHost }),
    [configured, ready, pro, store.managementURL, offer, freeChatLeft, buy, restorePurchases, paywall, openPaywall, closePaywall, devPro, setDevPro, devIgnoreStore, setDevIgnoreStore, localHosts, registerLocalHost]
  );
  return <ProContext.Provider value={value}>{children}</ProContext.Provider>;
}

export const usePro = () => useContext(ProContext);
