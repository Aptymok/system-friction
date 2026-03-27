// swift-tools-version:5.9
// Swift Package para SystemFriction iOS
// Nota: La app iOS completa usa Xcode (SystemFriction.xcodeproj).
// Este Package.swift permite tests de los módulos Core y Capture
// sin necesidad del target de app completo.

import PackageDescription

let package = Package(
    name: "SystemFrictionModules",
    platforms: [.iOS(.v17), .macOS(.v14)],
    products: [
        .library(name: "SystemFrictionCore", targets: ["SystemFrictionCore"]),
        .library(name: "SystemFrictionCapture", targets: ["SystemFrictionCapture"]),
    ],
    targets: [
        .target(
            name: "SystemFrictionCore",
            path: "SystemFriction/Core"
        ),
        .target(
            name: "SystemFrictionCapture",
            path: "SystemFriction/Capture",
            dependencies: ["SystemFrictionCore"]
        ),
        .testTarget(
            name: "SystemFrictionTests",
            dependencies: ["SystemFrictionCapture", "SystemFrictionCore"],
            path: "SystemFrictionTests"
        ),
    ]
)
