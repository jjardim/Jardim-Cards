/**
 * Native reorder via react-native-draglist — drag zone only so Switch stays tappable.
 */
import { useCallback, type ReactNode } from "react";
import { type StyleProp, type ViewStyle } from "react-native";
import DragList, { type DragListRenderItemInfo } from "react-native-draglist";

interface ReorderableWidgetListProps<T> {
  data: T[];
  keyExtractor: (item: T) => string;
  onReorder: (data: T[]) => void;
  renderItem: (params: {
    item: T;
    index: number;
    isDragging: boolean;
    dragZoneProps: {
      onPressIn: () => void;
      onPressOut: () => void;
    };
  }) => ReactNode;
  ListHeaderComponent?: ReactNode;
  ListFooterComponent?: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

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
  const handleReordered = useCallback(
    (fromIndex: number, toIndex: number) => {
      const next = [...data];
      const [removed] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, removed);
      onReorder(next);
    },
    [data, onReorder]
  );

  const renderDragItem = useCallback(
    (info: DragListRenderItemInfo<T>) => {
      const { item, index, onDragStart, onDragEnd, isActive } = info;
      return (
        <>
          {renderItem({
            item,
            index,
            isDragging: isActive,
            dragZoneProps: {
              onPressIn: onDragStart,
              onPressOut: onDragEnd,
            },
          })}
        </>
      );
    },
    [renderItem]
  );

  return (
    <DragList
      data={data}
      keyExtractor={(item, index) => keyExtractor(item) || String(index)}
      onReordered={handleReordered}
      renderItem={renderDragItem}
      ListHeaderComponent={
        ListHeaderComponent ? () => <>{ListHeaderComponent}</> : undefined
      }
      ListFooterComponent={
        ListFooterComponent ? () => <>{ListFooterComponent}</> : undefined
      }
      style={style}
      contentContainerStyle={contentContainerStyle}
    />
  );
}
