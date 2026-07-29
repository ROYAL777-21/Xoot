import AppIntents
import SwiftUI
import WidgetKit

@available(iOSApplicationExtension 17.0, *)
enum XootWidgetKind: String, AppEnum {
    case nextBooking
    case carePlusReadiness
    case zootCred
    case favouriteXooter
    case acceptedXooterJob

    static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Xoot Widget")
    static var caseDisplayRepresentations: [XootWidgetKind: DisplayRepresentation] = [
        .nextBooking: "Next Booking",
        .carePlusReadiness: "Care+ Readiness",
        .zootCred: "XootCred",
        .favouriteXooter: "Favourite Xooter",
        .acceptedXooterJob: "Accepted Xooter Job",
    ]
}

@available(iOSApplicationExtension 17.0, *)
struct XootWidgetConfigurationIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Choose Xoot Widget"
    static var description = IntentDescription("Choose the Xoot summary you want on your Home Screen.")

    @Parameter(title: "Widget")
    var widgetKind: XootWidgetKind

    init(widgetKind: XootWidgetKind = .nextBooking) {
        self.widgetKind = widgetKind
    }

    init() {
        self.widgetKind = .nextBooking
    }
}

struct XootWidgetEntry: TimelineEntry {
    let date: Date
    let kind: String
    let title: String
    let value: String
    let detail: String
    let deeplink: URL
}

@available(iOSApplicationExtension 17.0, *)
struct XootWidgetProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> XootWidgetEntry {
        XootWidgetEntry(date: .now, kind: "Xoot", title: "Safe summary", value: "Open app", detail: "Live details stay inside Xoot", deeplink: URL(string: "zoot://app")!)
    }

    func snapshot(for configuration: XootWidgetConfigurationIntent, in context: Context) async -> XootWidgetEntry {
        entry(for: configuration.widgetKind)
    }

    func timeline(for configuration: XootWidgetConfigurationIntent, in context: Context) async -> Timeline<XootWidgetEntry> {
        Timeline(entries: [entry(for: configuration.widgetKind)], policy: .after(Date.now.addingTimeInterval(15 * 60)))
    }

    private func entry(for kind: XootWidgetKind) -> XootWidgetEntry {
        switch kind {
        case .nextBooking:
            return XootWidgetEntry(date: .now, kind: "Booking", title: "Next clean", value: "Open app", detail: "View live time and safe status in Xoot", deeplink: URL(string: "zoot://bookings")!)
        case .carePlusReadiness:
            return XootWidgetEntry(date: .now, kind: "Care+", title: "Home readiness", value: "Open app", detail: "Check live member reminders in Xoot", deeplink: URL(string: "zoot://care-plus")!)
        case .zootCred:
            return XootWidgetEntry(date: .now, kind: "XootCred", title: "Available", value: "Open app", detail: "Balance and expiry stay in Xoot", deeplink: URL(string: "zoot://loyalty")!)
        case .favouriteXooter:
            return XootWidgetEntry(date: .now, kind: "Favourite", title: "Favourite Xooter", value: "Open app", detail: "Book again from your signed-in profile", deeplink: URL(string: "zoot://favorites")!)
        case .acceptedXooterJob:
            return XootWidgetEntry(date: .now, kind: "Xooter", title: "Accepted job", value: "Open route", detail: "Address opens in the authenticated job screen", deeplink: URL(string: "zoot://zooter/jobs")!)
        }
    }
}

@available(iOSApplicationExtension 17.0, *)
struct XootBookingSummaryWidget: Widget {
    let kind = "XootBookingSummaryWidget"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: kind, intent: XootWidgetConfigurationIntent.self, provider: XootWidgetProvider()) { entry in
            XootWidgetEntryView(entry: entry)
                .containerBackground(Color(red: 0.98, green: 0.96, blue: 0.91), for: .widget)
        }
        .configurationDisplayName("Xoot")
        .description("Create a Xoot widget for bookings, Care+, XootCred, favourite Xooters, or accepted Xooter jobs.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

struct XootWidgetEntryView: View {
    let entry: XootWidgetEntry

    var body: some View {
        Link(destination: entry.deeplink) {
            XootLiquidGlassGroup(spacing: 12) {
                VStack(alignment: .leading, spacing: 12) {
                    HStack(alignment: .top, spacing: 10) {
                        XootRoboticStarMark()
                            .zootLiquidGlassCard(cornerRadius: 17, tint: .zootGold, interactive: true)
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Xoot")
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
