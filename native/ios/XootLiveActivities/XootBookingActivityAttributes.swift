import ActivityKit
import Foundation

public struct XootBookingActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        public var status: BookingStatus
        public var statusLabel: String
        public var zooterName: String
        public var serviceName: String
        public var etaMinutes: Int?
        public var nextStep: String
        public var supportState: SupportState
        public var updatedAt: Date

        public init(
            status: BookingStatus,
            statusLabel: String,
            zooterName: String,
            serviceName: String,
            etaMinutes: Int? = nil,
            nextStep: String,
            supportState: SupportState = .standard,
            updatedAt: Date = .now
        ) {
            self.status = status
            self.statusLabel = statusLabel
            self.zooterName = zooterName
            self.serviceName = serviceName
            self.etaMinutes = etaMinutes
            self.nextStep = nextStep
            self.supportState = supportState
            self.updatedAt = updatedAt
        }
    }

    public var bookingId: String
    public var customerDisplayName: String
    public var propertyName: String
    public var suburb: String
    public var scheduledStart: Date

    public init(
        bookingId: String,
        customerDisplayName: String,
        propertyName: String,
        suburb: String,
        scheduledStart: Date
    ) {
        self.bookingId = bookingId
        self.customerDisplayName = customerDisplayName
        self.propertyName = propertyName
        self.suburb = suburb
        self.scheduledStart = scheduledStart
    }
}

public enum BookingStatus: String, Codable, Hashable, CaseIterable {
    case pending
    case confirmed
    case enroute
    case arrived
    case inProgress = "in_progress"
    case completed
    case cancelled
    case reassigned

    public var systemImage: String {
        switch self {
        case .pending: return "clock"
        case .confirmed: return "checkmark.seal"
        case .enroute: return "car.fill"
        case .arrived: return "mappin.and.ellipse"
        case .inProgress: return "sparkles"
        case .completed: return "checkmark.circle.fill"
        case .cancelled: return "xmark.circle"
        case .reassigned: return "arrow.triangle.branch"
        }
    }
}

public enum SupportState: String, Codable, Hashable, CaseIterable {
    case standard
    case priority
    case escalated
}
