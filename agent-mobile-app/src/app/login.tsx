/**
 * 登录页（RN 迁移 #G，D4 行为变更：未登录 gate 进独立登录页）。
 * 基准 pulseB-login.html：cream 画布 + greeting/sub + 白卡（灰底输入行 +
 * 紫渐变主按钮 + hint）。文案为 mock 英文占位（用户可换中文）。
 * 已登录访问本页 → 直接返回（gate 防环）；登录成功 → back 回 Pulse。
 */
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text as RNText, TextInput, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { loadToken, login } from "@/services/auth";
import { LightPrimaryButton } from "@/components/pulse/LightAtoms";
import { lightColors, lightTypography, lightRadius, lightSpacing } from "@/theme/light";

export default function LoginScreen() {
  const router = useRouter();
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // 已登录直接回首页（gate 防环：深链 /login 且已有 token 时）
  useEffect(() => {
    loadToken().then((tok) => {
      if (tok) router.back();
    });
  }, [router]);

  const doLogin = async () => {
    if (busy) return;
    setBusy(true);
    try {
      setError(null);
      await login(user, pass);
      router.back(); // 登录成功 → 回 Pulse
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      {/* 桌面端手机壳：>480 视口居中 480（移动端 width:100% 零变化） */}
      <View style={styles.shell}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
        <RNText style={styles.greeting}>Welcome back</RNText>
        <RNText style={styles.sub}>Sign in to continue.</RNText>

        <View style={styles.card}>
          <TextInput
            placeholder="Username"
            value={user}
            onChangeText={setUser}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.field}
            placeholderTextColor={lightColors.grayText}
            testID="login-user"
          />
          <TextInput
            placeholder="Password"
            value={pass}
            onChangeText={setPass}
            secureTextEntry
            style={styles.field}
            placeholderTextColor={lightColors.grayText}
            testID="login-pass"
          />
          {error ? (
            <RNText style={styles.error} testID="login-error">
              {error}
            </RNText>
          ) : null}
          <LightPrimaryButton
            label="Log in"
            onPress={doLogin}
            disabled={busy}
            testID="login-submit"
          />
          <RNText style={styles.hint}>
            Your account keeps attention, duties and market data in sync.
          </RNText>
        </View>
      </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: lightColors.cream, alignItems: "center" },
  shell: {
    width: "100%",
    maxWidth: 480,
    flex: 1,
    position: "relative",
    backgroundColor: lightColors.cream,
  },
  content: {
    paddingHorizontal: lightSpacing.pageX,
    paddingTop: 14,
    paddingBottom: 60, // mock .content padding 14px 0 60px
  },
  greeting: {
    marginTop: 34, // mock .greeting mt 34
    fontSize: lightTypography.display.fontSize,
    fontWeight: lightTypography.display.fontWeight,
    lineHeight: lightTypography.display.lineHeight,
    color: lightColors.ink,
  },
  sub: {
    marginTop: 6, // mock .sub mt 6
    fontSize: lightTypography.body.fontSize,
    fontWeight: lightTypography.body.fontWeight,
    lineHeight: lightTypography.body.lineHeight,
    color: lightColors.subtleText,
  },
  card: {
    marginTop: 18, // mock .login-card mt 18
    backgroundColor: lightColors.white,
    borderRadius: lightRadius.card,
    padding: 16,
    gap: 10, // mock gap 10
  },
  field: {
    height: 44, // mock .field
    backgroundColor: lightColors.rowGray,
    borderRadius: lightRadius.row,
    paddingHorizontal: 14,
    fontSize: 15,
    color: lightColors.fieldText,
  },
  error: {
    fontSize: lightTypography.caption.fontSize,
    fontWeight: lightTypography.caption.fontWeight,
    lineHeight: lightTypography.caption.lineHeight,
    color: lightColors.upRed,
  },
  hint: {
    fontSize: lightTypography.caption.fontSize,
    fontWeight: lightTypography.caption.fontWeight,
    lineHeight: lightTypography.caption.lineHeight,
    color: lightColors.grayText,
  },
});
