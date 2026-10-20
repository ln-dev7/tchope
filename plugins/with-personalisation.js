// Complements expo-alternate-app-icons 8.0.0; paired with its versioned Android patch.
// Register BEFORE upstream in app.json: Expo mod actions run in reverse registration order.
const { withAndroidManifest, withXcodeProject, AndroidConfig } = require('expo/config-plugins');
module.exports = function withPersonalisation(config) {
  config = withAndroidManifest(config, config => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);
    const main = AndroidConfig.Manifest.getMainActivityOrThrow(config.modResults);
    const isLauncher = filter => filter.category?.some(c => c.$['android:name'] === 'android.intent.category.LAUNCHER');
    main['intent-filter'] = (main['intent-filter'] || []).filter(filter => !isLauncher(filter));
    main.$['android:enabled'] = 'true';
    const aliases = app['activity-alias'] || [];
    const defaultAlias = { $: {
      'android:name': '.MainActivityDefault', 'android:targetActivity': '.MainActivity',
      'android:enabled': 'true', 'android:exported': 'true',
      'android:icon': '@mipmap/ic_launcher',
    }, 'intent-filter': [{ action: [{ $: { 'android:name': 'android.intent.action.MAIN' } }],
      category: [{ $: { 'android:name': 'android.intent.category.LAUNCHER' } }] }] };
    // Deep links stay on the real Activity; alternate aliases only serve the launcher.
    for (const alias of aliases) {
      if (alias.$['android:targetActivity'] === '.MainActivity') {
        alias['intent-filter'] = alias['intent-filter']?.filter(isLauncher);
        alias.$['android:roundIcon'] = alias.$['android:icon'];
      }
    }
    app['activity-alias'] = [...aliases.filter(a => a.$['android:name'] !== '.MainActivityDefault'), defaultAlias];
    return config;
  });
  config = withXcodeProject(config, config => {
    // Upstream sets every configuration, including project-wide settings inherited by widgets.
    const project = config.modResults;
    const objects = project.hash.project.objects;
    for (const [key, target] of Object.entries({ ...objects.PBXProject, ...objects.PBXNativeTarget })) {
      if (key.endsWith('_comment') || typeof target !== 'object') continue;
      const application = String(target.productType).includes('application');
      if (application) continue;
      const list = objects.XCConfigurationList[target.buildConfigurationList];
      for (const entry of list?.buildConfigurations || []) {
        const settings = objects.XCBuildConfiguration[entry.value]?.buildSettings;
        if (settings) delete settings.ASSETCATALOG_COMPILER_ALTERNATE_APPICON_NAMES;
      }
    }
    return config;
  });
  return config;
};
