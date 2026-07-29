import SwiftUI

/// Compact 360-point controller that mirrors the browser extension's controls.
struct ControllerView: View {
  @ObservedObject var model: AppModel

  private let panel = Color(red: 0.10, green: 0.11, blue: 0.14)
  private let card = Color(red: 0.14, green: 0.15, blue: 0.19)
  private let accent = Color(red: 0.18, green: 0.88, blue: 0.81)

  var body: some View {
    ScrollView {
      VStack(spacing: 12) {
        header

        if !model.pairingRequests.isEmpty {
          pairing
        }

        browserSelection
        globalControl
        siteControl
        modeControl
        adjustments
        presets
        blocklist
        preferences
        status
      }
      .padding(14)
    }
    .scrollIndicators(.hidden)
    .frame(width: 360, height: 660)
    .background(panel)
    .preferredColorScheme(.dark)
    .tint(accent)
    .accessibilityIdentifier("controller-popover")
  }

  private var header: some View {
    HStack(spacing: 10) {
      Image(systemName: "moon.stars.fill")
        .font(.system(size: 22))
        .foregroundStyle(accent)

      VStack(alignment: .leading, spacing: 1) {
        Text("Dark Mode Lite")
          .font(.headline)
        Text("Native browser controller")
          .font(.caption)
          .foregroundStyle(.secondary)
      }

      Spacer()

      Circle()
        .fill(connectionColor)
        .frame(width: 8, height: 8)
      Text(connectionLabel)
        .font(.caption2)
        .foregroundStyle(.secondary)
    }
  }

  private var pairing: some View {
    VStack(alignment: .leading, spacing: 10) {
      Label("Pair browser", systemImage: "link.badge.plus")
        .font(.subheadline.weight(.semibold))

      ForEach(model.pairingRequests) { request in
        VStack(alignment: .leading, spacing: 8) {
          Text("\(request.family.title) \(request.browserVersion)")
            .font(.caption)
          Text("Only accept a browser you just installed.")
            .font(.caption2)
            .foregroundStyle(.secondary)

          HStack {
            Button("Dismiss") {
              model.reject(request)
            }
            .buttonStyle(.borderless)

            Spacer()

            Button("Pair") {
              model.pair(request)
            }
            .buttonStyle(.borderedProminent)
            .accessibilityIdentifier("pair-browser")
          }
        }
      }
    }
    .cardStyle(background: card)
  }

  private var browserSelection: some View {
    VStack(alignment: .leading, spacing: 10) {
      sectionTitle("Browser & tab", icon: "macwindow.on.rectangle")

      if model.clients.isEmpty {
        VStack(alignment: .leading, spacing: 7) {
          Text("No browser connected")
            .font(.subheadline.weight(.medium))

          safariPermission

          HStack {
            Button("Safari Settings") {
              model.openSafariPreferences()
            }
            .buttonStyle(.bordered)

            Button {
              model.refreshSafariExtensionPermission()
            } label: {
              Image(systemName: "arrow.clockwise")
            }
            .buttonStyle(.bordered)
            .accessibilityLabel("Refresh Safari permission")
          }

          DisclosureGroup("Chrome & Firefox setup") {
            Text(
              "Build the companion packages, install the matching development extension, then accept its one-time pairing request here."
            )
            .font(.caption)
            .foregroundStyle(.secondary)
            .padding(.top, 4)
          }
          .font(.caption)
        }
      } else {
        Picker("Browser", selection: clientSelection) {
          ForEach(model.clients) { client in
            Text("\(client.family.title)\(client.connected ? "" : " — Disconnected")")
              .tag(Optional(client.id))
          }
        }
        .pickerStyle(.menu)
        .accessibilityIdentifier("browser-selector")

        Picker("Tab", selection: tabSelection) {
          Text("Choose a tab").tag(Int?.none)
          ForEach(model.selectedClient?.tabs ?? []) { tab in
            Text(tab.title.isEmpty ? tab.url : tab.title)
              .tag(Optional(tab.tabId))
          }
        }
        .pickerStyle(.menu)
        .accessibilityIdentifier("tab-selector")

        Button {
          model.toggleSelectedTab()
        } label: {
          Label(
            model.selectedTabIsManaged ? "Disable Selected Tab" : "Apply to Selected Tab",
            systemImage: model.selectedTabIsManaged ? "moon.slash" : "moon.fill"
          )
          .frame(maxWidth: .infinity)
        }
        .buttonStyle(.borderedProminent)
        .disabled(model.selectedTab == nil || model.selectedClient?.connected != true)
        .accessibilityIdentifier("toggle-selected-tab")

        if let tab = model.selectedTab, !tab.injectable {
          Label(
            "This internal or protected page is unsupported.",
            systemImage: "exclamationmark.triangle.fill"
          )
          .font(.caption)
          .foregroundStyle(.orange)
          .accessibilityIdentifier("unsupported-page")
        }
      }
    }
    .cardStyle(background: card)
  }

  @ViewBuilder
  private var safariPermission: some View {
    switch model.safariExtensionPermission {
    case .checking:
      Label("Checking Safari extension permission…", systemImage: "hourglass")
        .foregroundStyle(.secondary)
    case .enabled:
      Label(
        "Safari extension enabled. Open a supported Safari tab to connect.",
        systemImage: "checkmark.circle.fill"
      )
      .foregroundStyle(accent)
    case .disabled:
      Label(
        "Safari extension permission is disabled.",
        systemImage: "exclamationmark.shield.fill"
      )
      .foregroundStyle(.orange)
    case .unavailable:
      Label(
        "Safari extension state is unavailable.",
        systemImage: "exclamationmark.triangle.fill"
      )
      .foregroundStyle(.orange)
    }
  }

  private var globalControl: some View {
    Toggle(isOn: Binding(get: { model.settings.enabled }, set: { model.setEnabled($0) })) {
      VStack(alignment: .leading, spacing: 2) {
        Text("Global dark mode")
          .font(.subheadline.weight(.semibold))
        Text("Shared by every managed tab")
          .font(.caption2)
          .foregroundStyle(.secondary)
      }
    }
    .toggleStyle(.switch)
    .cardStyle(background: card)
    .accessibilityIdentifier("global-toggle")
  }

  private var siteControl: some View {
    VStack(alignment: .leading, spacing: 8) {
      sectionTitle("Current site", icon: "globe")
      if let host = model.selectedTab?.normalizedHost, !host.isEmpty {
        Toggle(
          host,
          isOn: Binding(
            get: { model.settings.siteOverrides[host] ?? true },
            set: { model.setSiteEnabled($0) }
          )
        )
        .toggleStyle(.switch)
        .accessibilityIdentifier("site-toggle")
      } else {
        Text("Select a supported web page.")
          .font(.caption)
          .foregroundStyle(.secondary)
      }
    }
    .cardStyle(background: card)
  }

  private var modeControl: some View {
    VStack(alignment: .leading, spacing: 9) {
      sectionTitle("Mode", icon: "circle.lefthalf.filled")
      HStack(spacing: 6) {
        ForEach(ThemeMode.allCases, id: \.self) { mode in
          Button(mode.title) {
            model.selectMode(mode)
          }
          .buttonStyle(ModeButtonStyle(selected: model.settings.mode == mode, accent: accent))
          .accessibilityIdentifier("mode-\(mode.rawValue)")
        }
      }
    }
    .cardStyle(background: card)
  }

  private var adjustments: some View {
    VStack(alignment: .leading, spacing: 11) {
      HStack {
        sectionTitle("Adjustments", icon: "slider.horizontal.3")
        Spacer()
        Button("Reset all") {
          model.resetAdjustments()
        }
        .font(.caption)
        .buttonStyle(.borderless)
        .accessibilityIdentifier("reset-adjustments")
      }

      adjustment(
        title: "Brightness",
        value: model.settings.brightness,
        range: 50...150,
        keyPath: \.brightness
      )
      adjustment(
        title: "Contrast",
        value: model.settings.contrast,
        range: 50...150,
        keyPath: \.contrast
      )
      adjustment(
        title: "Sepia",
        value: model.settings.sepia,
        range: 0...100,
        keyPath: \.sepia
      )
    }
    .cardStyle(background: card)
  }

  private var presets: some View {
    VStack(alignment: .leading, spacing: 10) {
      HStack {
        sectionTitle("Presets", icon: "square.grid.2x2")
        Spacer()
        Button {
          model.saveCustomPreset()
        } label: {
          Label("Save", systemImage: "plus")
        }
        .font(.caption)
        .buttonStyle(.borderless)
        .accessibilityIdentifier("save-preset")
      }

      LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 7) {
        ForEach(model.presets) { preset in
          HStack(spacing: 3) {
            Button {
              model.applyPreset(preset)
            } label: {
              HStack(spacing: 6) {
                Circle()
                  .fill(Color(hex: preset.dot))
                  .frame(width: 7, height: 7)
                Text(preset.name)
                  .lineLimit(1)
                Spacer(minLength: 0)
              }
              .frame(maxWidth: .infinity)
            }
            .buttonStyle(PresetButtonStyle(selected: model.settings.activePresetId == preset.id))
            .accessibilityIdentifier("preset-\(preset.id)")

            if !preset.builtin {
              Button {
                model.deletePreset(preset)
              } label: {
                Image(systemName: "xmark.circle.fill")
                  .foregroundStyle(.secondary)
              }
              .buttonStyle(.plain)
              .accessibilityIdentifier("delete-\(preset.id)")
            }
          }
        }
      }
    }
    .cardStyle(background: card)
  }

  private var blocklist: some View {
    DisclosureGroup {
      if blockedHosts.isEmpty {
        Text("No blocked sites")
          .font(.caption)
          .foregroundStyle(.secondary)
          .frame(maxWidth: .infinity, alignment: .leading)
          .padding(.top, 6)
      } else {
        VStack(spacing: 4) {
          ForEach(blockedHosts, id: \.self) { host in
            HStack {
              Text(host)
                .font(.caption)
              Spacer()
              Button {
                model.removeSiteOverride(host)
              } label: {
                Image(systemName: "trash")
              }
              .buttonStyle(.plain)
              .accessibilityLabel("Remove \(host)")
            }
          }
        }
        .padding(.top, 6)
      }
    } label: {
      sectionTitle("Blocklist (\(blockedHosts.count))", icon: "nosign")
    }
    .cardStyle(background: card)
    .accessibilityIdentifier("blocklist")
  }

  private var preferences: some View {
    VStack(spacing: 9) {
      Toggle(
        "Launch at login",
        isOn: Binding(get: { model.launchAtLogin }, set: { model.setLaunchAtLogin($0) })
      )
      .toggleStyle(.switch)

      HStack {
        Button("Reset everything", role: .destructive) {
          model.resetEverything()
        }
        .buttonStyle(.borderless)
        .accessibilityIdentifier("reset-everything")

        Spacer()

        Button("Quit") {
          NSApplication.shared.terminate(nil)
        }
        .buttonStyle(.borderless)
      }
    }
    .font(.caption)
    .cardStyle(background: card)
  }

  @ViewBuilder
  private var status: some View {
    if !model.statusMessage.isEmpty {
      Text(model.statusMessage)
        .font(.caption2)
        .foregroundStyle(model.bridgeStatus == .portConflict ? .orange : .secondary)
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 3)
        .accessibilityIdentifier("status-message")
    }
  }

  private var clientSelection: Binding<String?> {
    Binding(
      get: { model.selectedClientId },
      set: { value in
        model.selectedClientId = value
        model.selectedTabId =
          model.selectedClient?.tabs.first(where: \.active)?.tabId
          ?? model.selectedClient?.tabs.first?.tabId
      }
    )
  }

  private var tabSelection: Binding<Int?> {
    Binding(get: { model.selectedTabId }, set: { model.selectedTabId = $0 })
  }

  private var blockedHosts: [String] {
    model.settings.siteOverrides
      .filter { !$0.value }
      .map(\.key)
      .sorted()
  }

  private var connectionColor: Color {
    switch model.bridgeStatus {
    case .ready: accent
    case .portConflict, .failed: .orange
    case .stopped: .secondary
    }
  }

  private var connectionLabel: String {
    switch model.bridgeStatus {
    case .ready: "Ready"
    case .portConflict: "Port conflict"
    case .failed: "Error"
    case .stopped: "Offline"
    }
  }

  private func sectionTitle(_ title: String, icon: String) -> some View {
    Label(title, systemImage: icon)
      .font(.subheadline.weight(.semibold))
  }

  private func adjustment(
    title: String,
    value: Double,
    range: ClosedRange<Double>,
    keyPath: WritableKeyPath<ControllerSettings, Double>
  ) -> some View {
    VStack(spacing: 3) {
      HStack {
        Text(title)
          .font(.caption)
        Spacer()
        Text("\(Int(value))%")
          .font(.caption.monospacedDigit())
          .foregroundStyle(.secondary)
        Button {
          model.resetAdjustment(keyPath)
        } label: {
          Image(systemName: "arrow.counterclockwise")
            .font(.caption2)
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Reset \(title)")
      }

      Slider(
        value: Binding(
          get: { model.settings[keyPath: keyPath] },
          set: { model.previewAdjustment(keyPath, value: $0) }
        ),
        in: range,
        step: 1
      ) { editing in
        if !editing {
          model.commitAdjustments()
        }
      }
      .accessibilityIdentifier("\(title.lowercased())-slider")
    }
  }
}

private struct ModeButtonStyle: ButtonStyle {
  let selected: Bool
  let accent: Color

  func makeBody(configuration: Configuration) -> some View {
    configuration.label
      .font(.caption.weight(.medium))
      .frame(maxWidth: .infinity)
      .padding(.vertical, 7)
      .background(selected ? accent.opacity(0.22) : Color.white.opacity(0.05))
      .foregroundStyle(selected ? accent : .primary)
      .clipShape(RoundedRectangle(cornerRadius: 7))
      .overlay(
        RoundedRectangle(cornerRadius: 7)
          .stroke(selected ? accent.opacity(0.65) : .clear, lineWidth: 1)
      )
      .opacity(configuration.isPressed ? 0.7 : 1)
  }
}

private struct PresetButtonStyle: ButtonStyle {
  let selected: Bool

  func makeBody(configuration: Configuration) -> some View {
    configuration.label
      .font(.caption)
      .padding(.horizontal, 8)
      .padding(.vertical, 7)
      .background(selected ? Color.white.opacity(0.13) : Color.white.opacity(0.05))
      .clipShape(RoundedRectangle(cornerRadius: 7))
      .overlay(
        RoundedRectangle(cornerRadius: 7)
          .stroke(selected ? Color.white.opacity(0.25) : .clear, lineWidth: 1)
      )
      .opacity(configuration.isPressed ? 0.7 : 1)
  }
}

extension View {
  fileprivate func cardStyle(background: Color) -> some View {
    padding(11)
      .background(background)
      .clipShape(RoundedRectangle(cornerRadius: 11))
      .overlay(
        RoundedRectangle(cornerRadius: 11)
          .stroke(Color.white.opacity(0.055), lineWidth: 1)
      )
  }
}

extension Color {
  fileprivate init(hex: String) {
    let value = hex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
    let integer = UInt64(value, radix: 16) ?? 0x2FE0CE
    let red = Double((integer >> 16) & 0xFF) / 255
    let green = Double((integer >> 8) & 0xFF) / 255
    let blue = Double(integer & 0xFF) / 255
    self.init(red: red, green: green, blue: blue)
  }
}
