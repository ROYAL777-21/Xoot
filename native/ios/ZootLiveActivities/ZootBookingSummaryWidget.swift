import AppIntents
import SwiftUI
import WidgetKit

@available(iOSApplicationExtension 17.0, *)
enum ZootWidgetKind: String, AppEnum {
    case nextBooking
    case carePlusReadiness
    case zootCred
    case favouriteZooter
    case acceptedZooterJob

    static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Zoot Widget")
    static var caseDisplayRepresentations: [ZootWidgetKind: DisplayRepresentation] = [
        .nextBooking: "Next Booking",
        .carePlusReadiness: "Care+ Readiness",
        .zootCred: "ZootCred",
        .favouriteZooter: "Favourite Zooter",
        .acceptedZooterJob: "Accepted Zooter Job",
    ]
}

@available(iOSApplicationExtension 17.0, *)
struct ZootWidgetConfigurationIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Choose Zoot Widget"
    static var description = IntentDescription("Choose the Zoot summary you want on your Home Screen.")

    @Parameter(title: "Widget")
    var widgetKind: ZootWidgetKind

    init(widgetKind: ZootWidgetKind = .nextBooking) {
        self.widgetKind = widgetKind
    }

    init() {
        self.widgetKind = .nextBooking
    }
}

struct ZootWidgetEntry: TimelineEntry {
    let date: Date
    let kind: String
    let title: String
    let value: String
    let detail: String
    let deeplink: URL
}

@available(iOSApplicationExtension 17.0, *)
struct ZootWidgetProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> ZootWidgetEntry {
        ZootWidgetEntry(date: .now, kind: "Zoot", title: "Safe summary", value: "Open app", detail: "Live details stay inside Zoot", deeplink: URL(string: "zoot://app")!)
    }

    func snapshot(for configuration: ZootWidgetConfigurationIntent, in context: Context) async -> ZootWidgetEntry {
        entry(for: configuration.widgetKind)
    }

    func timeline(for configuration: ZootWidgetConfigurationIntent, in context: Context) async -> Timeline<ZootWidgetEntry> {
        Timeline(entries: [entry(for: configuration.widgetKind)], policy: .after(Date.now.addingTimeInterval(15 * 60)))
    }

    private func entry(for kind: ZootWidgetKind) -> ZootWidgetEntry {
        switch kind {
        case .nextBooking:
            return ZootWidgetEntry(date: .now, kind: "Booking", title: "Next clean", value: "Open app", detail: "View live time and safe status in Zoot", deeplink: URL(string: "zoot://bookings")!)
        case .carePlusReadiness:
            return ZootWidgetEntry(date: .now, kind: "Care+", title: "Home readiness", value: "Open app", detail: "Check live member reminders in Zoot", deeplink: URL(string: "zoot://care-plus")!)
        case .zootCred:
            return ZootWidgetEntry(date: .now, kind: "ZootCred", title: "Available", value: "Open app", detail: "Balance and expiry stay in Zoot", deeplink: URL(string: "zoot://loyalty")!)
        case .favouriteZooter:
            return ZootWidgetEntry(date: .now, kind: "Favourite", title: "Favourite Zooter", value: "Open app", detail: "Book again from your signed-in profile", deeplink: URL(string: "zoot://favorites")!)
        case .acceptedZooterJob:
            return ZootWidgetEntry(date: .now, kind: "Zooter", title: "Accepted job", value: "Open route", detail: "Address opens in the authenticated job screen", deeplink: URL(string: "zoot://zooter/jobs")!)
        }
    }
}

@available(iOSApplicationExtension 17.0, *)
struct ZootBookingSummaryWidget: Widget {
    let kind = "ZootBookingSummaryWidget"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: kind, intent: ZootWidgetConfigurationIntent.self, provider: ZootWidgetProvider()) { entry in
            ZootWidgetEntryView(entry: entry)
                .containerBackground(Color(red: 0.98, green: 0.96, blue: 0.91), for: .widget)
        }
        .configurationDisplayName("Zoot")
        .description("Create a Zoot widget for bookings, Care+, ZootCred, favourite Zooters, or accepted Zooter jobs.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

struct ZootWidgetEntryView: View {
    let entry: ZootWidgetEntry

    var body: some View {
        Link(destination: entry.deeplink) {
            ZootLiquidGlassGroup(spacing: 12) {
                VStack(alignment: .leading, spacing: 12) {
                    HStack(alignment: .top, spacing: 10) {
                        ZootRoboticStarMark()
                            .zootLiquidGlassCard(cornerRadius: 17, tint: .zootGold, interactive: true)
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Zoot")
                                .font(.caption.bold())
                                .foregroundStyle(Color.zootGold)
                            Text(entry.kind)
                                .font(.caption2.weight(.semibold))
                                .foregroundStyle(.secondary)
                        }
                        Spacer(minLength: 6)
                        Image(systemName: "arrow.up.forward")
                            .font(.caption.weight(.bold))
                            .foregroundStyle(Color.zootGold.opacity(0.88))
                    }

                    Spacer(minLength: 0)

                    Text(entry.title)
                        .font(.headline)
                        .foregroundStyle(.primary)
                        .lineLimit(2)
                    Text(entry.value)
                        .font(.title.weight(.black))
                        .foregroundStyle(.primary)
                        .minimumScaleFactor(0.75)
                    Text(entry.detail)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                }
                .padding()
                .zootLiquidGlassCard(cornerRadius: 24, tint: .zootCream, interactive: true)
            }
        }
    }
}
