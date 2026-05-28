import SwiftUI
import WidgetKit

@main
struct ZootWidgetBundle: WidgetBundle {
    var body: some Widget {
        if #available(iOSApplicationExtension 16.1, *) {
            ZootBookingLiveActivityWidget()
        }
        if #available(iOSApplicationExtension 17.0, *) {
            ZootBookingSummaryWidget()
        }
    }
}
