import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Platform, View, useWindowDimensions, type ViewStyle } from "react-native";

export interface MarqueeProps {
  /** 子内容（一行条目） */
  children: React.ReactNode;
  /** 滚动速度 px/s */
  speed?: number;
  style?: ViewStyle;
}

/**
 * 横向自动滚动跑马灯。
 * 内容超宽时无缝循环滚动（内容复制两份，translateX 从 0 滚到 -单份宽度再重置）。
 * 内容不超宽则静止展示。
 */
export function Marquee({ children, speed = 40, style }: MarqueeProps) {
  const { width: screenWidth } = useWindowDimensions();
  const [contentWidth, setContentWidth] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  // contentWidth = 单份内容宽度（渲染两份之一，onLayout 测的是两份总宽的一半）
  const shouldScroll = contentWidth > screenWidth * 0.9;

  useEffect(() => {
    if (!shouldScroll || contentWidth <= 0) {
      translateX.setValue(0);
      animRef.current?.stop();
      return;
    }
    animRef.current?.stop();
    translateX.setValue(0);
    const duration = (contentWidth / speed) * 1000;
    // react-native-web 的 Animated 在 useNativeDriver:true 下不更新 DOM transform
    //（与 BottomSheet 黑框同源坑，见 CONVENTIONS.md），web 必须用 JS 驱动。
    animRef.current = Animated.loop(
      Animated.timing(translateX, {
        toValue: -contentWidth,
        duration,
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== "web",
      }),
    );
    animRef.current.start();
    return () => {
      animRef.current?.stop();
    };
  }, [shouldScroll, contentWidth, speed, translateX]);

  return (
    <View style={[{ flexDirection: "row", overflow: "hidden" }, style]}>
      <Animated.View
        style={{ flexDirection: "row", alignItems: "center", transform: [{ translateX }] }}
        onLayout={(e) => setContentWidth(e.nativeEvent.layout.width / 2)}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>{children}</View>
        <View style={{ flexDirection: "row", alignItems: "center" }}>{children}</View>
      </Animated.View>
    </View>
  );
}
