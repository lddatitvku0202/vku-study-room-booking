import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { colors, radius, sizes, spacing, typography } from '@/data/theme';

import type { JSX } from 'react';

/** Single-line text field styled from tokens. */
export function AppInput({ style, editable, ...rest }: TextInputProps): JSX.Element {
  const isReadOnly = editable === false;
  return (
    <TextInput
      placeholderTextColor={colors.textSecondary}
      {...rest}
      editable={!isReadOnly}
      style={[styles.input, isReadOnly && styles.readOnly, style]}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    ...typography.body,
    minHeight: sizes.touchTarget,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  readOnly: { backgroundColor: colors.background },
});
