// Retire l'entitlement `aps-environment` (push APNs). Ces apps n'utilisent que des
// notifications LOCALES — aucun push distant. Sans cet entitlement, les builds EAS
// authentifiés par clé App Store Connect passent sans capability "Push Notifications"
// dans le provisioning profile (que la clé API ne peut pas y inscrire).
const { withEntitlementsPlist } = require("@expo/config-plugins");

module.exports = function withNoApsEnvironment(config) {
  return withEntitlementsPlist(config, (cfg) => {
    delete cfg.modResults["aps-environment"];
    return cfg;
  });
};
