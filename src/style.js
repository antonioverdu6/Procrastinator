// Definición central de tokens de diseño y estilos estructurados por objetos

export const colors = {
  // Fondos
  bg: {
    canvas: '#F8FAFC',      // Gris neutro ultra suave para el lienzo
    card: '#FFFFFF',        // Blanco puro para tarjetas y modales
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

  // Tarjetas y Paneles
  card: {
    base: 'bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)] transition-all',
    interactive: 'bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:border-[#CBD5E1] hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-all',
    subtle: 'bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4',
  },

  // Botones
  button: {
    primary: 'inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed',
    secondary: 'inline-flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-[#F1F5F9] text-[#334155] border border-[#E2E8F0] rounded-lg text-sm font-medium transition-colors shadow-sm',
    ghost: 'inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] rounded-lg text-sm font-medium transition-colors',
    success: 'inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#16A34A] hover:bg-[#15803D] text-white rounded-lg text-sm font-medium transition-colors shadow-sm',
    danger: 'inline-flex items-center justify-center gap-2 px-3 py-1.5 bg-white hover:bg-[#FEE2E2] text-[#DC2626] border border-[#E2E8F0] hover:border-[#FCA5A5] rounded-lg text-sm font-medium transition-colors',
    tabActive: 'bg-[#2563EB] text-white font-medium text-xs px-3.5 py-1.5 rounded-lg shadow-sm',
    tabInactive: 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] font-medium text-xs px-3.5 py-1.5 rounded-lg transition-colors',
  },

  // Inputs y Selects
  input: {
    base: 'w-full bg-white border border-[#E2E8F0] rounded-lg px-3.5 py-2 text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors',
    select: 'w-full bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm text-[#0F172A] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors',
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
