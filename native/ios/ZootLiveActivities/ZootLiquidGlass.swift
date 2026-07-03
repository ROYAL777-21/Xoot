import SwiftUI

extension Color {
    static let zootTerracotta = Color(red: 0.76, green: 0.40, blue: 0.29)
    static let zootCream = Color(red: 0.98, green: 0.96, blue: 0.91)
    static let zootSage = Color(red: 0.44, green: 0.56, blue: 0.38)
    static let zootNight = Color(red: 0.05, green: 0.06, blue: 0.07)
    static let zootGold = Color(red: 0.92, green: 0.72, blue: 0.39)
}

struct ZootRoboticStarMark: View {
    var body: some View {
        ZStack {
            Image(systemName: "sparkle")
                .font(.title2.weight(.black))
                .foregroundStyle(Color.zootGold)
                .shadow(color: Color.zootGold.opacity(0.35), radius: 8, x: 0, y: 2)
            RoundedRectangle(cornerRadius: 5, style: .continuous)
                .fill(Color.zootNight.opacity(0.72))
                .frame(width: 18, height: 13)
                .offset(y: 2)
            HStack(spacing: 4) {
                Circle().fill(Color.zootGold).frame(width: 2.6, height: 2.6)
                Circle().fill(Color.zootGold).frame(width: 2.6, height: 2.6)
            }
            .offset(y: 1.4)
        }
        .frame(width: 34, height: 34)
    }
}

struct ZootLiquidGlassGroup<Content: View>: View {
    let spacing: CGFloat
    let content: Content

    init(spacing: CGFloat = 16, @ViewBuilder content: () -> Content) {
        self.spacing = spacing
        self.content = content()
    }

    var body: some View {
#if compiler(>=6.2)
        if #available(iOSApplicationExtension 26.0, *) {
            GlassEffectContainer(spacing: spacing) {
                content
            }
        } else {
            content
        }
#else
        content
#endif
    }
}

extension View {
    @ViewBuilder
    func zootLiquidGlassCard(
        cornerRadius: CGFloat = 24,
        tint: Color = .zootCream,
        interactive: Bool = false
    ) -> some View {
#if compiler(>=6.2)
        if #available(iOSApplicationExtension 26.0, *) {
            if interactive {
                self.glassEffect(
                    .regular.tint(tint.opacity(0.10)).interactive(),
                    in: .rect(cornerRadius: cornerRadius)
                )
            } else {
                self.glassEffect(
                    .regular.tint(tint.opacity(0.08)),
                    in: .rect(cornerRadius: cornerRadius)
                )
            }
        } else {
            self.zootGlassFallback(cornerRadius: cornerRadius, tint: tint)
        }
#else
        self.zootGlassFallback(cornerRadius: cornerRadius, tint: tint)
#endif
    }

    @ViewBuilder
    private func zootGlassFallback(cornerRadius: CGFloat, tint: Color) -> some View {
        self
            .background(
                LinearGradient(
                    colors: [
                        Color.white.opacity(0.18),
                        tint.opacity(0.12),
                        Color.zootNight.opacity(0.88),
                    ],
                    startPoint: .topTrailing,
                    endPoint: .bottomLeading
                ),
                in: RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
            )
            .overlay(
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .fill(
                        LinearGradient(
                    colors: [
                                Color.white.opacity(0.38),
                                Color.zootGold.opacity(0.10),
                                Color.clear,
                            ],
                            startPoint: .topTrailing,
                            endPoint: .bottomLeading
                        )
                    )
            )
            .overlay(
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .strokeBorder(Color.white.opacity(0.42), lineWidth: 0.85)
            )
            .overlay(
                Circle()
                    .fill(Color.white.opacity(0.24))
                    .blur(radius: 9)
                    .frame(width: 42, height: 42)
                    .offset(x: 18, y: -18),
                alignment: .topTrailing
            )
    }
}
