import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, View, useWindowDimensions, type ViewStyle } from "react-native";

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
  const [halfWidth, setHalfWidth] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  // halfWidth = 单份内容宽度（两份之一）
  const shouldScroll = halfWidth > screenWidth * 0.9;

  useEffect(() => {
    if (!shouldScroll || halfWidth <= 0) {
      translateX.setValue(0);
      animRef.current?.stop();
      return;
    }
    animRef.current?.stop();
    translateX.setValue(0);
    const duration = (halfWidth / speed) * 1000;
    animRef.current = Animated.loop(
      Animated.timing(translateX, {
        toValue: -halfWidth,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    animRef.current.start();
    return () => {
      animRef.current?.stop();
    };
  }, [shouldScroll, halfWidth, speed, translateX]);

  if (!shouldScroll) {
    return <View style={[{ flexDirection: "row", alignItems: "center" }, style]}>{children}</View>;
  }

  return (
    <View
      style={[{ flexDirection: "row", overflow: "hidden" }, style]}
      onLayout={(e) => setHalfWidth(e.nativeEvent.layout.width / 2)}
    >
      <Animated.View style={{ flexDirection: "row", alignItems: "center", transform: [{ translateX }] }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>{children}</View>
        <View style={{ flexDirection: "row", alignItems: "center" }}>{children}</View>
      </Animated.View>
    </View>
  );
}
