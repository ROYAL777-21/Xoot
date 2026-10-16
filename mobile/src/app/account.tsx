import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import {
  Avatar,
  Card,
  CoreIcon,
  DisplayTitle,
  LoadingRows,
  Screen,
  SectionLabel,
  nativeFonts,
  nativePalette,
  useNativeCoreData,
  type CoreIconName,
} from "@/components/native-core";
import { getAuthRedirectUrl, startOAuth } from "@/lib/auth-links";
import {
  isAppleSignInAvailable,
  isAppleSignInCancellation,
  signInWithApple,
} from "@/lib/apple-auth";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/auth-provider";
type Place = { id: string; label: string; address: string | null };
function Row({
  icon,
  title,
  detail,
  onPress,
}: {
  icon: CoreIconName;
  title: string;
  detail?: string | null;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [s.row, pressed && s.pressed]}
    >
      <CoreIcon name={icon} size={19} />
      <View style={s.grow}>
        <Text style={s.rowTitle}>{title}</Text>
        {detail ? <Text style={s.detail}>{detail}</Text> : null}
      </View>
      {onPress ? (
        <CoreIcon name="chevron-right" color={nativePalette.muted} size={17} />
      ) : (
        <Text style={s.unavailable}>Unavailable</Text>
      )}
    </Pressable>
  );
}
export default function AccountScreen() {
  const { user, signOut } = useAuth();
  const { profile, isLoading } = useNativeCoreData();
  const [places, setPlaces] = useState<Place[]>([]);
  const [placeError, setPlaceError] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [apple, setApple] = useState(false);
  useEffect(() => {
    let mounted = true;
    void isAppleSignInAvailable()
      .then((value) => {
        if (mounted) setApple(value);
      })
      .catch(() => {
        if (mounted) setApple(false);
      });
    return () => {
      mounted = false;
    };
  }, []);
  useEffect(() => {
    if (!user) return;
    void supabase
      .from("household_profiles")
      .select("id,label,address")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .then(({ data, error }) => {
        setPlaceError(Boolean(error));
        if (!error) setPlaces((data ?? []) as Place[]);
      });
  }, [user]);
  const magic = async () => {
    setSubmitting(true);
    setStatus(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: getAuthRedirectUrl(),
        shouldCreateUser: true,
      },
    });
    setStatus(
      error ? error.message : "Check your email to finish signing in to Xoot.",
    );
    setSubmitting(false);
  };
  const appleSignIn = useCallback(async () => {
    try {
      await signInWithApple();
    } catch (error) {
      if (!isAppleSignInCancellation(error))
        setStatus(
          error instanceof Error
            ? error.message
            : "Could not sign in with Apple.",
        );
    }
  }, []);
  if (!user)
    return (
      <Screen>
        <DisplayTitle>You</DisplayTitle>
        <Card style={s.signin}>
          <Text style={s.cardTitle}>Sign in to your Xoot account</Text>
          <Text style={s.copy}>
            Saved places, rewards and account details stay protected.
          </Text>
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={nativePalette.muted}
            style={s.input}
          />
          <Pressable
            disabled={submitting || !email.includes("@")}
            onPress={magic}
            style={s.primary}
          >
            <Text style={s.primaryText}>
              {submitting ? "Sending link" : "Send secure sign-in link"}
            </Text>
          </Pressable>
          <Pressable
            onPress={() =>
              startOAuth("google").catch((e) => setStatus(e.message))
            }
            style={s.secondary}
          >
            <Text style={s.secondaryText}>Continue with Google</Text>
          </Pressable>
          {apple ? (
            <Pressable onPress={appleSignIn} style={s.secondary}>
              <Text style={s.secondaryText}>Continue with Apple</Text>
            </Pressable>
          ) : null}
          {status ? <Text style={s.copy}>{status}</Text> : null}
        </Card>
      </Screen>
    );
  if (isLoading)
    return (
      <Screen>
        <DisplayTitle>You</DisplayTitle>
        <LoadingRows />
      </Screen>
    );
  const name =
    profile?.full_name?.trim() ||
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "Your account";
  return (
    <Screen>
      <DisplayTitle>You</DisplayTitle>
      <Pressable onPress={() => router.push("/account/edit-name")}>
        <Card style={s.profile}>
          <Avatar name={name} uri={profile?.avatar_url} size={58} />
          <View style={s.grow}>
            <Text style={s.name}>{name}</Text>
            <Text style={s.detail}>{user.email}</Text>
          </View>
          <CoreIcon
            name="chevron-right"
            color={nativePalette.muted}
            size={18}
          />
        </Card>
      </Pressable>
      <SectionLabel count={places.length}>Your places</SectionLabel>
      <Card style={s.list}>
        {placeError ? (
          <Text style={s.empty}>Saved places are temporarily unavailable.</Text>
        ) : places.length ? (
          places.map((p) => (
            <Row
              key={p.id}
              icon="home"
              title={p.label || "Saved place"}
              detail={p.address}
            />
          ))
        ) : (
          <Text style={s.empty}>No saved places yet.</Text>
        )}
        <Row
          icon="plus"
          title="Add a place"
          detail="Place creation is not available in this app yet."
        />
      </Card>
      <SectionLabel>Account details</SectionLabel>
      <Card style={s.list}>
        <Row
          icon="circle-user"
          title="Your name"
          detail={profile?.full_name || "Add your name"}
          onPress={() => router.push("/account/edit-name")}
        />
        <Row
          icon="message"
          title="Mobile"
          detail={profile?.phone || "Add your mobile number"}
          onPress={() => router.push("/account/edit-phone")}
        />
        <Row
          icon="home"
          title="Address"
          detail={profile?.address || "Add your account address"}
          onPress={() => router.push("/account/edit-address")}
        />
      </Card>
      <SectionLabel>Money</SectionLabel>
      <Card style={s.list}>
        <Row
          icon="wallet"
          title="XootCred"
          detail="Balance and account activity"
          onPress={() => router.push("/credits")}
        />
        <Row
          icon="credit-card"
          title="Payment methods"
          detail="Payment management is not available in this app yet."
        />
      </Card>
      <SectionLabel>Care and gifting</SectionLabel>
      <Card style={s.list}>
        <Row
          icon="gift"
          title="Gift a Clean"
          detail="Choose visits and personalise a real gift card"
          onPress={() => router.push("/gifts")}
        />
        <Row
          icon="heart"
          title="Care+"
          detail="Membership benefits, status and availability"
          onPress={() => router.push("/care-plus")}
        />
      </Card>
      <SectionLabel>Work with Xoot</SectionLabel>
      <Card style={s.list}>
        <Row
          icon="briefcase"
          title="Xooter workspace"
          detail="Your assignments, earnings and growth tools"
          onPress={() => router.push("/xooter")}
        />
        <Row
          icon="briefcase"
          title="Xooter jobs"
          detail="Verified offers and assignments"
          onPress={() => router.push("/xooter/jobs")}
        />
        <Row
          icon="shield"
          title="Xooter verification"
          detail="Review your application and document statuses"
          onPress={() => router.push("/xooter/kyc")}
        />
        <Row
          icon="trophy"
          title="Xooter training"
          detail="Required foundation and optional learning"
          onPress={() => router.push("/xooter/training")}
        />
      </Card>
      <SectionLabel>Your app</SectionLabel>
      <Card style={s.list}>
        <Row
          icon="bell"
          title="Notifications"
          detail="Service updates and alerts"
          onPress={() => router.push("/notifications")}
        />
        <Row
          icon="sparkles"
          title="Concierge"
          detail="Ask Xoot Concierge"
          onPress={() => router.push("/concierge")}
        />
      </Card>
      <Pressable onPress={() => void signOut()} style={s.signout}>
        <Text style={s.signoutText}>Sign out</Text>
      </Pressable>
    </Screen>
  );
}
const s = StyleSheet.create({
  signin: { gap: 12 },
  cardTitle: {
    color: nativePalette.ink,
    fontFamily: nativeFonts.displayStrong,
    fontSize: 24,
  },
  copy: {
    color: nativePalette.inkSoft,
    fontFamily: nativeFonts.body,
    fontSize: 14,
    lineHeight: 20,
  },
  input: {
    backgroundColor: nativePalette.sunken,
    borderColor: nativePalette.border,
    borderRadius: 14,
    borderWidth: 1,
    color: nativePalette.ink,
    fontFamily: nativeFonts.body,
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: 14,
  },
  primary: {
    alignItems: "center",
    backgroundColor: nativePalette.ink,
    borderRadius: 16,
    minHeight: 52,
    justifyContent: "center",
  },
  primaryText: { color: nativePalette.card, fontFamily: nativeFonts.bodyBold },
  secondary: {
    alignItems: "center",
    borderColor: nativePalette.borderStrong,
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 50,
    justifyContent: "center",
  },
  secondaryText: { color: nativePalette.ink, fontFamily: nativeFonts.bodyBold },
  profile: { alignItems: "center", flexDirection: "row", gap: 14 },
  name: {
    color: nativePalette.ink,
    fontFamily: nativeFonts.displayStrong,
    fontSize: 23,
  },
  grow: { flex: 1 },
  list: { gap: 0 },
  row: { alignItems: "center", flexDirection: "row", gap: 12, minHeight: 58 },
  pressed: { opacity: 0.62 },
  rowTitle: {
    color: nativePalette.ink,
    fontFamily: nativeFonts.bodyBold,
    fontSize: 14,
  },
  detail: {
    color: nativePalette.muted,
    fontFamily: nativeFonts.body,
    fontSize: 12,
    marginTop: 2,
  },
  unavailable: {
    color: nativePalette.muted,
    fontFamily: nativeFonts.body,
    fontSize: 11,
  },
  empty: {
    color: nativePalette.muted,
    fontFamily: nativeFonts.body,
    fontSize: 13,
    paddingVertical: 16,
  },
  signout: {
    alignItems: "center",
    borderColor: nativePalette.border,
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 50,
    justifyContent: "center",
  },
  signoutText: {
    color: nativePalette.careInk,
    fontFamily: nativeFonts.bodyBold,
  },
});
