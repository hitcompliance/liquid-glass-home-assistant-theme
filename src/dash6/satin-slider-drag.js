// Satin separates the temporary thumb position from the committed setting.
// Keyboard changes keep native range semantics. Cancellation never sends a command.
export function bindSatinSlider(input, output, unit, commit, preview, owner) {
  let dragging = false, initial = input.value, frame = 0, canceled = false;
  const satin = () => getComputedStyle(input).getPropertyValue('--dash6-satin-enabled').trim() === '1';
  const label = () => { output.textContent = `${input.value}${unit}`; input.setAttribute('aria-valuetext', output.textContent); };
  const releaseOwner = () => { if (owner) owner._dragging = false; };
  const cleanWindow = () => { window.removeEventListener('pointerup', up, true); window.removeEventListener('pointercancel', cancel, true); };
  const finish = () => {
    frame = 0;
    if (!dragging) return;
    dragging = false; cleanWindow(); input.removeAttribute('data-satin-dragging'); releaseOwner();
    const changed = input.value !== initial;
    label();
    if (changed && !canceled && input.isConnected) commit(Number(input.value));
    else if (owner?.isConnected !== false) owner?.render?.();
  };
  const up = event => {
    if (!dragging || event.pointerId !== input._satinPointer) return;
    // Wait for the range's own pointerup/change default action before one commit.
    if (!frame) frame = requestAnimationFrame(finish);
  };
  const cancel = event => {
    if (!dragging || event?.pointerId !== undefined && event.pointerId !== input._satinPointer) return;
    canceled = true; input.value = initial;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    if (frame) cancelAnimationFrame(frame);
    finish();
  };
  input.addEventListener('pointerdown', event => {
    if (!satin() || input.disabled || event.button !== 0 || dragging) return;
    dragging = true; canceled = false; initial = input.value; input._satinPointer = event.pointerId;
    input.setAttribute('data-satin-dragging', ''); if (owner) owner._dragging = true;
    window.addEventListener('pointerup', up, true); window.addEventListener('pointercancel', cancel, true);
  });
  input.addEventListener('input', () => { if (!dragging) { canceled = false; label(); preview?.(Number(input.value)); } });
  input.addEventListener('change', () => { if (!dragging && !canceled) commit(Number(input.value)); });
  input.addEventListener('blur', () => { if (dragging) cancel(); canceled = false; });
  return { cancel: () => cancel(), get dragging() { return dragging; } };
}
