// src/context/palette.js
// Lets any button open the command bar without importing the component.

export const OPEN_PALETTE_EVENT = 'habitflow:palette';

export const openPalette = () => window.dispatchEvent(new Event(OPEN_PALETTE_EVENT));
