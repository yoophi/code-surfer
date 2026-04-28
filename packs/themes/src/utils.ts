import { Theme, ThemeUIStyleObject } from "theme-ui";

type CodeSurferStyleProp = ThemeUIStyleObject | Record<string, any>;

export type CodeSurferStyles = {
  title: CodeSurferStyleProp;
  subtitle: CodeSurferStyleProp;
  code: CodeSurferStyleProp;
  pre: CodeSurferStyleProp;
  tokens: Record<string, CodeSurferStyleProp>;
  unfocused?: {
    opacity: number;
  };
};

type StyleItem = {
  types: string[];
  style: CodeSurferStyleProp;
};

export type PrismTheme = {
  plain: { color: string; backgroundColor: string };
  styles: StyleItem[];
};

export type CodeSurferTheme = Omit<Theme, "styles"> & {
  styles?: Record<string, any> & { CodeSurfer?: CodeSurferStyles };
};

export function makeTheme(
  prismTheme: PrismTheme,
  override: Partial<CodeSurferStyles> = {}
): CodeSurferTheme {
  const tokens = {} as Record<string, CodeSurferStyleProp>;
  prismTheme.styles.forEach(s => {
    tokens[s.types.join(" ")] = s.style;
  });

  const theme: CodeSurferTheme = {
    colors: {
      text: prismTheme.plain.color,
      background: prismTheme.plain.backgroundColor
    },
    styles: {
      CodeSurfer: {
        tokens,
        title: {
          backgroundColor: prismTheme.plain.backgroundColor,
          color: prismTheme.plain.color
        },
        subtitle: {
          color: "#d6deeb",
          backgroundColor: "rgba(10,10,10,0.9)"
        },
        pre: {
          color: prismTheme.plain.color,
          backgroundColor: prismTheme.plain.backgroundColor
        },
        code: {
          color: prismTheme.plain.color,
          backgroundColor: prismTheme.plain.backgroundColor
        },
        ...override
      }
    }
  };

  const stringStyle = prismTheme.styles.find(s => s.types.includes("string"));
  const primary = stringStyle && ((stringStyle.style as any).color as string);
  if (theme.colors && primary) {
    theme.colors.primary = primary;
  }

  return theme;
}
