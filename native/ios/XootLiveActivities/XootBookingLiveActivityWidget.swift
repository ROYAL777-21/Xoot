import ActivityKit
import SwiftUI
import WidgetKit

@available(iOSApplicationExtension 16.1, *)
struct XootBookingLiveActivityWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: XootBookingActivityAttributes.self) { context in
            XootLockScreenLiveActivityView(context: context)
                .activityBackgroundTint(Color(red: 0.98, green: 0.96, blue: 0.91))
                .activitySystemActionForegroundColor(Color(red: 0.76, green: 0.40, blue: 0.29))
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(context.state.xooterName)
                            .font(.headline)
                        Text(context.state.serviceName)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    .padding(.horizontal, 10)
                    .padding(.vertical, 8)
                    .xootLiquidGlassCard(cornerRadius: 16, tint: .xootCream)
                }

                DynamicIslandExpandedRegion(.trailing) {
                    VStack(alignment: .trailing, spacing: 4) {
                        Image(systemName: context.state.status.systemImage)
                        Text(context.state.etaMinutes.map { "\($0) min" } ?? context.state.statusLabel)
                            .font(.caption.bold())
                    }
                    .padding(.horizontal, 10)
                    .padding(.vertical, 8)
                    .xootLiquidGlassCard(cornerRadius: 16, tint: .xootSage)
                }

                DynamicIslandExpandedRegion(.bottom) {
                    HStack {
                        Text(context.state.nextStep)
                            .font(.caption)
                            .lineLimit(1)
                        Spacer()
                    if context.state.supportState != .standard {
                        Label("Priority", systemImage: "lifepreserver")
                            .font(.caption2.bold())
                    }
                }
                .padding(.horizontal, 10)
                .padding(.vertical, 8)
                .xootLiquidGlassCard(cornerRadius: 16, tint: .xootTerracotta)
                }
            } compactLeading: {
                Image(systemName: context.state.status.systemImage)
                    .foregroundStyle(Color(red: 0.76, green: 0.40, blue: 0.29))
            } compactTrailing: {
                Text(context.state.etaMinutes.map { "\($0)m" } ?? shortLabel(for: context.state.status))
                    .font(.caption2.bold())
                    .monospacedDigit()
            } minimal: {
                Image(systemName: context.state.status.systemImage)
                    .foregroundStyle(Color(red: 0.76, green: 0.40, blue: 0.29))
            }
            .widgetURL(URL(string: "xoot://booking/\(context.attributes.bookingId)"))
            .keylineTint(Color(red: 0.76, green: 0.40, blue: 0.29))
        }
    }

    private func shortLabel(for status: BookingStatus) -> String {
        switch status {
        case .confirmed: return "OK"
        case .enroute: return "Go"
        case .arrived: return "Here"
        case .inProgress: return "Live"
        case .completed: return "Done"
        case .cancelled: return "Off"
        case .reassigned: return "New"
        case .pending: return "Wait"
        }
    }
}

@available(iOSApplicationExtension 16.1, *)
private struct XootLockScreenLiveActivityView: View {
    let context: ActivityViewContext<XootBookingActivityAttributes>

    var body: some View {
        XootLiquidGlassGroup(spacing: 14) {
            HStack(spacing: 14) {
                ZStack {
                    Circle().fill(Color.xootTerracotta.opacity(0.14))
                    Image(systemName: context.state.status.systemImage)
                        .foregroundStyle(Color.xootTerracotta)
                        .font(.title3.bold())
                }
                .frame(width: 48, height: 48)
                .xootLiquidGlassCard(cornerRadius: 24, tint: .xootTerracotta)

                VStack(alignment: .leading, spacing: 4) {
                    Text(context.state.statusLabel)
                        .font(.headline)
                    Text("\(context.state.xooterName) - \(context.state.serviceName)")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    Text(context.state.nextStep)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }

                Spacer()

                if let eta = context.state.etaMinutes {
                    VStack(spacing: 0) {
                        Text("\(eta)")
                            .font(.title2.bold())
                            .monospacedDigit()
                        Text("min")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .xootLiquidGlassCard(cornerRadius: 18, tint: .xootSage)
                }
            }
            .padding()
            .xootLiquidGlassCard(cornerRadius: 30, tint: .xootCream)
        }
    }
}
