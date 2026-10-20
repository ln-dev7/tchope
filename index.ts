import { Platform } from "react-native";
import { registerWidgetTaskHandler } from 'react-native-android-widget';
import { widgetTaskHandler } from './widgets/widget-task-handler';
import 'expo-router/entry';

if (Platform.OS === "android") registerWidgetTaskHandler(widgetTaskHandler);
