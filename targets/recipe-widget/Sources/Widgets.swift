import WidgetKit
import SwiftUI
import AppIntents
import UIKit
import ImageIO

private let groupID = "group.com.lndev.tchope.widgets"
private let brand = "Tchopé"
private let scheme = "tchope"
struct WidgetItem: Codable, Identifiable { let id: String; let title: String; let subtitle: String; let detail: String; let symbol: String; let url: String; let image: String }
struct WidgetPage: Codable { let title: String; let subtitle: String; let empty: String; let url: String; let symbol: String; let items: [WidgetItem] }
struct WidgetColors: Codable { let bg: String; let card: String; let ink: String; let muted: String; let accent: String; let soft: String }
struct WidgetSnapshot: Codable { let version: Int; let updated: Double; let locale: String; let mode: String; let palette: String; let brand: String; let light: WidgetColors; let dark: WidgetColors; let days: [String: [String: WidgetPage]] }
func key(_ date: Date) -> String { let f=DateFormatter(); f.calendar=Calendar(identifier:.gregorian); f.locale=Locale(identifier:"en_US_POSIX"); f.dateFormat="yyyy-MM-dd"; return f.string(from:date) }
func readSnapshot() -> WidgetSnapshot? {
 guard let text=UserDefaults(suiteName:groupID)?.string(forKey:"widget_snapshot_v1"), let data=text.data(using:.utf8), let value=try? JSONDecoder().decode(WidgetSnapshot.self,from:data), value.version==1 else { return nil }
 return value
}
func tr(_ snapshot: WidgetSnapshot?, _ fr: String, _ en: String) -> String { (snapshot?.locale ?? String(Locale.current.language.languageCode?.identifier ?? "fr")) == "en" ? en : fr }
extension Color {
 init(hex:String) { let raw=hex.trimmingCharacters(in:CharacterSet(charactersIn:"#")); let n=UInt64(raw,radix:16) ?? 0; self.init(.sRGB,red:Double((n>>16)&255)/255,green:Double((n>>8)&255)/255,blue:Double(n&255)/255,opacity:1) }
}
struct Entry: TimelineEntry { let date: Date; let snapshot: WidgetSnapshot?; let kind: String; var image: UIImage? = nil
 var page: WidgetPage { snapshot?.days[key(date)]?[kind] ?? WidgetPage(title:brand,subtitle:tr(snapshot,"À PORTÉE DE MAIN","AT A GLANCE"),empty:tr(snapshot,"Ouvrez l’app pour actualiser vos widgets","Open the app to refresh your widgets"),url:"\(scheme)://",symbol:"arrow.clockwise",items:[]) }
}
func bundledImage(_ item: WidgetItem?) -> UIImage? {
 guard let item, item.image.hasPrefix("asset:"), item.id.range(of:"^[a-z0-9-]+$",options:.regularExpression) != nil else {return nil}
 let path=Bundle.main.path(forResource:item.id,ofType:"jpg",inDirectory:"assets") ?? Bundle.main.path(forResource:item.id,ofType:"jpg")
 return path.flatMap{UIImage(contentsOfFile:$0)}
}
struct Provider: TimelineProvider {
 let kind: String
 func placeholder(in context:Context) -> Entry { Entry(date:Date(),snapshot:nil,kind:kind) }
 func getSnapshot(in context:Context,completion:@escaping(Entry)->Void) { let e=Entry(date:Date(),snapshot:readSnapshot(),kind:kind); completion(e) }
 func getTimeline(in context:Context,completion:@escaping(Timeline<Entry>)->Void) {
  let now=Date(),snapshot=readSnapshot(),calendar=Calendar.current
  var entries=(0..<8).compactMap { offset -> Entry? in
   guard let day=calendar.date(byAdding:.day,value:offset,to:now) else{return nil}
   return Entry(date:offset==0 ? now:calendar.startOfDay(for:day),snapshot:snapshot,kind:kind)
  }
  // Recipes are bundled; remote destination photos are bounded, optional and cached by URLSession.
  guard kind=="discover", let first=entries.first?.page.items.first, first.image.hasPrefix("https://"), let url=URL(string:first.image) else {completion(Timeline(entries:entries,policy:.after(now.addingTimeInterval(3600))));return}
  var request=URLRequest(url:url,cachePolicy:.returnCacheDataElseLoad,timeoutInterval:7)
  request.setValue("image/*",forHTTPHeaderField:"Accept")
  URLSession.shared.dataTask(with:request) { data,response,_ in
   if let data, data.count < 8_000_000, (response as? HTTPURLResponse)?.statusCode==200, let source=CGImageSourceCreateWithData(data as CFData,nil), let cg=CGImageSourceCreateThumbnailAtIndex(source,0,[kCGImageSourceCreateThumbnailFromImageAlways:true,kCGImageSourceThumbnailMaxPixelSize:700,kCGImageSourceCreateThumbnailWithTransform:true] as CFDictionary) {entries[0].image=UIImage(cgImage:cg)}
   completion(Timeline(entries:entries,policy:.after(now.addingTimeInterval(3600))))
  }.resume()
 }
}
struct WidgetCard: View {
 @Environment(\.widgetFamily) private var family
 @Environment(\.colorScheme) private var systemScheme
 @Environment(\.widgetRenderingMode) private var renderingMode
 let entry: Entry
 var c: WidgetColors {
  let dark=entry.snapshot?.mode == "dark" || (entry.snapshot?.mode != "light" && systemScheme == .dark)
  return (dark ? entry.snapshot?.dark:entry.snapshot?.light) ?? WidgetColors(bg:dark ? "#191713":"#FAF8F4",card:dark ? "#2D2923":"#FFFFFF",ink:dark ? "#F6F0E6":"#29241F",muted:dark ? "#C8BFB2":"#625B52",accent:"#A84027",soft:dark ? "#3D292A":"#F7E7DE")
 }
 var page:WidgetPage{entry.page}
 var accessory:Bool{family == .accessoryCircular || family == .accessoryInline || family == .accessoryRectangular}
 var first:WidgetItem?{page.items.first}
 var destination:URL?{URL(string: entry.kind=="discover" ? first?.url ?? page.url:page.url)}
 var big:Bool{family == .systemLarge || family == .systemExtraLarge}
 var body:some View {
  Group {
   if accessory { lockView }
   else { content.padding(16).foregroundStyle(Color(hex:c.ink)) }
  }
  .widgetURL(destination)
  .containerBackground(for:.widget) { Color(hex:c.bg) }
 }
 @ViewBuilder var lockView:some View {
  switch family {
  case .accessoryInline: Label(first?.title ?? brand,systemImage:page.symbol).lineLimit(1)
  case .accessoryCircular:
   ZStack { AccessoryWidgetBackground(); VStack(spacing:3){Image(systemName:page.symbol).font(.title3);Text(entry.kind=="discover" ? brand : "\(page.items.count)").font(.caption2.bold()).lineLimit(1)} }
  default:
   VStack(alignment:.leading,spacing:3){Label(page.title,systemImage:page.symbol).font(.caption.bold()).widgetAccentable();Text(first?.title ?? page.empty).font(.caption).lineLimit(2)}
  }
 }
 var masthead:some View {
  HStack { Text(brand).font(.system(size:12,weight:.heavy,design:.rounded)); Spacer(minLength:4);Image(systemName:page.symbol).font(.system(size:13,weight:.semibold)) }.foregroundStyle(Color(hex:c.accent)).widgetAccentable()
 }
 @ViewBuilder var content:some View {
  VStack(alignment:.leading,spacing:12) {
   masthead
   if entry.kind=="shortcuts" && family == .systemMedium {
    Text(page.title).font(.system(size:19,weight:.bold,design:.rounded)).lineLimit(1)
    HStack(spacing:12){ForEach(page.items.prefix(3)){item in
     Link(destination:URL(string:item.url)!){VStack(spacing:7){Image(systemName:item.symbol).font(.system(size:21,weight:.medium));Text(item.title).font(.system(size:11,weight:.semibold)).lineLimit(1)}.frame(maxWidth:.infinity,maxHeight:.infinity).foregroundStyle(Color(hex:c.accent)).padding(.vertical,10).background(Color(hex:c.soft),in:RoundedRectangle(cornerRadius:15)).widgetAccentable()}
    }}
   } else if entry.kind=="discover", let first {
    if family == .systemMedium { HStack(spacing:16){photo(first).frame(width:115);heroText(first)} }
    else if family == .systemExtraLarge { HStack(spacing:24){photo(first);heroText(first).frame(maxWidth:260)} }
    else { if big{photo(first).frame(maxHeight:.infinity)};heroText(first);if !big{Spacer(minLength:0)} }
   } else {
    Text(page.title).font(.system(size:big ? 27:20,weight:.bold,design:.rounded)).lineLimit(2).minimumScaleFactor(0.8)
    if page.items.isEmpty {
     Spacer(minLength:0)
     Image(systemName:page.symbol).font(.system(size:big ? 38:26,weight:.light)).foregroundStyle(Color(hex:c.accent)).widgetAccentable()
     Text(page.empty).font(.system(size:13)).foregroundStyle(Color(hex:c.muted)).lineLimit(3)
     Spacer(minLength:0)
    } else {
     VStack(spacing:big ? 12:8){ForEach(Array(page.items.prefix(big ? 5:family == .systemSmall ? 1:2))){item in row(item)}}
     Spacer(minLength:0)
    }
   }
  }.frame(maxWidth:.infinity,maxHeight:.infinity,alignment:.topLeading)
 }
 func heroText(_ item:WidgetItem)->some View {
  VStack(alignment:.leading,spacing:big ? 10:6){
   Text(page.subtitle).font(.system(size:8,weight:.bold)).tracking(1.3).foregroundStyle(Color(hex:c.accent)).widgetAccentable().lineLimit(1)
   Text(item.title).font(.system(size:big ? 32:24,weight:.bold,design:.serif)).lineLimit(2).minimumScaleFactor(0.75)
   Text([item.subtitle,item.detail].filter{!$0.isEmpty}.joined(separator:" · ")).font(.system(size:12)).foregroundStyle(Color(hex:c.muted)).lineLimit(big ? 3:2)
   if big { Label(tr(entry.snapshot,"Découvrir","Discover"),systemImage:"arrow.up.right").font(.system(size:12,weight:.semibold)).padding(.horizontal,12).padding(.vertical,8).background(Color(hex:c.soft),in:Capsule()).foregroundStyle(Color(hex:c.accent)).widgetAccentable() }
  }.frame(maxWidth:.infinity,alignment:.leading)
 }
 @ViewBuilder func photo(_ item:WidgetItem)->some View {
  GeometryReader{g in
   if let image=entry.image ?? bundledImage(item) { Image(uiImage:image).resizable().scaledToFill().frame(width:g.size.width,height:g.size.height).clipped().clipShape(RoundedRectangle(cornerRadius:18)) }
   else { ZStack{Color(hex:c.soft);Image(systemName:page.symbol).font(.system(size:48,weight:.ultraLight)).foregroundStyle(Color(hex:c.accent))}.clipShape(RoundedRectangle(cornerRadius:18)) }
  }
 }
 func row(_ item:WidgetItem)->some View {
  Link(destination:URL(string:item.url) ?? URL(string:"\(scheme)://")!){
   HStack(spacing:10){
    Image(systemName:item.symbol).font(.system(size:14)).frame(width:32,height:32).foregroundStyle(Color(hex:c.accent)).background(Color(hex:c.soft),in:RoundedRectangle(cornerRadius:10)).widgetAccentable()
    VStack(alignment:.leading,spacing:3){Text(item.title).font(.system(size:14,weight:.semibold)).lineLimit(1);Text([item.subtitle,item.detail].filter{!$0.isEmpty}.joined(separator:" · ")).font(.system(size:11)).foregroundStyle(Color(hex:c.muted)).lineLimit(1)}
    Spacer(minLength:0); Image(systemName:"chevron.right").font(.system(size:9,weight:.bold)).foregroundStyle(Color(hex:c.accent))
   }.frame(maxWidth:.infinity,alignment:.leading)
  }
 }
}
struct RecipeOfTheDay: Widget {
 var body: some WidgetConfiguration {
  StaticConfiguration(kind:"RecipeOfTheDay",provider:Provider(kind:"discover")) { entry in WidgetCard(entry:entry) }
   .configurationDisplayName("Daily discovery").description("Daily discovery in Tchopé")
   .supportedFamilies([.systemSmall,.systemMedium,.systemLarge,.systemExtraLarge,.accessoryCircular,.accessoryInline,.accessoryRectangular]).contentMarginsDisabled()
 }
}
struct RecipeFavorites: Widget {
 var body: some WidgetConfiguration {
  StaticConfiguration(kind:"RecipeFavorites",provider:Provider(kind:"favorites")) { entry in WidgetCard(entry:entry) }
   .configurationDisplayName("Favourites").description("Favourites in Tchopé")
   .supportedFamilies([.systemSmall,.systemMedium,.systemLarge,.systemExtraLarge,.accessoryCircular,.accessoryInline,.accessoryRectangular]).contentMarginsDisabled()
 }
}
struct PlannerWidget: Widget {
 var body: some WidgetConfiguration {
  StaticConfiguration(kind:"PlannerWidget",provider:Provider(kind:"agenda")) { entry in WidgetCard(entry:entry) }
   .configurationDisplayName("Meal plan").description("Meal plan in Tchopé")
   .supportedFamilies([.systemSmall,.systemMedium,.systemLarge,.systemExtraLarge,.accessoryCircular,.accessoryInline,.accessoryRectangular]).contentMarginsDisabled()
 }
}
struct KitchenShortcuts: Widget {
 var body: some WidgetConfiguration {
  StaticConfiguration(kind:"KitchenShortcuts",provider:Provider(kind:"shortcuts")) { entry in WidgetCard(entry:entry) }
   .configurationDisplayName("Shortcuts").description("Shortcuts in Tchopé")
   .supportedFamilies([.systemSmall,.systemMedium,.systemLarge,.systemExtraLarge,.accessoryCircular,.accessoryInline,.accessoryRectangular]).contentMarginsDisabled()
 }
}
struct ShoppingWidget: Widget {
 var body: some WidgetConfiguration {
  StaticConfiguration(kind:"ShoppingWidget",provider:Provider(kind:"shopping")) { entry in WidgetCard(entry:entry) }
   .configurationDisplayName("Shopping list").description("Shopping list in Tchopé")
   .supportedFamilies([.systemSmall,.systemMedium,.systemLarge,.systemExtraLarge,.accessoryCircular,.accessoryInline,.accessoryRectangular]).contentMarginsDisabled()
 }
}
@available(iOS 18.0, *)
struct AssistantIntent: AppIntent {
 static var title: LocalizedStringResource = "TchopAI"
 static var openAppWhenRun: Bool = true
 func perform() async throws -> some IntentResult & OpensIntent { .result(opensIntent:OpenURLIntent(URL(string:"tchope://tchop-ai")!)) }
}
@available(iOS 18.0, *)
struct AssistantControl: ControlWidget {
 var body:some ControlWidgetConfiguration {
  StaticControlConfiguration(kind:"tchope.assistant-control") { ControlWidgetButton(action:AssistantIntent()){Label("TchopAI",systemImage:"sparkles")} }.displayName("TchopAI")
 }
}
@main struct RecipeWidgetBundle: WidgetBundle {
 var body:some Widget {
  RecipeOfTheDay()
  RecipeFavorites()
  PlannerWidget()
  KitchenShortcuts()
  ShoppingWidget()
  if #available(iOS 18.0, *) { AssistantControl() }
 }
}
