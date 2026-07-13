const directionButtons = Array.from(document.querySelectorAll('[data-direction-button]'));
const directions = Array.from(document.querySelectorAll('[data-direction]'));
const ownerButtons = Array.from(document.querySelectorAll('[data-owner-choice]'));
const ownerStatus = document.querySelector('#owner-choice-status');

function setDirection(direction) {
  directionButtons.forEach((button) => {
    const active = button.dataset.directionButton === direction;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });

  directions.forEach((section) => {
    const active = section.dataset.direction === direction;
    section.classList.toggle('is-active', active);
    section.hidden = !active;
  });

  const activeHeading = document.querySelector(`[data-direction="${direction}"] h2`);
  if (activeHeading) activeHeading.focus?.({ preventScroll: true });
  history.replaceState(null, '', `#direction-${direction}`);
}

directionButtons.forEach((button) => {
  button.addEventListener('click', () => setDirection(button.dataset.directionButton));
});

document.querySelectorAll('.phone button').forEach((button) => {
  button.addEventListener('click', () => {
    const group = button.closest('.service-grid, .segment-row, .time-grid, .date-strip, .compact-services, .duration-scale, .duration-list, .issue-list, .editorial-services');
    if (!group) return;

    group.querySelectorAll('button').forEach((option) => {
      const selected = option === button;
      option.classList.toggle('is-selected', selected);
      option.setAttribute('aria-pressed', String(selected));
    });
  });
});

function restoreOwnerChoice() {
  const choice = localStorage.getItem('zoot-prototype-owner-choice');
  if (!choice) return;

  ownerButtons.forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.ownerChoice === choice));
  });
  ownerStatus.textContent = `Local review choice: ${choice}. Figma owner approval is still required.`;
}

ownerButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const choice = button.dataset.ownerChoice;
    localStorage.setItem('zoot-prototype-owner-choice', choice);
    ownerButtons.forEach((option) => {
      option.setAttribute('aria-pressed', String(option === button));
    });
    ownerStatus.textContent = `Local review choice: ${choice}. Figma owner approval is still required.`;
  });
});

const requestedDirection = location.hash.match(/^#direction-([abc])$/)?.[1] ?? 'a';
setDirection(requestedDirection);
restoreOwnerChoice();
