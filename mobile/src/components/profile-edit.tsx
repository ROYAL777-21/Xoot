import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import {
  Card,
  CoreIcon,
  EmptyState,
  LoadingRows,
  Screen,
  nativeFonts,
  nativePalette,
  useNativeCoreData,
} from "@/components/native-core";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/auth-provider";
type Field = "full_name" | "phone" | "address";
const cfg = {
  full_name: {
    title: "Your name",
    label: "Name",
    placeholder: "Your full name",
    keyboard: "default",
  },
  phone: {
    title: "Mobile",
    label: "Mobile number",
    placeholder: "+27 82 123 4567",
    keyboard: "phone-pad",
  },
  address: {
    title: "Account address",
    label: "Address",
    placeholder: "Street and suburb",
    keyboard: "default",
  },
} as const;
export function ProfileEdit({ field }: { field: Field }) {
  const { user, isLoading } = useAuth();
  const { profile, refresh } = useNativeCoreData();
  const c = cfg[field];
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/account");
  };

  useEffect(() => setValue(profile?.[field] ?? ""), [field, profile]);

  const save = async () => {
    if (!user) {
      setError("Your session ended. Sign in again to save this change.");
      return;
    }
    const clean = value.trim();
    if (field === "full_name" && clean.length < 2) {
      setError("Enter at least two characters.");
      return;
    }
    if (field === "phone" && clean && clean.replace(/\D/g, "").length < 9) {
      setError("Enter a valid mobile number.");
      return;
    }

    setSaving(true);
    setError(null);
    const update =
      field === "full_name"
        ? { full_name: clean || null }
        : field === "phone"
          ? { phone: clean || null }
          : { address: clean || null };
    const { error: updateError } = await supabase
      .from("profiles")
      .update(update)
      .eq("id", user.id);
    if (updateError) {
      setError("Your change could not be saved. Try again.");
      setSaving(false);
      return;
    }
    await refresh();
    setSaving(false);
    router.back();
  };

  if (isLoading) {
    return (
      <Screen>
        <LoadingRows />
      </Screen>
    );
  }

  if (!user) {
    return (
      <Screen>
        <View style={x.top}>
          <Pressable accessibilityLabel="Back" onPress={goBack} style={x.back}>
            <CoreIcon name="arrow-left" />
          </Pressable>
          <Text style={x.title}>{c.title}</Text>
        </View>
        <EmptyState
          title="Sign in to edit your profile"
          detail="Your account details are protected and can only be changed while signed in."
          action="Go to sign in"
          onAction={() => router.replace("/account")}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={x.top}>
        <Pressable accessibilityLabel="Back" onPress={goBack} style={x.back}>
          <CoreIcon name="arrow-left" />
        </Pressable>
        <Text style={x.title}>{c.title}</Text>
      </View>
      <Card style={x.card}>
        <Text style={x.label}>{c.label}</Text>
        <TextInput
          autoFocus
          value={value}
          onChangeText={setValue}
          keyboardType={c.keyboard}
          placeholder={c.placeholder}
          placeholderTextColor={nativePalette.muted}
          style={x.input}
        />
        {field === "phone" ? (
          <Text style={x.hint}>Used for arrival and service updates.</Text>
        ) : null}
        {error ? <Text style={x.error}>{error}</Text> : null}
      </Card>
      <Pressable
        disabled={saving}
        onPress={save}
        style={[x.save, saving && x.disabled]}
      >
        <Text style={x.saveText}>{saving ? "Saving" : "Save changes"}</Text>
      </Pressable>
    </Screen>
  );
}
const x = StyleSheet.create({
  top: { alignItems: "center", flexDirection: "row", gap: 12 },
  back: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  title: {
    color: nativePalette.ink,
    fontFamily: nativeFonts.displayStrong,
    fontSize: 28,
  },
  card: { gap: 8 },
  label: {
    color: nativePalette.inkSoft,
    fontFamily: nativeFonts.bodyBold,
    fontSize: 12,
  },
  input: {
    backgroundColor: nativePalette.sunken,
    borderColor: nativePalette.border,
    borderRadius: 14,
    borderWidth: 1,
    color: nativePalette.ink,
    fontFamily: nativeFonts.body,
    fontSize: 16,
    minHeight: 54,
    paddingHorizontal: 14,
  },
  hint: {
    color: nativePalette.muted,
    fontFamily: nativeFonts.body,
    fontSize: 12,
  },
  error: {
    color: nativePalette.careInk,
    fontFamily: nativeFonts.bodyBold,
    fontSize: 12,
  },
  save: {
    alignItems: "center",
    backgroundColor: nativePalette.ink,
    borderRadius: 16,
    minHeight: 52,
    justifyContent: "center",
  },
  saveText: { color: nativePalette.card, fontFamily: nativeFonts.bodyBold },
  disabled: { opacity: 0.55 },
});
