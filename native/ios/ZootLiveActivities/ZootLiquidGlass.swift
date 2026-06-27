import SwiftUI

extension Color {
    static let zootTerracotta = Color(red: 0.76, green: 0.40, blue: 0.29)
    static let zootCream = Color(red: 0.98, green: 0.96, blue: 0.91)
    static let zootSage = Color(red: 0.44, green: 0.56, blue: 0.38)
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
                    .regular.tint(tint.opacity(0.14)).interactive(),
                    in: .rect(cornerRadius: cornerRadius)
                )
            } else {
                self.glassEffect(
                    .regular.tint(tint.opacity(0.12)),
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
                        Color.black.opacity(0.82),
                        tint.opacity(0.16),
                        Color.black.opacity(0.76),
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
                                Color.white.opacity(0.18),
                                tint.opacity(0.08),
                                Color.clear,
                            ],
                            startPoint: .topTrailing,
                            endPoint: .bottomLeading
                        )
                    )
            )
            .overlay(
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .strokeBorder(Color.white.opacity(0.34), lineWidth: 0.75)
            )
    }
}
