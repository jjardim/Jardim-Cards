import { Component, type ErrorInfo, type ReactNode } from "react";
import { View, Text } from "react-native";
import { palette, radius } from "@/lib/theme";

interface Props {
  title: string;
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class WidgetErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn(`[WidgetErrorBoundary:${this.props.title}]`, error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View
          style={{
            marginTop: 12,
            padding: 16,
            borderRadius: radius.lg,
            backgroundColor: palette.surface,
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: "700", color: palette.text }}>
            {this.props.title} failed to load
          </Text>
          <Text style={{ fontSize: 12, color: palette.textSubtle, marginTop: 4 }}>
            Pull to refresh or try again later.
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}
