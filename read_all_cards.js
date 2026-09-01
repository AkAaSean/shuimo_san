import fs from 'fs';
import jpeg from 'jpeg-js';

const buf = fs.readFileSync('public/assets/weapon.jpg');
const rawData = jpeg.decode(buf, { useTArray: true });
const W = rawData.width;
const H = rawData.height;

// Let's inspect all non-red cards in weapon.jpg!
// Let's list all candidate cards in order:
// For each row (0..6), what are all the weapon/item locations and what text is on each?

// Let's create an HTML file with all the cards and all candidate names, but let's also write a script
// that renders each card with high contrast so we can read every single character clearly!

const cards = [
  // Row 0:
  { r: 0, c: 0, label: "R0 C0" },
  { r: 0, c: 2, label: "R0 C2" },
  { r: 0, c: 4, label: "R0 C4" },
  { r: 0, c: 'wide', x: 512, label: "R0 Wide" },
  { r: 0, c: 7, label: "R0 C7" },
  { r: 0, c: 9, label: "R0 C9" },
  { r: 0, c: 11, label: "R0 C11" },

  // Row 1:
  { r: 1, c: 0, label: "R1 C0" },
  { r: 1, c: 2, label: "R1 C2" },
  { r: 1, c: 4, label: "R1 C4" },
  { r: 1, c: 'wide', x: 513, label: "R1 Wide" },
  { r: 1, c: 7, label: "R1 C7" },
  { r: 1, c: 9, label: "R1 C9" },
  { r: 1, c: 11, label: "R1 C11" },

  // Row 2:
  { r: 2, c: 0, label: "R2 C0" },
  { r: 2, c: 2, label: "R2 C2" },
  { r: 2, c: 4, label: "R2 C4" },
  { r: 2, c: 'wide', x: 513, label: "R2 Wide" },
  { r: 2, c: 7, label: "R2 C7" },
  { r: 2, c: 9, label: "R2 C9" },
  { r: 2, c: 11, label: "R2 C11" },

  // Row 3:
  { r: 3, c: 0, label: "R3 C0" },
  { r: 3, c: 1, label: "R3 C1" },
  { r: 3, c: 2, label: "R3 C2" },
  { r: 3, c: 4, label: "R3 C4" },
  { r: 3, c: 'wide', x: 513, label: "R3 Wide" },
  { r: 3, c: 7, label: "R3 C7" },
  { r: 3, c: 9, label: "R3 C9" },
  { r: 3, c: 11, label: "R3 C11" },

  // Row 4: (12 cards)
  ...[0,1,2,3,4,5,6,7,8,9,10,11].map(c => ({ r: 4, c, label: `R4 C${c}` })),

  // Row 5: (12 cards)
  ...[0,1,2,3,4,5,6,7,8,9,10,11].map(c => ({ r: 5, c, label: `R5 C${c}` })),

  // Row 6: (4 cards)
  ...[0,1,2,3].map(c => ({ r: 6, c, label: `R6 C${c}` })),
];

console.log('Total cards identified in spritesheet:', cards.length);
