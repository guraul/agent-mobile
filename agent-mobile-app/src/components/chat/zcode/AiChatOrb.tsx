// AI 能量球头像（chat.html .ai-orb 基准，#29）：暗核 → 棕 → 桃色环 + 柔光晕。
// mock 是 CSS radial-gradient + box-shadow 光晕；RN 用 react-native-svg RadialGradient
// 还原渐变，光晕用 AIOrb 同款"分层透明圆"技法（web/iOS/Android 三端一致，不依赖 boxShadow）。
import React from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";
import { lightChatColors, lightChatOrbStops, lightChatSizes } from "../../../theme/light";

interface Props {
  size?: number;
}

export function AiChatOrb({ size = lightChatSizes.orbSize }: Props) {
  // 光晕：orb 外两圈桃色半透明圆（mock box-shadow 0 0 10px 2px rgba(243,186,143,.55)）
  const haloOuter = Math.round(size * 1.5);
  const haloInner = Math.round(size * 1.22);

  return (
    <View style={[s.wrap, { width: haloOuter, height: haloOuter }]}>
      <View
        style={[
          s.halo,
          {
            width: haloOuter,
            height: haloOuter,
            borderRadius: haloOuter / 2,
            backgroundColor: lightChatColors.orbHaloOuter,
          },
        ]}
      />
      <View
        style={[
          s.halo,
          {
            width: haloInner,
            height: haloInner,
            borderRadius: haloInner / 2,
            backgroundColor: lightChatColors.orbHaloInner,
          },
        ]}
      />
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Defs>
          <RadialGradient id="aiChatOrbGrad" cx="50%" cy="50%" r="50%">
            {lightChatOrbStops.map((stop) => (
              <Stop key={stop.offset} offset={stop.offset} stopColor={stop.color} />
            ))}
          </RadialGradient>
        </Defs>
        <Circle cx="12" cy="12" r="12" fill="url(#aiChatOrbGrad)" />
      </Svg>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },
  halo: { position: "absolute" },
});
