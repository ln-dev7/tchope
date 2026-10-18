import AsyncStorage from "@react-native-async-storage/async-storage";
import { createLiveQuota } from "@/lib/live/quota";
export const liveQuota = createLiveQuota(AsyncStorage);
