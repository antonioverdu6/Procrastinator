// Tipado TypeScript de tokens de estilo estructurados por objeto

export interface DesignColors {
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

export interface DesignStyles {
  layout: {
    container: string;
    main: string;
    header: string;
  };
  props: {
    border: {
      none: string;
      subtle: string;
      strong: string;
      active: string;
    };
    padding: {
      none: string;
      sm: string;
      md: string;
      lg: string;
    };
    gap: {
      none: string;
      xs: string;
      sm: string;
      md: string;
      lg: string;
    };
    direction: {
      row: string;
      col: string;
    };
    align: {
      start: string;
      center: string;
      end: string;
    };
    justify: {
      start: string;
      center: string;
      end: string;
      between: string;
    };
    shadow: {
      none: string;
      no: string;
      soft: string;
      yes: string;
    };
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
    panel: string;
    modalOverlay: string;
    modalCard: string;
    chatContainer: string;
    chatMessages: string;
    chatInputBar: string;
    epicSection: string;
    epicHeader: string;
    subtaskRow: string;
    proposalCard: string;
  };
  card: {
    base: string;
    interactive: string;
    selected: string;
    subtle: string;
    panel: string;
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

export declare const colors: DesignColors;
export declare const styles: DesignStyles;
