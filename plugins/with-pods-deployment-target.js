// Aligne la cible iOS minimale de TOUTES les cibles CocoaPods (y compris les
// « resource bundles » : RNCAsyncStorage_resources, RNSVGFilters, GoogleMobileAdsResources,
// SDWebImage…) sur celle de l'app. React Native ne corrige que les cibles natives
// (`updateOSDeploymentTarget` dans scripts/cocoapods/utils.rb), et les bundles de
// ressources gardent leur valeur d'origine (9.0, 12.0, 12.4, 13.4…), ce que Xcode 26
// refuse : « deployment target … is set to 12.4, but the range of supported deployment
// target versions is 15.0 to 26.x » → Build Failed.
//
// Le dossier ios/ est ignoré par git et régénéré par `expo prebuild` : c'est pourquoi la
// correction vit ici, dans un plugin de config, et pas dans ios/Podfile à la main.
const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

const MARKER = "# tchope: deployment target des pods";
const SNIPPET = `
    ${MARKER}
    min_target = min_ios_version_supported.to_f
    installer.pods_project.targets.each do |t|
      t.build_configurations.each do |c|
        current = c.build_settings['IPHONEOS_DEPLOYMENT_TARGET'].to_f
        c.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = [current, min_target].max.to_s
      end
    end
`;

module.exports = function withPodsDeploymentTarget(config) {
  return withDangerousMod(config, [
    "ios",
    (cfg) => {
      const podfile = path.join(cfg.modRequest.platformProjectRoot, "Podfile");
      let src = fs.readFileSync(podfile, "utf8");
      if (!src.includes(MARKER)) {
        const anchor = /post_install do \|installer\|\n/;
        if (!anchor.test(src)) throw new Error("with-pods-deployment-target : bloc post_install introuvable dans ios/Podfile");
        src = src.replace(anchor, (m) => m + SNIPPET);
        fs.writeFileSync(podfile, src);
      }
      return cfg;
    },
  ]);
};
