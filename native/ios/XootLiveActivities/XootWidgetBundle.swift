import SwiftUI
import WidgetKit

@main
struct XootWidgetBundle: WidgetBundle {
    var body: some Widget {
        if #available(iOSApplicationExtension 16.1, *) {
            XootBookingLiveActivityWidget()
        }
        if #available(iOSApplicationExtension 17.0, *) {
            XootBookingSummaryWidget()
        }
    }
}
