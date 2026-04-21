import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/lib/auth-context";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  async function handleLogin() {
    setError(null);
    setLoading(true);
    const { error: err } = await signIn(email, password);
    if (err) {
      setError(err);
      setLoading(false);
    } else {
      router.replace("/(tabs)/portfolio");
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: "#fafafa" }}
    >
      <View style={{ flex: 1, justifyContent: "center", padding: 24 }}>
        <Text style={{ fontSize: 28, fontWeight: "700", color: "#18181b" }}>Sign in</Text>
        <Text style={{ fontSize: 15, color: "#71717a", marginTop: 4, marginBottom: 28 }}>
          Sign in to manage your card portfolio
        </Text>

        {error && (
          <View style={{ backgroundColor: "#fef2f2", borderRadius: 10, padding: 12, marginBottom: 16 }}>
            <Text style={{ color: "#ef4444", fontSize: 14 }}>{error}</Text>
          </View>
        )}

        <Text style={{ fontSize: 13, fontWeight: "600", color: "#3f3f46", marginBottom: 4 }}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor="#a1a1aa"
          style={{
            borderWidth: 1, borderColor: "#e4e4e7", borderRadius: 10, paddingHorizontal: 14,
            paddingVertical: 12, fontSize: 16, backgroundColor: "#fff", color: "#18181b", marginBottom: 14,
          }}
        />

        <Text style={{ fontSize: 13, fontWeight: "600", color: "#3f3f46", marginBottom: 4 }}>Password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Your password"
          secureTextEntry
          placeholderTextColor="#a1a1aa"
          style={{
            borderWidth: 1, borderColor: "#e4e4e7", borderRadius: 10, paddingHorizontal: 14,
            paddingVertical: 12, fontSize: 16, backgroundColor: "#fff", color: "#18181b", marginBottom: 20,
          }}
        />

        <TouchableOpacity
          onPress={handleLogin}
          disabled={loading}
          style={{ backgroundColor: "#18181b", borderRadius: 10, padding: 16, alignItems: "center", opacity: loading ? 0.5 : 1 }}
        >
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>{loading ? "Signing in..." : "Sign in"}</Text>
        </TouchableOpacity>

        <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 20 }}>
          <Text style={{ color: "#71717a", fontSize: 15 }}>Don&apos;t have an account? </Text>
          <TouchableOpacity onPress={() => router.push("/(auth)/signup")}>
            <Text style={{ color: "#18181b", fontWeight: "600", fontSize: 15 }}>Sign up</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
