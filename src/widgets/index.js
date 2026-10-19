// Widget registry (docs/spec.md section 6): {[type]: {render, validate, client}}.
// Each widget lives in src/widgets/<type>/ with render.js, schema.js and an optional client.js;
// register it here by importing render and validate and setting client: true when client.js exists.
//
// import { render as washerPanel } from './washer-panel/render.js';
// import { validate as washerPanelSchema } from './washer-panel/schema.js';
// 'washer-panel': { render: washerPanel, validate: washerPanelSchema, client: true },

export const widgets = {};

export default widgets;
