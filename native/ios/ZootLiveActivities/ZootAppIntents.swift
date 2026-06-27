import AppIntents
import Foundation

@available(iOS 16.0, *)
enum ZootAssistantDestination: String, AppEnum {
  case bookClean
  case carePlus
  case concierge
  case bookings
  case zooterJobs

  static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Zoot destination")

  static var caseDisplayRepresentations: [ZootAssistantDestination: DisplayRepresentation] = [
    .bookClean: "Book a clean",
    .carePlus: "Care+ membership",
    .concierge: "Zoot Concierge",
    .bookings: "My bookings",
    .zooterJobs: "Zooter jobs",
  ]

  var dialogName: String {
    switch self {
    case .bookClean:
      return "booking"
    case .carePlus:
      return "Care+ membership"
    case .concierge:
      return "Zoot Concierge"
    case .bookings:
      return "your bookings"
    case .zooterJobs:
      return "your Zooter jobs"
    }
  }

  var safeDeepLinkPath: String {
    switch self {
    case .bookClean:
      return "zoot://book?intent=book_clean"
    case .carePlus:
      return "zoot://care-plus?intent=care_plus"
    case .concierge:
      return "zoot://concierge?zootBot=open&intent=concierge"
    case .bookings:
      return "zoot://bookings?intent=bookings"
    case .zooterJobs:
      return "zoot://zooter/jobs?intent=zooter_jobs"
    }
  }

  var safeDeepLinkURL: URL {
    URL(string: safeDeepLinkPath)!
  }
}

@available(iOS 16.0, *)
enum ZootSafeBookingStatus: String, AppEnum {
  case upcoming
  case assigned
  case enRoute
  case inProgress
  case completed

  static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Zoot booking status")

  static var caseDisplayRepresentations: [ZootSafeBookingStatus: DisplayRepresentation] = [
    .upcoming: "Upcoming",
    .assigned: "Zooter assigned",
    .enRoute: "Zooter on the way",
    .inProgress: "Clean in progress",
    .completed: "Completed",
  ]
}

@available(iOS 16.0, *)
enum ZootCleaningServiceKind: String, AppEnum {
  case homeClean
  case houseClean
  case placeClean
  case expressClean
  case officeClean
  case commercialClean
  case airbnbTurnover
  case movingClean

  static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Zoot cleaning service")

  static var caseDisplayRepresentations: [ZootCleaningServiceKind: DisplayRepresentation] = [
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
struct OpenZootIntent: AppIntent {
  static let title: LocalizedStringResource = "Open Zoot"
  static let description = IntentDescription("Opens a safe Zoot destination for booking, Care+, Concierge, or bookings.")
  static let openAppWhenRun = true

  @Parameter(title: "Destination")
  var destination: ZootAssistantDestination

  init() {
    self.destination = .bookClean
  }

  init(destination: ZootAssistantDestination) {
    self.destination = destination
  }

  @MainActor
  func perform() async throws -> some IntentResult & ProvidesDialog & OpensIntent {
    .result(dialog: "Opening \(destination.dialogName) in Zoot.", opensIntent: OpenURLIntent(destination.safeDeepLinkURL))
  }
}

@available(iOS 16.0, *)
struct BookZootCleanerIntent: AppIntent {
  static let title: LocalizedStringResource = "Book a Zoot Cleaner"
  static let description = IntentDescription("Opens Zoot to start a safe cleaner booking flow. Address, access, payment and profile details stay inside the signed-in app.")
  static let openAppWhenRun = true

  @Parameter(title: "Service")
  var service: ZootCleaningServiceKind?

  @Parameter(title: "Area or suburb")
  var area: String?

  @Parameter(title: "Date")
  var requestedDate: Date?

  init() {
    self.service = nil
    self.area = nil
    self.requestedDate = nil
  }

  init(service: ZootCleaningServiceKind? = nil, area: String? = nil, requestedDate: Date? = nil) {
    self.service = service
    self.area = area
    self.requestedDate = requestedDate
  }

  private var bookingDeepLinkURL: URL {
    var components = URLComponents(string: "zoot://book")!
    var queryItems = [
      URLQueryItem(name: "intent", value: "book_clean"),
    ]

    if let service {
      queryItems.append(URLQueryItem(name: "service", value: service.deepLinkValue))
    }

    if let area, !area.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
      queryItems.append(URLQueryItem(name: "area", value: area.trimmingCharacters(in: .whitespacesAndNewlines)))
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
  func perform() async throws -> some IntentResult & ProvidesDialog & OpensIntent {
    let dateText: String
    if let requestedDate {
      dateText = DateFormatter.localizedString(from: requestedDate, dateStyle: .medium, timeStyle: .none)
    } else {
      dateText = "your chosen date"
    }

    if let area, !area.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
      return .result(
        dialog: "Opening Zoot to start your cleaner booking in \(area) for \(dateText). Confirm your address, time and payment inside the app.",
        opensIntent: OpenURLIntent(bookingDeepLinkURL)
      )
    }

    return .result(
      dialog: "Opening Zoot to start your cleaner booking for \(dateText). Confirm your address, time and payment inside the app.",
      opensIntent: OpenURLIntent(bookingDeepLinkURL)
    )
  }
}

@available(iOS 16.0, *)
struct AskZootConciergeIntent: AppIntent {
  static let title: LocalizedStringResource = "Ask Zoot Concierge"
  static let description = IntentDescription("Opens Zoot Concierge for general Zoot, Care+, cleaning, and support questions.")
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
  func perform() async throws -> some IntentResult & ProvidesDialog & OpensIntent {
    let conciergeURL = URL(string: "zoot://concierge?zootBot=open&intent=concierge")!
    if let question, !question.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
      return .result(
        dialog: "Opening Zoot Concierge. Keep private booking, payment, address and access details inside the signed-in app.",
        opensIntent: OpenURLIntent(conciergeURL)
      )
    }

    return .result(dialog: "Opening Zoot Concierge.", opensIntent: OpenURLIntent(conciergeURL))
  }
}

@available(iOS 16.0, *)
struct CheckZootBookingStatusIntent: AppIntent {
  static let title: LocalizedStringResource = "Check Zoot Booking Status"
  static let description = IntentDescription("Opens Zoot bookings for a safe, authenticated booking status check.")
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
  func perform() async throws -> some IntentResult & ProvidesDialog & OpensIntent {
    .result(
      dialog: "Opening your Zoot booking status. Private address, access, payment, and support details stay inside the signed-in app.",
      opensIntent: OpenURLIntent(URL(string: "zoot://bookings?intent=booking_status")!)
    )
  }
}

@available(iOS 16.0, *)
struct OpenZootJobsIntent: AppIntent {
  static let title: LocalizedStringResource = "Open Zoot Jobs"
  static let description = IntentDescription("Opens the safe Zooter jobs surface for authenticated contractors.")
  static let openAppWhenRun = true

  @MainActor
  func perform() async throws -> some IntentResult & ProvidesDialog & OpensIntent {
    .result(
      dialog: "Opening Zooter jobs in Zoot. Sensitive client access details stay protected inside the app.",
      opensIntent: OpenURLIntent(URL(string: "zoot://zooter/jobs?intent=zooter_jobs")!)
    )
  }
}

@available(iOS 16.0, *)
struct ZootAppShortcuts: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
    AppShortcut(
      intent: BookZootCleanerIntent(),
      phrases: [
        "Book a cleaner with \(.applicationName)",
        "Book a Zoot cleaner with \(.applicationName)",
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
      intent: OpenZootIntent(destination: .bookClean),
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
      intent: AskZootConciergeIntent(),
      phrases: [
        "Ask \(.applicationName) Concierge",
        "Open \(.applicationName) Concierge",
      ],
      shortTitle: "Concierge",
      systemImageName: "bell.badge"
    )

    AppShortcut(
      intent: OpenZootIntent(destination: .carePlus),
      phrases: [
        "Open Care Plus in \(.applicationName)",
        "Show my \(.applicationName) membership",
      ],
      shortTitle: "Care+",
      systemImageName: "heart.text.square"
    )

    AppShortcut(
      intent: OpenZootIntent(destination: .bookings),
      phrases: [
        "Show my \(.applicationName) bookings",
        "Open bookings in \(.applicationName)",
      ],
      shortTitle: "Bookings",
      systemImageName: "calendar.badge.clock"
    )

    AppShortcut(
      intent: CheckZootBookingStatusIntent(),
      phrases: [
        "Check my \(.applicationName) booking status",
        "Where is my \(.applicationName) cleaner",
        "Track my \(.applicationName) cleaner",
      ],
      shortTitle: "Booking Status",
      systemImageName: "checklist"
    )

    AppShortcut(
      intent: OpenZootJobsIntent(),
      phrases: [
        "Open my \(.applicationName) jobs",
        "Show Zooter jobs in \(.applicationName)",
      ],
      shortTitle: "Zooter Jobs",
      systemImageName: "briefcase"
    )
  }

  static var shortcutTileColor: ShortcutTileColor = .orange
}
