// Parameter check for the saddle-height widget: it takes no parameters.
export function validate(params) {
  const p = params && typeof params === 'object' ? params : {};
  return Object.keys(p).map((key) => `unknown parameter "${key}" (this widget takes no parameters)`);
}
