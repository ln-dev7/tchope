import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';
import { buildSnapshot } from './snapshot';
let last = ''; let pending: Promise<void> | null = null;
export function syncWidgets(): Promise<void> {
 if (Platform.OS === 'web') return Promise.resolve();
 if (pending) return pending;
 pending = (async () => {
  const snapshot = await buildSnapshot();
  const signature = JSON.stringify({ ...snapshot, updated: 0 });
  if (signature === last) return;
  if (Platform.OS === 'ios') {
   const native = requireOptionalNativeModule<{setString: (key:string, value:string, group:string) => void; reloadWidget: (kind: string | null) => void}>('ExtensionStorage');
   if (!native) return;
   native.setString('widget_snapshot_v1', JSON.stringify(snapshot), 'group.com.lndev.tchope.widgets');
   native.reloadWidget(null);
  } else {
   const { refreshAndroidWidgets } = await import('./widget-task-handler');
   await refreshAndroidWidgets(snapshot);
  }
  last = signature;
 })().catch(error => { if (__DEV__) console.warn('Widget sync deferred', error); }).finally(() => { pending = null; });
 return pending;
}
