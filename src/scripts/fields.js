/**
 * Field ids the renderer reports (overflow, missing glyphs, required fields),
 * their names in the editor, and the input each one points at.
 */
import ui from '../data/i18n/ui/en.json';

const NAMES = { qr: 'qrField', contactPhone: 'contactPhoneRequired', emergency: 'emergencyGeneral' };

/** The field's name as the form labels it. */
export function fieldName(id) {
  return ui.fields[NAMES[id] ?? id] ?? id;
}

const TARGETS = {
  name: '[data-bind="person.name.en"]',
  birthYear: '#birthYear',
  condition: '[data-bind="conditions.0.name.en"]',
  do: '[data-bind="do.en"]',
  doNot: '[data-bind="doNot.en"]',
  contactPhone: '[data-bind$=".phone"]',
  emergency: '#emergency-general',
};

/** Scroll to a field's input and put the cursor in it. */
export function focusField(id, root = document) {
  const el = root.querySelector(TARGETS[id] ?? `[data-bind^="${id}"]`);
  if (!el) return;
  el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
  el.focus({ preventScroll: true });
}
