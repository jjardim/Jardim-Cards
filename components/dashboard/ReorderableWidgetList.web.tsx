/**
 * Pointer-based reorder for web — no HTML5 `draggable` (that blocks taps on Switch/buttons).
 * Drag starts after an 8px move so clicks still work.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  ScrollView,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { palette } from "@/lib/theme";

const DRAG_ACTIVATION_PX = 8;

interface ReorderableWidgetListProps<T> {
  data: T[];
  keyExtractor: (item: T) => string;
  onReorder: (data: T[]) => void;
  renderItem: (params: {
    item: T;
    index: number;
    isDragging: boolean;
    dragZoneProps: Record<string, unknown>;
  }) => ReactNode;
  ListHeaderComponent?: ReactNode;
  ListFooterComponent?: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

type DragState = {
  index: number;
  startY: number;
  activated: boolean;
};

export function ReorderableWidgetList<T>({
  data,
  keyExtractor,
  onReorder,
  renderItem,
  ListHeaderComponent,
  ListFooterComponent,
  style,
  contentContainerStyle,
}: ReorderableWidgetListProps<T>) {
  const dragState = useRef<DragState | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const hoverIndexRef = useRef<number | null>(null);

  const finishDrag = useCallback(() => {
    dragState.current = null;
    setDragIndex(null);
    setHoverIndex(null);
    hoverIndexRef.current = null;
  }, []);

  const resolveHoverIndex = useCallback((clientX: number, clientY: number): number | null => {
    if (typeof document === "undefined") return null;
    const el = document.elementFromPoint(clientX, clientY);
    const row = el?.closest("[data-reorder-index]");
    if (!row) return null;
    const idx = row.getAttribute("data-reorder-index");
    return idx != null ? Number(idx) : null;
  }, []);

  const commitReorder = useCallback(
    (from: number, to: number) => {
      if (from === to) return;
      const next = [...data];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      onReorder(next);
    },
    [data, onReorder]
  );

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const onPointerMove = (clientX: number, clientY: number) => {
      const drag = dragState.current;
      if (!drag) return;

      const delta = Math.abs(clientY - drag.startY);
      if (!drag.activated && delta >= DRAG_ACTIVATION_PX) {
        drag.activated = true;
        setDragIndex(drag.index);
      }

      if (drag.activated) {
        const hover = resolveHoverIndex(clientX, clientY);
        if (hover !== null && hover !== hoverIndexRef.current) {
          hoverIndexRef.current = hover;
          setHoverIndex(hover);
        }
      }
    };

    const onMouseMove = (e: MouseEvent) => onPointerMove(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      if (dragState.current?.activated) e.preventDefault();
      const touch = e.touches[0];
      if (touch) onPointerMove(touch.clientX, touch.clientY);
    };

    const onPointerUp = () => {
      const drag = dragState.current;
      if (drag?.activated) {
        const target = hoverIndexRef.current ?? drag.index;
        commitReorder(drag.index, target);
      }
      finishDrag();
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onPointerUp);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onPointerUp);
    window.addEventListener("touchcancel", onPointerUp);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onPointerUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onPointerUp);
      window.removeEventListener("touchcancel", onPointerUp);
    };
  }, [commitReorder, finishDrag, resolveHoverIndex]);

  const startDrag = useCallback((index: number) => {
    return (e: { nativeEvent: { pageY: number } }) => {
      dragState.current = {
        index,
        startY: e.nativeEvent.pageY,
        activated: false,
      };
    };
  }, []);

  const dragZoneProps = useCallback(
    (index: number) => ({
      onMouseDown: startDrag(index),
      onTouchStart: startDrag(index),
    }),
    [startDrag]
  );

  return (
    <ScrollView style={style} contentContainerStyle={contentContainerStyle}>
      {ListHeaderComponent}
      {data.map((item, index) => {
        const isDragging = dragIndex === index;
        const isHoverTarget = hoverIndex === index && dragIndex !== null && dragIndex !== index;

        return (
          <View
            key={keyExtractor(item)}
            {...({ "data-reorder-index": String(index) } as object)}
            style={{
              marginBottom: 2,
              borderRadius: 12,
              borderWidth: isHoverTarget ? 2 : 0,
              borderColor: isHoverTarget ? palette.primary : "transparent",
              borderStyle: isHoverTarget ? "dashed" : "solid",
            }}
          >
            {renderItem({
              item,
              index,
              isDragging,
              dragZoneProps: dragZoneProps(index),
            })}
          </View>
        );
      })}
      {ListFooterComponent}
    </ScrollView>
  );
}
