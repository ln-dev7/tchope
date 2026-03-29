import WidgetKit
import SwiftUI

// MARK: - Data Model

struct WidgetRecipe {
    let id: String
    let name: String
    let region: String
    let duration: Int
    let emoji: String
    let imageUrl: String
}

// MARK: - Featured Recipes

let featuredRecipes: [WidgetRecipe] = [
    WidgetRecipe(id: "ndole", name: "Ndolé", region: "Littoral", duration: 120, emoji: "🍃",
                 imageUrl: "https://upload.wikimedia.org/wikipedia/commons/9/91/Ndol%C3%A8_%C3%A0_la_viande%2C_morue_et_crevettes.jpg"),
    WidgetRecipe(id: "poulet-dg", name: "Poulet DG", region: "Centre", duration: 90, emoji: "🍗",
                 imageUrl: "https://upload.wikimedia.org/wikipedia/commons/3/30/Poulet_DG.JPG"),
    WidgetRecipe(id: "eru", name: "Eru", region: "Sud-Ouest", duration: 60, emoji: "🥬",
                 imageUrl: "https://upload.wikimedia.org/wikipedia/commons/5/5f/Eru_Soup.jpg"),
    WidgetRecipe(id: "mbongo-tchobi", name: "Mbongo Tchobi", region: "Littoral", duration: 120, emoji: "🐟",
                 imageUrl: "https://upload.wikimedia.org/wikipedia/commons/5/55/Mbongo_tchobi_et_banae_plantin_malx%C3%A9.jpg"),
    WidgetRecipe(id: "koki", name: "Koki", region: "Ouest", duration: 240, emoji: "🫘",
                 imageUrl: "https://upload.wikimedia.org/wikipedia/commons/d/d8/Koki_and_ripe_plantains.jpg"),
    WidgetRecipe(id: "taro-sauce-jaune", name: "Taro Sauce Jaune", region: "Ouest", duration: 90, emoji: "🥘",
                 imageUrl: "https://upload.wikimedia.org/wikipedia/commons/8/82/Taro_sauce_jaune.jpg"),
    WidgetRecipe(id: "kondre", name: "Kondré", region: "Ouest", duration: 120, emoji: "🍌",
                 imageUrl: "https://upload.wikimedia.org/wikipedia/commons/9/9a/Kondr%C3%A8_%C3%A0_la_viande_de_b%C5%93uf.png"),
    WidgetRecipe(id: "sanga", name: "Sanga", region: "Centre", duration: 90, emoji: "🌽",
                 imageUrl: "https://upload.wikimedia.org/wikipedia/commons/7/7c/Sanga%2C_Plat_camerounais.jpg"),
    WidgetRecipe(id: "okok-sucre", name: "Okok Sucré", region: "Centre", duration: 60, emoji: "🍃",
                 imageUrl: "https://upload.wikimedia.org/wikipedia/commons/b/bd/Ikok_mix%C3%A9_et_son_manioc_vapeur.jpg"),
    WidgetRecipe(id: "poisson-braise", name: "Poisson Braisé", region: "Littoral", duration: 60, emoji: "🐠",
                 imageUrl: "https://upload.wikimedia.org/wikipedia/commons/c/c0/Poisson_brais%C3%A9_%C3%A0_la_fa%C3%A7on_du_Cameroun%2C_Kribi.JPG"),
    WidgetRecipe(id: "ekwang", name: "Ekwang", region: "Littoral", duration: 180, emoji: "🥬",
                 imageUrl: "https://upload.wikimedia.org/wikipedia/commons/e/ec/Ekwang.jpg"),
    WidgetRecipe(id: "okok", name: "Okok", region: "Centre", duration: 45, emoji: "🍃",
                 imageUrl: "https://upload.wikimedia.org/wikipedia/commons/1/1d/Okok.jpg"),
    WidgetRecipe(id: "bikedi", name: "Bikedi", region: "Sud", duration: 210, emoji: "🫘",
                 imageUrl: "https://upload.wikimedia.org/wikipedia/commons/d/d8/Koki_and_ripe_plantains.jpg"),
]

func getRecipeOfTheDay() -> WidgetRecipe {
    let calendar = Calendar.current
    let today = Date()
    let year = calendar.component(.year, from: today)
    let month = calendar.component(.month, from: today)
    let day = calendar.component(.day, from: today)
    let index = (year * 366 + month * 31 + day) % featuredRecipes.count
    return featuredRecipes[index]
}

// MARK: - Image Downloader

func downloadImage(from urlString: String, completion: @escaping (UIImage?) -> Void) {
    guard let url = URL(string: urlString) else {
        completion(nil)
        return
    }
    let task = URLSession.shared.dataTask(with: url) { data, _, _ in
        if let data = data, let image = UIImage(data: data) {
            completion(image)
        } else {
            completion(nil)
        }
    }
    task.resume()
}

// MARK: - Timeline

struct RecipeEntry: TimelineEntry {
    let date: Date
    let recipe: WidgetRecipe
    let image: UIImage?
}

struct RecipeTimelineProvider: TimelineProvider {
    func placeholder(in context: Context) -> RecipeEntry {
        RecipeEntry(date: Date(), recipe: featuredRecipes[0], image: nil)
    }

    func getSnapshot(in context: Context, completion: @escaping (RecipeEntry) -> Void) {
        let recipe = getRecipeOfTheDay()
        downloadImage(from: recipe.imageUrl) { image in
            completion(RecipeEntry(date: Date(), recipe: recipe, image: image))
        }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<RecipeEntry>) -> Void) {
        let recipe = getRecipeOfTheDay()
        downloadImage(from: recipe.imageUrl) { image in
            let entry = RecipeEntry(date: Date(), recipe: recipe, image: image)
            let calendar = Calendar.current
            let tomorrow = calendar.startOfDay(for: calendar.date(byAdding: .day, value: 1, to: Date())!)
            completion(Timeline(entries: [entry], policy: .after(tomorrow)))
        }
    }
}

// MARK: - Colors

extension Color {
    static let tchopeAccent = Color(red: 145/255, green: 71/255, blue: 0/255)
    static let tchopeText = Color(red: 47/255, green: 47/255, blue: 46/255)
    static let tchopeBg = Color(red: 255/255, green: 245/255, blue: 235/255)
    static let tchopePlaceholder = Color(red: 232/255, green: 213/255, blue: 196/255)
}

// MARK: - Recipe Image View

struct RecipeImageView: View {
    let image: UIImage?
    let emoji: String

    var body: some View {
        if let uiImage = image {
            Image(uiImage: uiImage)
                .resizable()
                .aspectRatio(contentMode: .fill)
        } else {
            // Fallback with emoji
            ZStack {
                Color.tchopePlaceholder
                Text(emoji)
                    .font(.system(size: 40))
            }
        }
    }
}

// MARK: - Medium Widget View (image top, content bottom)

struct RecipeWidgetMediumView: View {
    let entry: RecipeEntry

    var body: some View {
        VStack(spacing: 0) {
            // Image top
            RecipeImageView(image: entry.image, emoji: entry.recipe.emoji)
                .frame(maxWidth: .infinity)
                .frame(height: 80)
                .clipped()

            // Content bottom
            VStack(alignment: .leading, spacing: 5) {
                // Badge
                HStack {
                    Text("\(entry.recipe.emoji)  Recette du jour")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(.white)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 3)
                        .background(Color.tchopeAccent)
                        .clipShape(Capsule())
                    Spacer()
                }

                // Recipe name
                Text(entry.recipe.name)
                    .font(.system(size: 18, weight: .black))
                    .foregroundColor(Color.tchopeText)
                    .lineLimit(1)

                // Details
                HStack(spacing: 12) {
                    Label(entry.recipe.region, systemImage: "mappin")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(Color.tchopeAccent)
                    Label("\(entry.recipe.duration) min", systemImage: "timer")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(Color.tchopeAccent)
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .background(Color.tchopeBg)
    }
}

// MARK: - Small Widget View (emoji + text, no image)

struct RecipeWidgetSmallView: View {
    let entry: RecipeEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Top: emoji
            HStack {
                Text(entry.recipe.emoji)
                    .font(.system(size: 32))
                Spacer()
            }

            Spacer()

            // Badge
            Text("Recette du jour")
                .font(.system(size: 9, weight: .bold))
                .foregroundColor(.white)
                .padding(.horizontal, 8)
                .padding(.vertical, 2)
                .background(Color.tchopeAccent)
                .clipShape(Capsule())

            // Name
            Text(entry.recipe.name)
                .font(.system(size: 16, weight: .black))
                .foregroundColor(Color.tchopeText)
                .lineLimit(2)
                .padding(.top, 2)

            // Details
            HStack(spacing: 4) {
                Image(systemName: "mappin")
                    .font(.system(size: 8))
                Text(entry.recipe.region)
                    .font(.system(size: 10, weight: .semibold))
                Text("·")
                    .font(.system(size: 10))
                Image(systemName: "timer")
                    .font(.system(size: 8))
                Text("\(entry.recipe.duration) min")
                    .font(.system(size: 10, weight: .semibold))
            }
            .foregroundColor(Color.tchopeAccent)
            .padding(.top, 2)
        }
        .padding(14)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .background(
            LinearGradient(
                colors: [Color.white, Color.tchopeBg],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
    }
}

// MARK: - Widget Entry View

struct RecipeWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    let entry: RecipeEntry

    var deepLink: URL {
        URL(string: "tchope://recipe/\(entry.recipe.id)")!
    }

    var body: some View {
        Group {
            switch family {
            case .systemSmall:
                RecipeWidgetSmallView(entry: entry)
            case .systemMedium:
                RecipeWidgetMediumView(entry: entry)
            default:
                RecipeWidgetMediumView(entry: entry)
            }
        }
        .widgetURL(deepLink)
    }
}

// MARK: - Widget Definition

struct RecipeOfTheDayWidget: Widget {
    let kind: String = "RecipeOfTheDay"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: RecipeTimelineProvider()) { entry in
            if #available(iOS 17.0, *) {
                RecipeWidgetEntryView(entry: entry)
                    .containerBackground(.clear, for: .widget)
            } else {
                RecipeWidgetEntryView(entry: entry)
            }
        }
        .configurationDisplayName("Tchopé")
        .description("Découvrez une nouvelle recette camerounaise chaque jour")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

// MARK: - Widget Bundle

@main
struct RecipeWidgetBundle: WidgetBundle {
    var body: some Widget {
        RecipeOfTheDayWidget()
    }
}
