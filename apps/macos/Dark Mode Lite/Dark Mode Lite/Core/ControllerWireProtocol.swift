import Foundation

public let controllerProtocolVersion = 1
public let controllerEndpoint = "ws://127.0.0.1:59387/v1"
public let controllerPort: UInt16 = 59_387

/// Typed events accepted from companion extensions.
public enum ExtensionEvent: Equatable, Sendable {
  case hello(Hello)
  case tabsSnapshot(TabsSnapshot)
  case stateSnapshot(StateSnapshot)
  case settingsProposal(SettingsProposal)
  case heartbeat(TimestampEvent)
  case pong(TimestampEvent)
  case error(ErrorEvent)
}

public struct Hello: Codable, Equatable, Sendable {
  public var version: Int
  public var type: String
  public var clientId: String
  public var browserFamily: BrowserFamily
  public var browserVersion: String
  public var extensionVersion: String
  public var token: String?
}

public struct TabsSnapshot: Codable, Equatable, Sendable {
  public var version: Int
  public var type: String
  public var clientId: String
  public var tabs: [BrowserTab]
}

public struct StateSnapshot: Codable, Equatable, Sendable {
  public var version: Int
  public var type: String
  public var requestId: String?
  public var clientId: String
  public var state: ControllerSnapshot
}

public struct SettingsProposal: Codable, Equatable, Sendable {
  public var version: Int
  public var type: String
  public var clientId: String
  public var baseRevision: Int
  public var settings: ControllerSettings
}

public struct TimestampEvent: Codable, Equatable, Sendable {
  public var version: Int
  public var type: String
  public var sentAt: Int64
}

public struct ErrorEvent: Codable, Equatable, Sendable {
  public var version: Int
  public var type: String
  public var requestId: String?
  public var code: String
  public var message: String
}

/// Commands sent by the native app to companion extensions.
public struct NativeCommand: Codable, Equatable, Sendable {
  public var version = controllerProtocolVersion
  public var type: String
  public var token: String?
  public var revision: Int?
  public var settings: ControllerSettings?
  public var requestId: String?
  public var tabId: Int?
  public var sentAt: Int64?
  public var code: String?
  public var message: String?

  public static func helloAccepted() -> NativeCommand {
    NativeCommand(type: "hello.accepted")
  }

  public static func pairingAccepted(token: String) -> NativeCommand {
    NativeCommand(type: "pairing.accepted", token: token)
  }

  public static func replaceSettings(revision: Int, settings: ControllerSettings) -> NativeCommand {
    NativeCommand(type: "settings.replace", revision: revision, settings: settings)
  }

  public static func manage(tabId: Int) -> NativeCommand {
    NativeCommand(type: "tab.manage", requestId: UUID().uuidString, tabId: tabId)
  }

  public static func unmanage(tabId: Int) -> NativeCommand {
    NativeCommand(type: "tab.unmanage", requestId: UUID().uuidString, tabId: tabId)
  }

  public static func requestState() -> NativeCommand {
    NativeCommand(type: "state.request", requestId: UUID().uuidString)
  }

  public static func ping(at timestamp: Int64) -> NativeCommand {
    NativeCommand(type: "ping", sentAt: timestamp)
  }

  public static func error(
    requestId: String? = nil,
    code: String,
    message: String
  ) -> NativeCommand {
    NativeCommand(type: "error", requestId: requestId, code: code, message: message)
  }
}

/// Errors reported for malformed or incompatible wire payloads.
public enum WireProtocolError: Error, Equatable, LocalizedError {
  case malformedJSON
  case unsupportedVersion(Int?)
  case unsupportedType(String?)
  case invalidPayload

  public var errorDescription: String? {
    switch self {
    case .malformedJSON: "The extension sent malformed JSON."
    case .unsupportedVersion(let version):
      "Unsupported controller protocol version \(version.map(String.init) ?? "unknown")."
    case .unsupportedType(let type): "Unsupported controller event \(type ?? "unknown")."
    case .invalidPayload: "The extension sent an invalid controller payload."
    }
  }
}

/// Strict decoder for the versioned WebSocket boundary.
public enum ControllerWireCodec {
  private struct Envelope: Decodable {
    let version: Int?
    let type: String?
  }

  public static func decode(_ data: Data) throws -> ExtensionEvent {
    let decoder = JSONDecoder()
    let envelope: Envelope

    do {
      envelope = try decoder.decode(Envelope.self, from: data)
    } catch {
      throw WireProtocolError.malformedJSON
    }

    guard envelope.version == controllerProtocolVersion else {
      throw WireProtocolError.unsupportedVersion(envelope.version)
    }

    do {
      switch envelope.type {
      case "hello":
        return .hello(try decoder.decode(Hello.self, from: data))
      case "tabs.snapshot":
        return .tabsSnapshot(try decoder.decode(TabsSnapshot.self, from: data))
      case "state.snapshot":
        return .stateSnapshot(try decoder.decode(StateSnapshot.self, from: data))
      case "settings.proposal":
        return .settingsProposal(try decoder.decode(SettingsProposal.self, from: data))
      case "heartbeat":
        return .heartbeat(try decoder.decode(TimestampEvent.self, from: data))
      case "pong":
        return .pong(try decoder.decode(TimestampEvent.self, from: data))
      case "error":
        return .error(try decoder.decode(ErrorEvent.self, from: data))
      default:
        throw WireProtocolError.unsupportedType(envelope.type)
      }
    } catch let error as WireProtocolError {
      throw error
    } catch {
      throw WireProtocolError.invalidPayload
    }
  }

  public static func encode(_ command: NativeCommand) throws -> Data {
    let encoder = JSONEncoder()
    encoder.outputFormatting = [.sortedKeys]
    return try encoder.encode(command)
  }
}
