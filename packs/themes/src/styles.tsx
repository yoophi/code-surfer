/** @jsx jsx */
import {
  ThemeUIProvider,
  jsx,
  useThemeUI,
  ThemeUIStyleObject,
  merge
} from "theme-ui";
import { Global } from "@emotion/react";
import { theme as baseTheme } from "./theme.base";
import { CodeSurferTheme, CodeSurferStyles } from "./utils";
import React from "react";

const AnyThemeProvider = ThemeUIProvider as any;
const AnyGlobal = Global as any;

const nestedProviderFix = {
  // theme-ui v0.16+ wraps nested ThemeUIProvider children in a div that carries
  // CSS variables but has no explicit dimensions. That breaks the `height: 100%`
  // chain that Code Surfer relies on to fill its container, so we force the
  // wrapper to pass parent dimensions through.
  "[data-themeui-nested-provider]": {
    display: "contents"
  }
};

function StylesProvider({
  theme = {},
  children
}: {
  theme?: CodeSurferTheme;
  children: React.ReactNode;
}) {
  const outer = useThemeUI().theme || {};

  const merged = React.useMemo(
    () => merge.all({}, baseTheme, outer, theme),
    [outer, theme]
  );

  return (
    <AnyThemeProvider theme={merged}>
      <AnyGlobal styles={nestedProviderFix} />
      {children}
    </AnyThemeProvider>
  );
}

function useStyles(): CodeSurferStyles {
  const { theme } = useThemeUI();
  return (theme as any).styles.CodeSurfer;
}

function getClassFromTokenType(type: string) {
  return "token-" + type;
}

function usePreStyle() {
  const styles = useStyles();
  const preSx = React.useMemo(() => {
    const sx: Record<string, any> = {
      ...styles.pre
    };
    Object.keys(styles.tokens).forEach(key => {
      const classList = key
        .split(/\s/)
        .map(type => "." + getClassFromTokenType(type))
        .join(", ");
      sx[classList] = styles.tokens[key];
    });
    return sx;
  }, [styles]);
  return preSx;
}

const baseTitle: ThemeUIStyleObject = {
  position: "absolute" as "absolute",
  top: 0,
  width: "100%",
  margin: 0,
  padding: "1em 0",
  textAlign: "center"
};

const baseSubtitle: ThemeUIStyleObject = {
  position: "absolute" as "absolute",
  bottom: 0,
  width: "calc(100% - 2em)",
  boxSizing: "border-box" as "border-box",
  margin: "0.3em 1em",
  padding: "0.5em",
  background: "rgba(2,2,2,0.9)",
  textAlign: "center"
};

type HTMLProps<T> = React.DetailedHTMLProps<React.HTMLAttributes<T>, T>;

const Styled = {
  Placeholder: () => {
    return (
      <div
        sx={{
          height: "100%",
          width: "100%",
          backgroundColor: (useStyles().pre as any).backgroundColor as string
        }}
      />
    );
  },
  Code: (props: HTMLProps<HTMLElement>) => (
    <code {...props} sx={useStyles().code} />
  ),
  Pre: React.forwardRef(
    (props: HTMLProps<HTMLPreElement>, ref: React.Ref<HTMLPreElement>) => (
      <pre {...props} sx={usePreStyle()} ref={ref} />
    )
  ),
  Title: (props: HTMLProps<HTMLHeadingElement>) => (
    <h4 {...props} sx={{ ...baseTitle, ...useStyles().title }} />
  ),
  Subtitle: (props: HTMLProps<HTMLParagraphElement>) => (
    <p {...props} sx={{ ...baseSubtitle, ...useStyles().subtitle }} />
  )
};

function useUnfocusedStyle() {
  return useStyles().unfocused || { opacity: 0.3 };
}
export { StylesProvider, Styled, getClassFromTokenType, useUnfocusedStyle };
