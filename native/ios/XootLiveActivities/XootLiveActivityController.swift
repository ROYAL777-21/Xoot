import ActivityKit
import Foundation

@available(iOS 16.2, *)
@MainActor
public final class XootLiveActivityController {
    public static let shared = XootLiveActivityController()

    private init() {}

    public var currentActivities: [Activity<XootBookingActivityAttributes>] {
        Array(Activity<XootBookingActivityAttributes>.activities)
    }

    @discardableResult
    public func startBookingActivity(
        attributes: XootBookingActivityAttributes,
        state: XootBookingActivityAttributes.ContentState
    ) async throws -> Activity<XootBookingActivityAttributes>? {
        guard ActivityAuthorizationInfo().areActivitiesEnabled else { return nil }

        let content = ActivityContent(state: state, staleDate: Calendar.current.date(byAdding: .hour, value: 8, to: .now))
        let activity = try Activity.request(attributes: attributes, content: content, pushType: .token)

        Task.detached {
            for await tokenData in activity.pushTokenUpdates {
                let token = tokenData.map { String(format: "%02x", $0) }.joined()
                // Send this token to Xoot's backend and associate it with attributes.bookingId.
                // Never log production push tokens in release builds.
                debugPrint("Xoot Live Activity push token for booking \(attributes.bookingId): \(token)")
            }
        }

        return activity
    }

    public func updateBookingActivity(
        bookingId: String,
        state: XootBookingActivityAttributes.ContentState
    ) async {
        guard let activity = currentActivities.first(where: { $0.attributes.bookingId == bookingId }) else { return }
        let content = ActivityContent(state: state, staleDate: Calendar.current.date(byAdding: .hour, value: 8, to: .now))
        await activity.update(content)
    }

    public func endBookingActivity(
        bookingId: String,
        finalState: XootBookingActivityAttributes.ContentState
    ) async {
        guard let activity = currentActivities.first(where: { $0.attributes.bookingId == bookingId }) else { return }
        let content = ActivityContent(state: finalState, staleDate: nil)
        await activity.end(content, dismissalPolicy: .after(Date.now.addingTimeInterval(60 * 20)))
    }

    public func endAllBookingActivities() async {
        for activity in currentActivities {
            await activity.end(nil, dismissalPolicy: .immediate)
        }
    }
}
