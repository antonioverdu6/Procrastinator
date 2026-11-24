// Definición central de tokens de diseño y estilos estructurados por objetos (100% plano, sin sombras)

export const colors = {
  // Fondos
  bg: {
    canvas: '#F8FAFC',      // Gris neutro ultra suave para el lienzo
    card: '#FFFFFF',        // Blanco puro para tarjetas y formularios
    muted: '#F1F5F9',       // Fondo de inputs o áreas de apoyo
    highlight: '#EFF6FF',   // Azul tenue para elementos activos
  },

  // Bordes
  border: {
    subtle: '#E2E8F0',
    strong: '#CBD5E1',
    focus: '#2563EB',
  },

  // Tipografía
  text: {
    title: '#0F172A',       // Casi negro (alta legibilidad)
    body: '#334155',        // Gris pizarra principal
    muted: '#64748B',       // Gris secundario
    light: '#94A3B8',       // Placeholders o fechas sutiles
    inverse: '#FFFFFF',
  },

  // Estados & Accentos
  accent: {
    primary: '#2563EB',      // Azul puro profesional
    primaryHover: '#1D4ED8',
    primaryLight: '#DBEAFE',
    success: '#16A34A',      // Verde sobrio
    successLight: '#DCFCE7',
    warning: '#D97706',      // Ámbar discreto
    warningLight: '#FEF3C7',
    danger: '#DC2626',       // Rojo funcional
    dangerLight: '#FEE2E2',
    slate: '#475569',
  }
};

export const styles = {
  // Layout general
  layout: {
    container: 'min-h-screen bg-[#F8FAFC] text-[#334155] font-sans antialiased',
    main: 'max-w-6xl mx-auto px-6 py-8 space-y-6',
    header: 'bg-white border-b border-[#E2E8F0] sticky top-0 z-30 px-6 py-3',
  },

  // Propiedades atómicas de layout
  props: {
    border: {
      none: 'border-0',
      subtle: 'border border-[#E2E8F0]',
      strong: 'border border-[#CBD5E1]',
      active: 'border border-[#2563EB]',
    },
    padding: {
      none: '',
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6',
    },
    gap: {
      none: '',
      xs: 'gap-1',
      sm: 'gap-2',
      md: 'gap-3',
      lg: 'gap-4',
    },
    direction: {
      row: 'flex flex-row',
      col: 'flex flex-col',
    },
    align: {
      start: 'items-start',
      center: 'items-center',
      end: 'items-end',
    },
    justify: {
      start: 'justify-start',
      center: 'justify-center',
      end: 'justify-end',
      between: 'justify-between',
    },
    shadow: {
      none: 'shadow-none',
      no: 'shadow-none',
      soft: 'shadow-none',
      yes: 'shadow-none',
    },
  },

  // Variantes estructurales de ProcrastinatorBox
  box: {
    page: 'space-y-6',
    header: 'flex flex-col sm:flex-row sm:items-center justify-between gap-4',
    row: 'flex items-center gap-2',
    rowWrap: 'flex items-center gap-2 flex-wrap',
    rowBetween: 'flex items-center justify-between gap-3',
    rowEnd: 'flex items-center justify-end gap-2',
    stack: 'flex flex-col gap-3',
    stackSm: 'flex flex-col gap-1',
    grid2: 'grid grid-cols-1 md:grid-cols-2 gap-4',
    grid3: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4',
    grid4: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4',
    list: 'divide-y divide-[#F1F5F9]',
    listItem: 'py-3 px-3 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#F8FAFC] transition-colors',
    listItemActive: 'py-3 px-3 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#EFF6FF] border border-[#BFDBFE] transition-colors',
    panel: 'bg-white border border-[#CBD5E1] rounded-xl p-6 space-y-4',
    modalOverlay: 'fixed inset-0 bg-slate-900/10 z-50 flex items-center justify-center p-4',
    modalCard: 'w-full max-w-lg bg-white border border-[#CBD5E1] rounded-xl p-6 max-h-[90vh] overflow-y-auto space-y-4',
    chatContainer: 'bg-white border border-[#E2E8F0] rounded-xl flex flex-col h-[calc(100vh-140px)] p-0 overflow-hidden',
    chatMessages: 'flex-1 overflow-y-auto p-4 space-y-3 bg-[#F8FAFC]',
    chatInputBar: 'p-3 bg-white border-t border-[#E2E8F0] flex gap-2',
    epicSection: 'border border-[#E2E8F0] rounded-xl bg-white overflow-hidden',
    epicHeader: 'px-4 py-2.5 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between gap-2',
    subtaskRow: 'flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#334155]',
    proposalCard: 'mt-3 border border-[#CBD5E1] rounded-xl bg-[#F8FAFC] p-3.5 space-y-3',
  },

  // Tarjetas y Paneles (Estética plana nítida en blanco puro)
  card: {
    base: 'bg-white border border-[#E2E8F0] rounded-xl p-6 transition-all',
    interactive: 'bg-white border border-[#E2E8F0] rounded-xl p-5 hover:border-[#CBD5E1] transition-all cursor-pointer',
    selected: 'bg-white border-[#2563EB] rounded-xl p-5 transition-all cursor-pointer',
    subtle: 'bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4',
    panel: 'bg-white border border-[#CBD5E1] rounded-xl p-6 space-y-4',
  },

  // Botones (Estilo plano y moderno)
  button: {
    primary: 'inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
    secondary: 'inline-flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-[#F1F5F9] text-[#334155] border border-[#E2E8F0] rounded-lg text-sm font-medium transition-colors',
    ghost: 'inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] rounded-lg text-sm font-medium transition-colors',
    success: 'inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#16A34A] hover:bg-[#15803D] text-white rounded-lg text-sm font-medium transition-colors',
    danger: 'inline-flex items-center justify-center gap-2 px-3 py-1.5 bg-white hover:bg-[#FEE2E2] text-[#DC2626] border border-[#E2E8F0] hover:border-[#FCA5A5] rounded-lg text-sm font-medium transition-colors',
    tabActive: 'bg-[#2563EB] text-white font-medium text-xs px-3.5 py-1.5 rounded-lg',
    tabInactive: 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] font-medium text-xs px-3.5 py-1.5 rounded-lg transition-colors',
  },

  // Inputs y Selects (Sin rings ni sombras, solo cambio de borde limpio)
  input: {
    base: 'w-full bg-white border border-[#E2E8F0] rounded-lg px-3.5 py-2 text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB] transition-colors',
    select: 'w-full bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm text-[#0F172A] focus:outline-none focus:border-[#2563EB] transition-colors',
    label: 'block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wider',
  },

  // Badges y Etiquetas
  badge: {
    primary: 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-[#EFF6FF] text-[#2563EB] border border-[#DBEAFE]',
    success: 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-[#DCFCE7] text-[#16A34A] border border-[#BBF7D0]',
    warning: 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]',
    danger: 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA]',
    neutral: 'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]',
  },

  // Tipografía modular
  typography: {
    h1: 'text-2xl font-bold tracking-tight text-[#0F172A]',
    h2: 'text-xl font-bold tracking-tight text-[#0F172A]',
    h3: 'text-base font-semibold text-[#0F172A]',
    body: 'text-sm text-[#334155]',
    caption: 'text-xs text-[#64748B]',
  }
};
