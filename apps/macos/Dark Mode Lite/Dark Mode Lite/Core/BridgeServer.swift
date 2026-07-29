import Foundation
import Network
import os

/// The listener is part of the independently testable native core.
/// Loopback-only WebSocket server used by companion WebExtensions.
final class BridgeServer: @unchecked Sendable {
  enum Status: Equatable, Sendable {
    case stopped
    case ready
    case portConflict
    case failed(String)
  }

  var onEvent: (@Sendable (UUID, ExtensionEvent) -> Void)?
  var onDisconnect: (@Sendable (UUID) -> Void)?
  var onStatus: (@Sendable (Status) -> Void)?

  private let queue = DispatchQueue(label: "sh.gocanto.darkmodelite.bridge")
  private let logger = Logger(subsystem: "sh.gocanto.darkmodelite", category: "bridge")
  private var listener: NWListener?
  private var peers: [UUID: NWConnection] = [:]

  func start() {
    queue.async { [weak self] in
      self?.startOnQueue()
    }
  }

  func stop() {
    queue.async { [weak self] in
      guard let self else {
        return
      }

      listener?.stateUpdateHandler = nil
      listener?.cancel()
      listener = nil
      peers.values.forEach { $0.cancel() }
      peers.removeAll()
      onStatus?(.stopped)
    }
  }

  func send(_ command: NativeCommand, to peerId: UUID) {
    queue.async { [weak self] in
      guard let self, let connection = peers[peerId],
        let data = try? ControllerWireCodec.encode(command)
      else {
        return
      }

      let metadata = NWProtocolWebSocket.Metadata(opcode: .text)
      let context = NWConnection.ContentContext(
        identifier: "dark-mode-lite-text",
        metadata: [metadata]
      )

      connection.send(
        content: data,
        contentContext: context,
        isComplete: true,
        completion: .contentProcessed { _ in }
      )
    }
  }

  private func startOnQueue() {
    guard listener == nil else {
      return
    }

    logger.info("Starting loopback controller on port \(controllerPort)")
    do {
      let websocket = NWProtocolWebSocket.Options()
      websocket.autoReplyPing = true
      websocket.maximumMessageSize = 1_048_576
      websocket.setClientRequestHandler(queue) { _, headers in
        let origin = headers.first { $0.name.caseInsensitiveCompare("Origin") == .orderedSame }?
          .value
        let host = headers.first { $0.name.caseInsensitiveCompare("Host") == .orderedSame }?.value
        let allowedOrigin = origin.map(Self.isAllowedExtensionOrigin) ?? false
        let normalizedHost = host?.lowercased()
        let allowedHost =
          normalizedHost == "127.0.0.1:\(controllerPort)"
          || normalizedHost == "localhost:\(controllerPort)"

        return NWProtocolWebSocket.Response(
          status: allowedOrigin && allowedHost ? .accept : .reject,
          subprotocol: nil
        )
      }

      let parameters = NWParameters(tls: nil, tcp: NWProtocolTCP.Options())
      parameters.defaultProtocolStack.applicationProtocols.insert(websocket, at: 0)
      parameters.requiredLocalEndpoint = .hostPort(
        host: NWEndpoint.Host("127.0.0.1"),
        port: NWEndpoint.Port(rawValue: controllerPort)!
      )

      let listener = try NWListener(using: parameters)
      self.listener = listener

      listener.stateUpdateHandler = { [weak self] state in
        self?.handleListenerState(state)
      }
      listener.newConnectionHandler = { [weak self] connection in
        self?.accept(connection)
      }
      listener.start(queue: queue)
    } catch {
      logger.error("Unable to create listener: \(error.localizedDescription, privacy: .public)")
      onStatus?(.failed(error.localizedDescription))
    }
  }

  private func handleListenerState(_ state: NWListener.State) {
    switch state {
    case .ready:
      logger.info("Loopback controller is ready")
      onStatus?(.ready)
    case .failed(let error):
      logger.error("Loopback controller failed: \(error.debugDescription, privacy: .public)")
      if case .posix(let code) = error, code == .EADDRINUSE {
        onStatus?(.portConflict)
      } else {
        onStatus?(.failed(error.localizedDescription))
      }
    case .cancelled:
      logger.info("Loopback controller stopped")
      onStatus?(.stopped)
    default:
      break
    }
  }

  private func accept(_ connection: NWConnection) {
    let peerId = UUID()
    peers[peerId] = connection

    connection.stateUpdateHandler = { [weak self] state in
      guard let self else {
        return
      }

      switch state {
      case .ready:
        receiveNext(from: connection, peerId: peerId)
      case .failed, .cancelled:
        disconnect(peerId)
      default:
        break
      }
    }
    connection.start(queue: queue)
  }

  private func receiveNext(from connection: NWConnection, peerId: UUID) {
    connection.receiveMessage { [weak self] data, context, isComplete, error in
      guard let self else {
        return
      }

      if let error {
        _ = error
        disconnect(peerId)
        return
      }

      let metadata =
        context?.protocolMetadata(definition: NWProtocolWebSocket.definition)
        as? NWProtocolWebSocket.Metadata

      if metadata?.opcode == .close {
        disconnect(peerId)
        return
      }

      guard isComplete, metadata?.opcode == .text, let data else {
        send(
          .error(code: "invalid-payload", message: "Controller events must be text messages."),
          to: peerId
        )
        receiveNext(from: connection, peerId: peerId)
        return
      }

      do {
        onEvent?(peerId, try ControllerWireCodec.decode(data))
      } catch {
        send(
          .error(code: Self.wireErrorCode(error), message: error.localizedDescription),
          to: peerId
        )
      }

      receiveNext(from: connection, peerId: peerId)
    }
  }

  private func disconnect(_ peerId: UUID) {
    guard let connection = peers.removeValue(forKey: peerId) else {
      return
    }

    connection.cancel()
    onDisconnect?(peerId)
  }

  private static func isAllowedExtensionOrigin(_ origin: String) -> Bool {
    guard let components = URLComponents(string: origin.lowercased()),
      let scheme = components.scheme,
      let host = components.host,
      !host.isEmpty,
      components.user == nil,
      components.password == nil,
      components.port == nil,
      components.path.isEmpty || components.path == "/"
    else {
      return false
    }

    return scheme == "chrome-extension"
      || scheme == "moz-extension"
      || scheme == "safari-web-extension"
  }

  private static func wireErrorCode(_ error: Error) -> String {
    switch error as? WireProtocolError {
    case .malformedJSON:
      "malformed-json"
    case .unsupportedVersion:
      "unsupported-version"
    case .unsupportedType:
      "unsupported-event"
    case .invalidPayload:
      "invalid-payload"
    case nil:
      "invalid-event"
    }
  }
}
