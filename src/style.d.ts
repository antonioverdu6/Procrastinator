export interface ColorTokens {
  bg: {
    canvas: string;
    card: string;
    muted: string;
    highlight: string;
  };
  border: {
    subtle: string;
    strong: string;
    focus: string;
  };
  text: {
    title: string;
    body: string;
    muted: string;
    light: string;
    inverse: string;
  };
  accent: {
    primary: string;
    primaryHover: string;
    primaryLight: string;
    success: string;
    successLight: string;
    warning: string;
    warningLight: string;
    danger: string;
    dangerLight: string;
    slate: string;
  };
}

export interface StyleTokens {
  layout: {
    container: string;
    main: string;
    header: string;
  };
  box: {
    page: string;
    header: string;
    row: string;
    rowWrap: string;
    rowBetween: string;
    rowEnd: string;
    stack: string;
    stackSm: string;
    grid2: string;
    grid3: string;
    grid4: string;
    list: string;
    listItem: string;
    listItemActive: string;
    modalOverlay: string;
    modalCard: string;
    modalCardWide: string;
    modalCardSm: string;
    chatContainer: string;
    chatMessages: string;
    chatInputBar: string;
  };
  card: {
    base: string;
    interactive: string;
    selected: string;
    subtle: string;
  };
  button: {
    primary: string;
    secondary: string;
    ghost: string;
    success: string;
    danger: string;
    tabActive: string;
    tabInactive: string;
  };
  input: {
    base: string;
    select: string;
    label: string;
  };
  badge: {
    primary: string;
    success: string;
    warning: string;
    danger: string;
    neutral: string;
  };
  typography: {
    h1: string;
    h2: string;
    h3: string;
    body: string;
    caption: string;
  };
}

export const colors: ColorTokens;
export const styles: StyleTokens;
