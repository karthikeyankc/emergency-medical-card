/**
 * Ken Design System's dropdown, with the behaviour it leaves to the page:
 * open and close from the trigger, close on Escape or a click outside, and
 * arrow keys between the menu's items.
 *
 * @param {HTMLElement} trigger the button that opens the menu
 * @param {HTMLElement} menu the `.dropdown-menu`
 * @param {{ blocked?: () => boolean, onBlocked?: () => void }} [options]
 *   `blocked` stops the menu opening, and `onBlocked` runs instead
 */
export function dropdown(trigger, menu, { blocked = () => false, onBlocked } = {}) {
  const items = () => [...menu.querySelectorAll('[role="menuitem"]:not(:disabled), [role="menuitemradio"] input:checked, select, input:not([type="radio"]):not([type="file"]), .swatch input:checked')];

  function open() {
    menu.classList.add('open');
    trigger.setAttribute('aria-expanded', 'true');
    items()[0]?.focus();
  }
  function close(returnFocus = false) {
    if (!menu.classList.contains('open')) return;
    menu.classList.remove('open');
    trigger.setAttribute('aria-expanded', 'false');
    if (returnFocus) trigger.focus();
  }
  trigger.addEventListener('click', () => {
    if (blocked()) return onBlocked?.();
    menu.classList.contains('open') ? close() : open();
  });
  menu.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') return close(true);
    // Radio buttons move with the arrow keys on their own.
    if (e.target.type === 'radio') return;
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const list = items();
    const at = list.indexOf(document.activeElement);
    list[(at + (e.key === 'ArrowDown' ? 1 : -1) + list.length) % list.length]?.focus();
  });
  // A menu closes once something in it is picked. A panel of settings stays open until the person clicks away.
  if (menu.getAttribute('role') === 'menu') {
    menu.addEventListener('click', (e) => {
      // Picking the option already chosen closes the menu too, though nothing changes.
      if (e.target.closest('button[role="menuitem"], [role="menuitemradio"]')) close(true);
    });
    menu.addEventListener('change', () => close(true));
  }
  document.addEventListener('click', (e) => {
    if (!trigger.parentElement.contains(e.target)) close();
  });
  return { open, close };
}

/** Every menu in the bar that has no behaviour of its own: triggers carry `data-menu` with the menu's id. */
export function initMenus(root) {
  for (const trigger of root.querySelectorAll('[data-menu]')) dropdown(trigger, root.querySelector(`#${trigger.dataset.menu}`));
}
