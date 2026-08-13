import AppIntents
import Foundation

@available(iOS 16.0, *)
enum XootAssistantDestination: String, AppEnum {
  case bookClean
  case carePlus
  case concierge
  case bookings
  case xooterJobs

  static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Xoot destination")

  static var caseDisplayRepresentations: [XootAssistantDestination: DisplayRepresentation] = [
    .bookClean: "Book a clean",
    .carePlus: "Care+ membership",
    .concierge: "Xoot Concierge",
    .bookings: "My bookings",
    .xooterJobs: "Xooter jobs",
  ]

  var dialogName: String {
    switch self {
    case .bookClean:
      return "booking"
    case .carePlus:
      return "Care+ membership"
    case .concierge:
      return "Xoot Concierge"
    case .bookings:
      return "your bookings"
    case .xooterJobs:
      return "your Xooter jobs"
    }
  }

  var safeDeepLinkPath: String {
    switch self {
    case .bookClean:
      return "xoot://book?intent=book_clean"
    case .carePlus:
      return "xoot://care-plus?intent=care_plus"
    case .concierge:
      return "xoot://concierge?xootBot=open&intent=concierge"
    case .bookings:
      return "xoot://bookings?intent=bookings"
    case .xooterJobs:
      return "xoot://xooter/jobs?intent=xooter_jobs"
    }
  }

  var safeDeepLinkURL: URL {
    URL(string: safeDeepLinkPath)!
  }
}

@available(iOS 16.0, *)
enum XootAssistantDeepLinkSafety {
  static func safeAreaValue(_ value: String?) -> String? {
    guard let value else { return nil }
    let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !trimmed.isEmpty, trimmed.count <= 80 else { return nil }
    let blockedCharacters = CharacterSet(charactersIn: "<>\"'`\\")
    guard trimmed.rangeOfCharacter(from: blockedCharacters) == nil else { return nil }
    return trimmed
  }
}

@available(iOS 16.0, *)
enum XootSafeBookingStatus: String, AppEnum {
  case upcoming
  case assigned
  case enRoute
  case inProgress
  case completed

  static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Xoot booking status")

  static var caseDisplayRepresentations: [XootSafeBookingStatus: DisplayRepresentation] = [
    .upcoming: "Upcoming",
    .assigned: "Xooter assigned",
    .enRoute: "Xooter on the way",
    .inProgress: "Clean in progress",
    .completed: "Completed",
  ]
}

@available(iOS 16.0, *)
enum XootCleaningServiceKind: String, AppEnum {
  case homeClean
  case houseClean
  case placeClean
  case expressClean
  case officeClean
  case commercialClean
  case airbnbTurnover
  case movingClean

  static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Xoot cleaning service")

  static var caseDisplayRepresentations: [XootCleaningServiceKind: DisplayRepresentation] = [
    .homeClean: "Home cleaning",
    .houseClean: "House cleaning",
    .placeClean: "Place cleaning",
    .expressClean: "Express cleaning",
    .officeClean: "Office cleaning",
    .commercialClean: "Commercial cleaning",
    .airbnbTurnover: "Airbnb turnover",
    .movingClean: "Move-in or move-out cleaning",
  ]

  var deepLinkValue: String {
    switch self {
    case .homeClean:
      return "residential"
    case .houseClean:
      return "residential"
    case .placeClean:
      return "residential"
    case .expressClean:
      return "express"
    case .officeClean:
      return "office"
    case .commercialClean:
      return "office"
    case .airbnbTurnover:
      return "airbnb"
    case .movingClean:
      return "moving"
    }
  }
}

@available(iOS 16.0, *)
struct OpenXootIntent: AppIntent {
  static let title: LocalizedStringResource = "Open Xoot"
  static let description = IntentDescription("Opens a safe Xoot destination for booking, Care+, Concierge, or bookings.")
  static let openAppWhenRun = true

  @Parameter(title: "Destination")
  var destination: XootAssistantDestination

  init() {
    self.destination = .bookClean
  }

  init(destination: XootAssistantDestination) {
    self.destination = destination
  }

  @MainActor
  func perform() async throws -> some IntentResult & ProvidesDialog {
    .result(dialog: "Opening \(destination.dialogName) in Xoot.")
  }
}

@available(iOS 16.0, *)
struct BookXootCleanerIntent: AppIntent {
  static let title: LocalizedStringResource = "Book a Xoot Cleaner"
  static let description = IntentDescription("Opens Xoot to start a safe cleaner booking flow. Address, access, payment and profile details stay inside the signed-in app.")
  static let openAppWhenRun = true

  @Parameter(title: "Service")
  var service: XootCleaningServiceKind?

  @Parameter(title: "Area or suburb")
  var area: String?

  @Parameter(title: "Date")
  var requestedDate: Date?

  init() {
    self.service = nil
    self.area = nil
    self.requestedDate = nil
  }

  init(service: XootCleaningServiceKind? = nil, area: String? = nil, requestedDate: Date? = nil) {
    self.service = service
    self.area = area
    self.requestedDate = requestedDate
  }

  private var bookingDeepLinkURL: URL {
    var components = URLComponents(string: "xoot://book")!
    var queryItems = [
      URLQueryItem(name: "intent", value: "book_clean"),
    ]

    if let service {
      queryItems.append(URLQueryItem(name: "service", value: service.deepLinkValue))
    }

    if let safeArea = XootAssistantDeepLinkSafety.safeAreaValue(area) {
      queryItems.append(URLQueryItem(name: "area", value: safeArea))
    }

    if let requestedDate {
      let formatter = ISO8601DateFormatter()
      formatter.formatOptions = [.withFullDate]
      queryItems.append(URLQueryItem(name: "date", value: formatter.string(from: requestedDate)))
    }

    components.queryItems = queryItems
    return components.url!
  }

  @MainActor
  func perform() async throws -> some IntentResult & ProvidesDialog {
    let dateText: String
    if let requestedDate {
      dateText = DateFormatter.localizedString(from: requestedDate, dateStyle: .medium, timeStyle: .none)
    } else {
      dateText = "your chosen date"
    }

    if let safeArea = XootAssistantDeepLinkSafety.safeAreaValue(area) {
      return .result(
        dialog: "Opening Xoot to start your cleaner booking in \(safeArea) for \(dateText). Confirm your address, time and payment inside the app."
      )
    }

    return .result(
      dialog: "Opening Xoot to start your cleaner booking for \(dateText). Confirm your address, time and payment inside the app."
    )
  }
}

@available(iOS 16.0, *)
struct AskXootConciergeIntent: AppIntent {
  static let title: LocalizedStringResource = "Ask Xoot Concierge"
  static let description = IntentDescription("Opens Xoot Concierge for general Xoot, Care+, cleaning, and support questions.")
  static let openAppWhenRun = true

  @Parameter(title: "Question")
  var question: String?

  init() {
    self.question = nil
  }

  init(question: String? = nil) {
    self.question = question
  }

  @MainActor
  func perform() async throws -> some IntentResult & ProvidesDialog {
    if let question, !question.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
      return .result(
        dialog: "Opening Xoot Concierge. Keep private booking, payment, address and access details inside the signed-in app."
      )
    }

    return .result(dialog: "Opening Xoot Concierge.")
  }
}

@available(iOS 16.0, *)
struct CheckXootBookingStatusIntent: AppIntent {
  static let title: LocalizedStringResource = "Check Xoot Booking Status"
  static let description = IntentDescription("Opens Xoot bookings for a safe, authenticated booking status check.")
  static let openAppWhenRun = true

  @Parameter(title: "Booking reference")
  var bookingReference: String?

  init() {
    self.bookingReference = nil
  }

  init(bookingReference: String? = nil) {
    self.bookingReference = bookingReference
  }

  @MainActor
  func perform() async throws -> some IntentResult & ProvidesDialog {
    .result(
      dialog: "Opening your Xoot booking status. Private address, access, payment, and support details stay inside the signed-in app."
    )
  }
}

@available(iOS 16.0, *)
struct OpenXootJobsIntent: AppIntent {
  static let title: LocalizedStringResource = "Open Xoot Jobs"
  static let description = IntentDescription("Opens the safe Xooter jobs surface for authenticated contractors.")
  static let openAppWhenRun = true

  @MainActor
  func perform() async throws -> some IntentResult & ProvidesDialog {
    .result(
      dialog: "Opening Xooter jobs in Xoot. Sensitive client access details stay protected inside the app."
    )
  }
}

@available(iOS 16.0, *)
struct XootAppShortcuts: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
    AppShortcut(
      intent: BookXootCleanerIntent(),
      phrases: [
        "Book a cleaner with \(.applicationName)",
        "Book a Xoot cleaner with \(.applicationName)",
        "Book a cleaner for a date with \(.applicationName)",
        "Find me a cleaner in \(.applicationName)",
        "Clean my house with \(.applicationName)",
        "Clean my home with \(.applicationName)",
        "Clean my place with \(.applicationName)",
        "Clean my house on a date with \(.applicationName)",
        "I need my office cleaned with \(.applicationName)",
        "I need my place cleaned with \(.applicationName)",
        "I need a cleaner for my office with \(.applicationName)",
        "Schedule a house clean with \(.applicationName)",
      ],
      shortTitle: "Book Cleaner",
      systemImageName: "sparkles.rectangle.stack"
    )

    AppShortcut(
      intent: OpenXootIntent(destination: .bookClean),
      phrases: [
        "Book a clean in \(.applicationName)",
        "Start a \(.applicationName) booking",
        "Clean my home in \(.applicationName)",
        "Book office cleaning in \(.applicationName)",
        "Open cleaner booking in \(.applicationName)",
      ],
      shortTitle: "Book Clean",
      systemImageName: "sparkles"
    )

    AppShortcut(
      intent: AskXootConciergeIntent(),
      phrases: [
        "Ask \(.applicationName) Concierge",
        "Open \(.applicationName) Concierge",
      ],
      shortTitle: "Concierge",
      systemImageName: "bell.badge"
    )

    AppShortcut(
      intent: OpenXootIntent(destination: .carePlus),
      phrases: [
        "Open Care Plus in \(.applicationName)",
        "Show my \(.applicationName) membership",
      ],
      shortTitle: "Care+",
      systemImageName: "heart.text.square"
    )

    AppShortcut(
      intent: OpenXootIntent(destination: .bookings),
      phrases: [
        "Show my \(.applicationName) bookings",
        "Open bookings in \(.applicationName)",
      ],
      shortTitle: "Bookings",
      systemImageName: "calendar.badge.clock"
    )

    AppShortcut(
      intent: CheckXootBookingStatusIntent(),
      phrases: [
        "Check my \(.applicationName) booking status",
        "Where is my \(.applicationName) cleaner",
        "Track my \(.applicationName) cleaner",
      ],
      shortTitle: "Booking Status",
      systemImageName: "checklist"
    )

    AppShortcut(
      intent: OpenXootJobsIntent(),
      phrases: [
        "Open my \(.applicationName) jobs",
        "Show Xooter jobs in \(.applicationName)",
      ],
      shortTitle: "Xooter Jobs",
      systemImageName: "briefcase"
    )
  }

  static var shortcutTileColor: ShortcutTileColor = .orange
}
