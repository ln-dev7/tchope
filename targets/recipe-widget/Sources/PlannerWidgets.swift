import WidgetKit
import SwiftUI

// MARK: - Planner Timeline

struct PlannerEntry: TimelineEntry {
    let date: Date
    let hasPlan: Bool
    let dayLabel: String
    let dateLabel: String
    let meals: [(label: String, name: String)]
    let endDateLabel: String
}

struct PlannerTimelineProvider: TimelineProvider {
    func placeholder(in context: Context) -> PlannerEntry {
        PlannerEntry(date: Date(), hasPlan: false, dayLabel: "", dateLabel: "", meals: [], endDateLabel: "")
    }

    func getSnapshot(in context: Context, completion: @escaping (PlannerEntry) -> Void) {
        completion(buildEntry())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<PlannerEntry>) -> Void) {
        let entry = buildEntry()
        let nextUpdate = Calendar.current.date(byAdding: .hour, value: 1, to: Date())!
        completion(Timeline(entries: [entry], policy: .after(nextUpdate)))
    }

    private func buildEntry() -> PlannerEntry {
        let defaults = UserDefaults.standard
        guard let data = defaults.data(forKey: "tchope_widget_plan"),
              let plan = try? JSONDecoder().decode(WidgetPlanData.self, from: data) else {
            return PlannerEntry(date: Date(), hasPlan: false, dayLabel: "", dateLabel: "", meals: [], endDateLabel: "")
        }

        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        guard let endDate = formatter.date(from: plan.endDate),
              Date() <= Calendar.current.date(byAdding: .day, value: 1, to: endDate)! else {
            return PlannerEntry(date: Date(), hasPlan: false, dayLabel: "", dateLabel: "", meals: [], endDateLabel: "")
        }

        let today = formatter.string(from: Date())
        guard let todayMeals = plan.days[today] else {
            return PlannerEntry(date: Date(), hasPlan: true, dayLabel: dayName(Date()), dateLabel: shortDate(Date()), meals: [], endDateLabel: shortDate(endDate))
        }

        let meals = todayMeals.map { (label: $0.label, name: $0.recipeName) }
        return PlannerEntry(date: Date(), hasPlan: true, dayLabel: dayName(Date()), dateLabel: shortDate(Date()), meals: meals, endDateLabel: shortDate(endDate))
    }

    private func dayName(_ date: Date) -> String {
        let names = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"]
        return names[Calendar.current.component(.weekday, from: date) - 1]
    }

    private func shortDate(_ date: Date) -> String {
        let f = DateFormatter()
        f.dateFormat = "d/M"
        return f.string(from: date)
    }
}

struct WidgetPlanMeal: Codable {
    let label: String
    let recipeName: String
}

struct WidgetPlanData: Codable {
    let endDate: String
    let days: [String: [WidgetPlanMeal]]
}

// MARK: - Promo Widget (app theme: brown/warm)

struct PlannerPromoSmallView: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Text("📅").font(.system(size: 28))
                Spacer()
                Text("Tchopé")
                    .font(.system(size: 10, weight: .heavy))
                    .foregroundColor(Color(red: 255/255, green: 212/255, blue: 168/255))
            }
            Spacer()
            Text("Planifiez vos repas")
                .font(.system(size: 15, weight: .black))
                .foregroundColor(.white)
                .lineLimit(2)
                .padding(.top, 1)
            Text("7 jours, générés par l'IA")
                .font(.system(size: 10, weight: .medium))
                .foregroundColor(Color(red: 255/255, green: 212/255, blue: 168/255))
                .padding(.top, 2)
        }
        .padding(14)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .background(
            LinearGradient(
                colors: [Color(red: 145/255, green: 71/255, blue: 0/255), Color(red: 74/255, green: 32/255, blue: 0/255)],
                startPoint: .topLeading, endPoint: .bottomTrailing
            )
        )
    }
}

struct PlannerPromoMediumView: View {
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 6) {
                Text("Tchopé")
                    .font(.system(size: 12, weight: .heavy))
                    .foregroundColor(Color(red: 255/255, green: 212/255, blue: 168/255))
                Spacer()
                Text("Planifiez votre semaine")
                    .font(.system(size: 19, weight: .black))
                    .foregroundColor(.white)
                    .lineLimit(2)
                Text("L'IA compose vos repas sur 7 jours")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(Color(red: 255/255, green: 212/255, blue: 168/255))
            }
            Spacer()
            Text("📅").font(.system(size: 40))
        }
        .padding(18)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(
            LinearGradient(
                colors: [Color(red: 145/255, green: 71/255, blue: 0/255), Color(red: 74/255, green: 32/255, blue: 0/255)],
                startPoint: .topLeading, endPoint: .bottomTrailing
            )
        )
    }
}

// MARK: - Current Plan Widget (white card)

struct PlannerCurrentSmallView: View {
    let entry: PlannerEntry

    var body: some View {
        HStack(spacing: 14) {
            // Icon
            ZStack {
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color(red: 145/255, green: 71/255, blue: 0/255))
                    .frame(width: 48, height: 48)
                Text("🍽").font(.system(size: 22))
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(entry.dayLabel.uppercased())
                    .font(.system(size: 8, weight: .heavy))
                    .foregroundColor(Color(red: 145/255, green: 71/255, blue: 0/255))
                    .tracking(1)
                if let first = entry.meals.first {
                    Text(first.name)
                        .font(.system(size: 14, weight: .heavy))
                        .foregroundColor(Color(red: 47/255, green: 47/255, blue: 46/255))
                        .lineLimit(1)
                }
                Text(entry.meals.count > 1
                     ? "+ \(entry.meals.count - 1) autre\(entry.meals.count > 2 ? "s" : "") repas · \(entry.endDateLabel)"
                     : "Jusqu'au \(entry.endDateLabel)")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(Color(red: 92/255, green: 91/255, blue: 91/255))
            }
            Spacer()
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(red: 255/255, green: 245/255, blue: 235/255))
    }
}

struct PlannerCurrentMediumView: View {
    let entry: PlannerEntry
    let mealEmojis = ["🌤", "☀️", "🌙"]

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header
            HStack {
                VStack(alignment: .leading, spacing: 1) {
                    Text(entry.dayLabel)
                        .font(.system(size: 20, weight: .black))
                        .foregroundColor(Color(red: 47/255, green: 47/255, blue: 46/255))
                    Text(entry.dateLabel)
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(Color(red: 145/255, green: 71/255, blue: 0/255))
                }
                Spacer()
                Text("Mon Plan")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(.white)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .background(Color(red: 145/255, green: 71/255, blue: 0/255))
                    .clipShape(Capsule())
            }

            Spacer()

            // Meals
            VStack(alignment: .leading, spacing: 6) {
                ForEach(Array(entry.meals.enumerated()), id: \.offset) { idx, meal in
                    HStack(spacing: 10) {
                        ZStack {
                            RoundedRectangle(cornerRadius: 8)
                                .fill(Color(red: 145/255, green: 71/255, blue: 0/255))
                                .frame(width: 28, height: 28)
                            Text(idx < mealEmojis.count ? mealEmojis[idx] : "🍽")
                                .font(.system(size: 12))
                        }
                        VStack(alignment: .leading, spacing: 0) {
                            Text(meal.label)
                                .font(.system(size: 9, weight: .bold))
                                .foregroundColor(Color(red: 145/255, green: 71/255, blue: 0/255))
                            Text(meal.name)
                                .font(.system(size: 13, weight: .bold))
                                .foregroundColor(Color(red: 47/255, green: 47/255, blue: 46/255))
                                .lineLimit(1)
                        }
                    }
                }
            }

            // Footer
            Text("Valide jusqu'au \(entry.endDateLabel)")
                .font(.system(size: 10, weight: .medium))
                .foregroundColor(Color(red: 92/255, green: 91/255, blue: 91/255))
                .padding(.top, 6)
        }
        .padding(16)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .background(Color(red: 255/255, green: 245/255, blue: 235/255))
    }
}

// MARK: - Entry View

struct PlannerWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    let entry: PlannerEntry

    var deepLink: URL { URL(string: "tchope://(tabs)/planner")! }

    var body: some View {
        Group {
            if entry.hasPlan && !entry.meals.isEmpty {
                switch family {
                case .systemSmall: PlannerCurrentSmallView(entry: entry)
                default: PlannerCurrentMediumView(entry: entry)
                }
            } else {
                switch family {
                case .systemSmall: PlannerPromoSmallView()
                default: PlannerPromoMediumView()
                }
            }
        }
        .widgetURL(deepLink)
    }
}

// MARK: - Widget Definition

struct PlannerWidget: Widget {
    let kind = "PlannerWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: PlannerTimelineProvider()) { entry in
            if #available(iOS 17.0, *) {
                PlannerWidgetEntryView(entry: entry)
                    .containerBackground(.clear, for: .widget)
            } else {
                PlannerWidgetEntryView(entry: entry)
            }
        }
        .configurationDisplayName("Tchopé - Mon Plan")
        .description("Votre plan de repas de la semaine")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
