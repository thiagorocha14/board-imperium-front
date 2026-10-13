import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

/*
 * Scales produced by the PrimeNG palette algorithm, anchored on the brand
 * tokens: primary on green (#024C00) and surface on off-white (#FFF7E9).
 * Intermediate steps are tints toward white and shades toward black.
 */
const green = {
  50: '#f2f6f2',
  100: '#c2d4c2',
  200: '#92b291',
  300: '#629061',
  400: '#326e30',
  500: '#024c00',
  600: '#024100',
  700: '#013500',
  800: '#012a00',
  900: '#011e00',
  950: '#011300',
} as const;

const offWhite = {
  0: '#fff7e9',
  50: '#fffffe',
  100: '#fffdfa',
  200: '#fffcf6',
  300: '#fffaf1',
  400: '#fff9ed',
  500: '#fff7e9',
  600: '#d9d2c6',
  700: '#b3ada3',
  800: '#8c8880',
  900: '#66635d',
  950: '#403e3a',
} as const;

export const retroPreset = definePreset(Aura, {
  semantic: {
    primary: green,
    formField: {
      background: '#fff7e9',
      color: '#14110f',
      borderColor: '#14110f',
      hoverBorderColor: '#013a00',
      focusBorderColor: '#013a00',
      invalidBorderColor: '#e63b2e',
      placeholderColor: '#66635d',
      borderRadius: '0.65rem',
      paddingX: '0.75rem',
      paddingY: '0.55rem',
      shadow: 'none',
      focusRing: {
        width: '3px',
        style: 'solid',
        color: '#14110f',
        offset: '2px',
        shadow: 'none',
      },
    },
    colorScheme: {
      light: {
        surface: offWhite,
      },
    },
  },
});
