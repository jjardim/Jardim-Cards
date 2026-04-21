import { useEffect, useRef, useState, useCallback } from "react";
import { Animated, Text, type TextStyle } from "react-native";

interface AnimatedNumberProps {
  value: number;
  formatter?: (n: number) => string;
  duration?: number;
  style?: TextStyle;
}

export function AnimatedNumber({
  value,
  formatter = (n) => n.toString(),
  duration = 600,
  style,
}: AnimatedNumberProps) {
  const anim = useRef(new Animated.Value(value)).current;
  const [display, setDisplay] = useState(value);

  const update = useCallback(
    (v: number) => setDisplay(Math.round(v)),
    []
  );

  useEffect(() => {
    const listener = anim.addListener(({ value: v }) => update(v));

    Animated.timing(anim, {
      toValue: value,
      duration,
      useNativeDriver: false,
    }).start();

    return () => anim.removeListener(listener);
  }, [value, anim, duration, update]);

  return <Text style={style}>{formatter(display)}</Text>;
}
