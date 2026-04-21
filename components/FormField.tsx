import { View, Text, TextInput } from "react-native";

interface FormFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  keyboardType?: "default" | "number-pad" | "decimal-pad";
}

export function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: FormFieldProps) {
  return (
    <View>
      <Text style={{ fontSize: 13, fontWeight: "600", color: "#3f3f46", marginBottom: 4 }}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType ?? "default"}
        placeholderTextColor="#a1a1aa"
        style={{
          borderWidth: 1,
          borderColor: "#e4e4e7",
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 10,
          fontSize: 15,
          backgroundColor: "#fff",
          color: "#18181b",
        }}
      />
    </View>
  );
}
