// Widget registry (docs/spec.md sections 6 and 11.3): {[type]: {render, validate, client}}.
// Each widget lives in src/widgets/<type>/ with render.js, schema.js and an optional client.js;
// register it here by importing render and validate and setting client: true when client.js exists.
// The build copies every browser module of a widget (all .js files except render.js and schema.js).
import { render as wifiQr } from './wifi-qr/render.js';
import { validate as wifiQrSchema } from './wifi-qr/schema.js';
import { render as saddleHeight } from './saddle-height/render.js';
import { validate as saddleHeightSchema } from './saddle-height/schema.js';
import { render as reminder } from './reminder/render.js';
import { validate as reminderSchema } from './reminder/schema.js';

export const widgets = {
  'wifi-qr': { render: wifiQr, validate: wifiQrSchema, client: true },
  'saddle-height': { render: saddleHeight, validate: saddleHeightSchema, client: true },
  reminder: { render: reminder, validate: reminderSchema, client: true }
};

export default widgets;
