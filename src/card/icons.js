/**
 * Icons used on the card, copied from Lucide (ISC, https://lucide.dev) by
 * scripts/build-icons.mjs. Do not edit by hand. Strokes stay strokes: SVG,
 * PDF, and PNG all render them.
 */
const f = (n) => Math.round(n * 1000) / 1000;

export const ICONS = {
  "generic": {
    "name": "stethoscope",
    "node": [
      [
        "path",
        {
          "d": "M11 2v2"
        }
      ],
      [
        "path",
        {
          "d": "M5 2v2"
        }
      ],
      [
        "path",
        {
          "d": "M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1"
        }
      ],
      [
        "path",
        {
          "d": "M8 15a6 6 0 0 0 12 0v-3"
        }
      ],
      [
        "circle",
        {
          "cx": "20",
          "cy": "10",
          "r": "2"
        }
      ]
    ],
    "box": [
      2,
      2,
      22,
      21
    ]
  },
  "condition": {
    "name": "stethoscope",
    "node": [
      [
        "path",
        {
          "d": "M11 2v2"
        }
      ],
      [
        "path",
        {
          "d": "M5 2v2"
        }
      ],
      [
        "path",
        {
          "d": "M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1"
        }
      ],
      [
        "path",
        {
          "d": "M8 15a6 6 0 0 0 12 0v-3"
        }
      ],
      [
        "circle",
        {
          "cx": "20",
          "cy": "10",
          "r": "2"
        }
      ]
    ],
    "box": [
      2,
      2,
      22,
      21
    ]
  },
  "do": {
    "name": "circle-check",
    "node": [
      [
        "circle",
        {
          "cx": "12",
          "cy": "12",
          "r": "10"
        }
      ],
      [
        "path",
        {
          "d": "m16 9-5.5 5.5L8 12"
        }
      ]
    ],
    "box": [
      2,
      2,
      22,
      22
    ]
  },
  "doNot": {
    "name": "ban",
    "node": [
      [
        "circle",
        {
          "cx": "12",
          "cy": "12",
          "r": "10"
        }
      ],
      [
        "path",
        {
          "d": "M4.929 4.929 19.07 19.071"
        }
      ]
    ],
    "box": [
      2,
      2,
      22,
      22
    ]
  },
  "doItem": {
    "name": "check",
    "node": [
      [
        "path",
        {
          "d": "M20 6 9 17l-5-5"
        }
      ]
    ],
    "box": [
      4,
      6,
      20,
      17
    ]
  },
  "doNotItem": {
    "name": "x",
    "node": [
      [
        "path",
        {
          "d": "M18 6 6 18"
        }
      ],
      [
        "path",
        {
          "d": "m6 6 12 12"
        }
      ]
    ],
    "box": [
      6,
      6,
      18,
      18
    ]
  },
  "carries": {
    "name": "backpack",
    "node": [
      [
        "path",
        {
          "d": "M4 10a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"
        }
      ],
      [
        "path",
        {
          "d": "M8 10h8"
        }
      ],
      [
        "path",
        {
          "d": "M8 18h8"
        }
      ],
      [
        "path",
        {
          "d": "M8 22v-6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v6"
        }
      ],
      [
        "path",
        {
          "d": "M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"
        }
      ]
    ],
    "box": [
      4,
      2,
      20,
      22
    ]
  },
  "medications": {
    "name": "pill",
    "node": [
      [
        "path",
        {
          "d": "m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"
        }
      ],
      [
        "path",
        {
          "d": "m8.5 8.5 7 7"
        }
      ]
    ],
    "box": [
      2.01,
      2.01,
      21.99,
      21.99
    ]
  },
  "allergies": {
    "name": "triangle-alert",
    "node": [
      [
        "path",
        {
          "d": "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"
        }
      ],
      [
        "path",
        {
          "d": "M12 9v4"
        }
      ],
      [
        "path",
        {
          "d": "M12 17h.01"
        }
      ]
    ],
    "box": [
      1.98,
      2.99,
      22,
      21
    ]
  },
  "contacts": {
    "name": "phone",
    "node": [
      [
        "path",
        {
          "d": "M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"
        }
      ]
    ],
    "box": [
      2,
      2,
      22,
      22
    ]
  },
  "hospital": {
    "name": "hospital",
    "node": [
      [
        "path",
        {
          "d": "M12 7v4"
        }
      ],
      [
        "path",
        {
          "d": "M14 21v-3a2 2 0 0 0-4 0v3"
        }
      ],
      [
        "path",
        {
          "d": "M14 9h-4"
        }
      ],
      [
        "path",
        {
          "d": "M18 11h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h2"
        }
      ],
      [
        "path",
        {
          "d": "M18 21V5a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16"
        }
      ]
    ],
    "box": [
      2,
      3,
      22,
      21
    ]
  },
  "emergency": {
    "name": "siren",
    "node": [
      [
        "path",
        {
          "d": "M7 18v-6a5 5 0 1 1 10 0v6"
        }
      ],
      [
        "path",
        {
          "d": "M5 21a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-1a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2z"
        }
      ],
      [
        "path",
        {
          "d": "M21 12h1"
        }
      ],
      [
        "path",
        {
          "d": "M18.5 4.5 18 5"
        }
      ],
      [
        "path",
        {
          "d": "M2 12h1"
        }
      ],
      [
        "path",
        {
          "d": "M12 2v1"
        }
      ],
      [
        "path",
        {
          "d": "m4.929 4.929.707.707"
        }
      ],
      [
        "path",
        {
          "d": "M12 12v6"
        }
      ]
    ],
    "box": [
      2,
      2,
      22,
      22
    ]
  },
  "otherConditions": {
    "name": "clipboard-list",
    "node": [
      [
        "rect",
        {
          "width": "8",
          "height": "4",
          "x": "8",
          "y": "2",
          "rx": "1",
          "ry": "1"
        }
      ],
      [
        "path",
        {
          "d": "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"
        }
      ],
      [
        "path",
        {
          "d": "M12 11h4"
        }
      ],
      [
        "path",
        {
          "d": "M12 16h4"
        }
      ],
      [
        "path",
        {
          "d": "M8 11h.01"
        }
      ],
      [
        "path",
        {
          "d": "M8 16h.01"
        }
      ]
    ],
    "box": [
      4,
      2,
      20,
      22
    ]
  },
  "address": {
    "name": "map-pin",
    "node": [
      [
        "path",
        {
          "d": "M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"
        }
      ],
      [
        "circle",
        {
          "cx": "12",
          "cy": "10",
          "r": "3"
        }
      ]
    ],
    "box": [
      4,
      2,
      20,
      22
    ]
  },
  "born": {
    "name": "calendar",
    "node": [
      [
        "path",
        {
          "d": "M8 2v3"
        }
      ],
      [
        "path",
        {
          "d": "M16 2v3"
        }
      ],
      [
        "rect",
        {
          "x": "3",
          "y": "3",
          "width": "18",
          "height": "18",
          "rx": "2"
        }
      ],
      [
        "path",
        {
          "d": "M3 9h18"
        }
      ]
    ],
    "box": [
      3,
      2,
      21,
      21
    ]
  },
  "blood": {
    "name": "droplet",
    "node": [
      [
        "path",
        {
          "d": "M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"
        }
      ]
    ],
    "box": [
      5,
      3,
      19,
      22
    ]
  }
};

/**
 * A Lucide icon as an SVG group scaled to `size` mm, with the visible
 * shape (not the 24-unit box) centred in the square at (x, y).
 */
export function iconMarkup(key, x, y, size, colour) {
  const icon = ICONS[key] ?? ICONS.generic;
  const k = size / 24;
  const [bx0, by0, bx1, by1] = icon.box;
  const tx = x + size / 2 - (k * (bx0 + bx1)) / 2;
  const ty = y + size / 2 - (k * (by0 + by1)) / 2;
  const inner = icon.node
    .map(([tag, attrs]) => `<${tag} ${Object.entries(attrs).map(([a, v]) => `${a}="${v}"`).join(' ')}/>`)
    .join('');
  return (
    `<g transform="translate(${f(tx)} ${f(ty)}) scale(${f(k)})" fill="none" stroke="${colour}" ` +
    `stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</g>`
  );
}

/** An icon given as data ({ node, box }), for icons the user picked. */
export function inlineIconMarkup(icon, x, y, size, colour) {
  const k = size / 24;
  const [bx0, by0, bx1, by1] = icon.box ?? [0, 0, 24, 24];
  const tx = x + size / 2 - (k * (bx0 + bx1)) / 2;
  const ty = y + size / 2 - (k * (by0 + by1)) / 2;
  const inner = icon.node
    .map(([tag, attrs]) => `<${tag} ${Object.entries(attrs).map(([a, v]) => `${a}="${v}"`).join(' ')}/>`)
    .join('');
  return (
    `<g transform="translate(${f(tx)} ${f(ty)}) scale(${f(k)})" fill="none" stroke="${colour}" ` +
    `stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</g>`
  );
}

export function genericIcon(x, y, size, colour) {
  return iconMarkup('generic', x, y, size, colour);
}
