/** @type {import('@bacons/apple-targets').Config} */
module.exports = {
  "type": "widget",
  "name": "RecipeWidget",
  "bundleIdentifier": ".recipe-widget",
  "deploymentTarget": "17.0",
  "frameworks": [
    "SwiftUI",
    "WidgetKit",
    "AppIntents"
  ],
  "entitlements": {
    "com.apple.security.application-groups": [
      "group.com.lndev.tchope.widgets"
    ]
  }
};
