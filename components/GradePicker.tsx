import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import {
  GRADE_SCORES,
  GRADING_COMPANIES,
  formatGradeToken,
  parseGradeSelection,
  type GradeSelection,
  type GradingCompany,
} from "@/lib/parsing/grade";
import { palette, radius, spacing } from "@/lib/theme";

interface GradePickerProps {
  value: string;
  onChange: (grade: string) => void;
  label?: string;
  hint?: string;
}

function normalizeScore(company: GradingCompany, score: string | undefined): string {
  const options = GRADE_SCORES[company];
  if (score && options.includes(score)) return score;
  return options[0];
}

function selectionFromValue(value: string): GradeSelection {
  const parsed = parseGradeSelection(value);
  if (parsed.kind === "graded" && parsed.company) {
    return {
      kind: "graded",
      company: parsed.company,
      score: normalizeScore(parsed.company, parsed.score),
    };
  }
  return { kind: "raw" };
}

function GradePill({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.sm,
        backgroundColor: selected ? palette.heroDark : palette.surface,
        borderWidth: 1,
        borderColor: selected ? palette.heroDark : palette.borderSoft,
      }}
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: "600",
          color: selected ? palette.textInverse : palette.text,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function GradePicker({ value, onChange, label, hint }: GradePickerProps) {
  const [selection, setSelection] = useState<GradeSelection>(() => selectionFromValue(value));

  useEffect(() => {
    setSelection(selectionFromValue(value));
  }, [value]);

  function apply(next: GradeSelection) {
    setSelection(next);
    onChange(formatGradeToken(next));
  }

  function selectRaw() {
    apply({ kind: "raw" });
  }

  function selectCompany(company: GradingCompany) {
    apply({
      kind: "graded",
      company,
      score: normalizeScore(company, selection.company === company ? selection.score : undefined),
    });
  }

  function selectScore(score: string) {
    if (selection.kind !== "graded" || !selection.company) return;
    apply({ kind: "graded", company: selection.company, score });
  }

  const displayToken = formatGradeToken(selection);

  return (
    <View style={{ gap: spacing.sm }}>
      {label ? (
        <Text style={{ fontSize: 13, fontWeight: "600", color: palette.text, marginBottom: 2 }}>
          {label}
        </Text>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <GradePill label="Raw" selected={selection.kind === "raw"} onPress={selectRaw} />
          {GRADING_COMPANIES.map((company) => (
            <GradePill
              key={company}
              label={company}
              selected={selection.kind === "graded" && selection.company === company}
              onPress={() => selectCompany(company)}
            />
          ))}
        </View>
      </ScrollView>

      {selection.kind === "graded" && selection.company ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            {GRADE_SCORES[selection.company].map((score) => (
              <GradePill
                key={score}
                label={score}
                selected={selection.score === score}
                onPress={() => selectScore(score)}
              />
            ))}
          </View>
        </ScrollView>
      ) : null}

      {displayToken ? (
        <Text style={{ fontSize: 11, color: palette.textSubtle }}>
          {`Tracking ${displayToken} comps`}
        </Text>
      ) : null}

      {hint ? (
        <Text style={{ fontSize: 11, color: palette.textSubtle }}>{hint}</Text>
      ) : !displayToken ? (
        <Text style={{ fontSize: 11, color: palette.textSubtle }}>
          Raw card — market value uses ungraded comps.
        </Text>
      ) : null}
    </View>
  );
}
