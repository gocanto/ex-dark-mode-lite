// swift-tools-version: 6.0

import PackageDescription

let package = Package(
  name: "DarkModeLiteCore",
  platforms: [.macOS(.v14)],
  products: [
    .library(name: "DarkModeLiteCore", targets: ["DarkModeLiteCore"])
  ],
  targets: [
    .target(
      name: "DarkModeLiteCore",
      path: "Dark Mode Lite/Dark Mode Lite/Core"
    ),
    .testTarget(
      name: "DarkModeLiteCoreTests",
      dependencies: ["DarkModeLiteCore"],
      path: "Tests/DarkModeLiteCoreTests"
    ),
  ]
)
