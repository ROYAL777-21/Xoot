import { Stack, router, usePathname } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  CoreIcon,
  nativeFonts,
  nativePalette,
  type CoreIconName,
} from "@/components/native-core";
const items: {
  href: "/" | "/bookings" | "/rewards" | "/account";
  label: string;
  icon: CoreIconName;
}[] = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/bookings", label: "Visits", icon: "list" },
  { href: "/rewards", label: "Rewards", icon: "trophy" },
  { href: "/account", label: "You", icon: "circle-user" },
];
const roots = new Set(items.map((i) => i.href));
export default function AppNavigation() {
  const path = usePathname();
  const insets = useSafeAreaInsets();
  const show = roots.has(path as never);

  return (
    <View style={s.root}>
      <Stack screenOptions={{ headerShown: false }} />
      {show ? (
        <View
          pointerEvents="box-none"
          style={[s.wrap, { bottom: Math.max(14, insets.bottom) }]}
        >
          <View style={s.capsule}>
            {items.map((item) => {
              const active = path === item.href;
              return (
                <Pressable
                  key={item.href}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  onPress={() => router.navigate(item.href)}
                  style={({ pressed }) => [s.item, pressed && s.pressed]}
                >
                  <CoreIcon
                    name={item.icon}
                    size={20}
                    color={active ? nativePalette.ink : nativePalette.muted}
                  />
                  <Text style={[s.label, active && s.active]}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable
            accessibilityLabel="Book a clean"
            accessibilityRole="button"
            onPress={() => router.push("/book")}
            style={({ pressed }) => [s.book, pressed && s.pressed]}
          >
            <CoreIcon name="plus" color={nativePalette.card} size={26} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
const s = StyleSheet.create({
  root: { backgroundColor: nativePalette.page, flex: 1 },
  wrap: {
    left: 16,
    right: 16,
    position: "absolute",
    flexDirection: "row",
    gap: 12,
  },
  capsule: {
    alignItems: "center",
    backgroundColor: nativePalette.card,
    borderColor: nativePalette.border,
    borderRadius: 32,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    height: 64,
    paddingHorizontal: 6,
    shadowColor: nativePalette.ink,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 5,
  },
  item: {
    alignItems: "center",
    flex: 1,
    gap: 2,
    justifyContent: "center",
    minHeight: 54,
  },
  label: {
    color: nativePalette.muted,
    fontFamily: nativeFonts.bodyBold,
    fontSize: 10,
  },
  active: { color: nativePalette.ink },
  book: {
    alignItems: "center",
    backgroundColor: nativePalette.ink,
    borderRadius: 32,
    height: 64,
    justifyContent: "center",
    shadowColor: nativePalette.ink,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    width: 64,
    elevation: 6,
  },
  pressed: { opacity: 0.65 },
});
