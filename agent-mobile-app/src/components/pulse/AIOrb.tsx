import React, { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, View } from "react-native";
import { colors } from "../../theme";

export type OrbState = "attentive" | "engaged" | "thinking" | "needs-you" | "offline";

interface OrbPalette {
  core: string;
  mid: string;
  halo: string;
}

const ORB_PALETTES: Record<OrbState, OrbPalette> = {
  attentive: { core: "#C4B5FD", mid: colors.accent.default, halo: "rgba(139, 92, 246, 0.28)" },
  engaged: { core: "#DDD6FE", mid: colors.accent.bright, halo: "rgba(167, 139, 250, 0.32)" },
  thinking: { core: "#EDE9FE", mid: colors.accent.bright, halo: "rgba(167, 139, 250, 0.38)" },
  "needs-you": { core: "#FFE3A8", mid: colors.status.running, halo: "rgba(242, 179, 61, 0.28)" },
  offline: { core: "#77758A", mid: "#46445C", halo: "rgba(85, 83, 107, 0.18)" },
};

export interface AIOrbProps {
  size?: number;
  state?: OrbState;
  accessibilityLabel?: string;
  testID?: string;
}

/**
 * AIOrb — presence orb (Showcase2 visual language §7).
 * Calm breathing by default; amber for needs-you; flat/static when offline.
 * Exactly one orb per screen.
 */
export function AIOrb({
  size = 40,
  state = "attentive",
  accessibilityLabel = "Pulse AI presence",
  testID,
}: AIOrbProps) {
  const palette = ORB_PALETTES[state];
  const breath = useRef(new Animated.Value(1)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (state === "offline" || reduceMotion) {
      breath.setValue(1);
      return;
    }
    const period = state === "engaged" ? 1250 : 1750;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, {
          toValue: 0.55,
          duration: period,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(breath, {
          toValue: 1,
          duration: period,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [state, reduceMotion, breath]);

  const haloSize = Math.round(size * 1.5);
  const coreSize = Math.max(6, Math.round(size * 0.42));

  return (
    <View
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}
    >
      {state !== "offline" ? (
        <Animated.View
          style={{
            position: "absolute",
            width: haloSize,
            height: haloSize,
            borderRadius: haloSize / 2,
            backgroundColor: palette.halo,
            opacity: breath,
          }}
        />
      ) : null}
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: palette.mid,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View
          style={{
            width: coreSize,
            height: coreSize,
            borderRadius: coreSize / 2,
            backgroundColor: palette.core,
          }}
        />
      </View>
    </View>
  );
}
