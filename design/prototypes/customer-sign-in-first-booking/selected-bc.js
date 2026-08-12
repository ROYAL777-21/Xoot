const state = {
  step: 0,
  service: 'Home clean',
  duration: '3 hours',
  homeSize: '2 bed / 1 bath',
  day: 'Thu 16 Jul',
  time: '10:00',
  email: 'nkosi@example.com',
  linkSent: false,
};

const screen = document.querySelector('#prototype-screen');
const stepLabel = document.querySelector('#step-label');
const progressValue = document.querySelector('#progress-value');
const reviewStepButtons = Array.from(document.querySelectorAll('[data-jump]'));
const toast = document.querySelector('#prototype-toast');
const backdrop = document.querySelector('#concierge-backdrop');
const conciergeResponse = document.querySelector('#concierge-response');
const appShell = document.querySelector('.app-shell');
const conciergeLauncher = document.querySelector('.concierge-launcher');

const screenTemplates = [
  () => `
    <div class="screen-enter">
      <p class="screen-eyebrow">Ready when you are</p>
      <h2 class="screen-title">What needs cleaning</h2>
      <p class="screen-lede">Start with one choice and shape the visit next</p>

      <div class="repeat-strip">
        <div><span>From your last clean</span><strong>Home clean / 3 hours / Rosebank</strong></div>
        <button type="button" data-notice="Rebooking keeps the same details for review">Rebook</button>
      </div>

      <div class="service-list" role="group" aria-label="Choose a service">
        ${serviceOption('Home clean', 'Everyday home care', '#087a4b')}
        ${serviceOption('Deep clean', 'More time for built-up detail', '#f16f5b')}
        ${serviceOption('Office', 'A focused workplace clean', '#315be8')}
        ${serviceOption('Turnover', 'Ready for the next arrival', '#f7c948')}
      </div>

      <button class="primary-button" type="button" data-next>Continue with ${state.service.toLowerCase()}</button>
      <button class="text-button" type="button" data-open-concierge>Not sure what to choose</button>
    </div>`,
  () => `
    <div class="screen-enter">
      <p class="screen-eyebrow">${state.service}</p>
      <h2 class="screen-title">Shape the visit</h2>
      <p class="screen-lede">A clear scope now means fewer questions on the day</p>

      <span class="section-label">How long</span>
      <div class="segment-control" role="group" aria-label="Choose duration">
        ${segmentOption('2 hours', '2 hr', state.duration)}
        ${segmentOption('3 hours', '3 hr', state.duration)}
        ${segmentOption('4 hours', '4 hr', state.duration)}
      </div>

      <span class="section-label">Home size</span>
      <div class="choice-list" role="group" aria-label="Choose home size">
        ${choiceOption('1 bed / 1 bath', 'Compact home', state.homeSize)}
        ${choiceOption('2 bed / 1 bath', 'Most selected', state.homeSize)}
        ${choiceOption('3 bed / 2 bath', 'More rooms to cover', state.homeSize)}
      </div>

      <div class="context-note"><strong>Why ${state.duration.toLowerCase()}</strong><span>Based on the selected scope, never a promise of completion</span></div>
      <button class="primary-button" type="button" data-next>Choose a time</button>
      <button class="text-button" type="button" data-back>Back</button>
    </div>`,
  () => `
    <div class="screen-enter">
      <p class="screen-eyebrow">Live availability</p>
      <h2 class="screen-title">When should Zoot arrive</h2>
      <p class="screen-lede">Availability is checked again before confirmation</p>

      <div class="address-band">
        <div><strong>Home</strong><small>Rosebank, Johannesburg</small></div>
        <button type="button" data-notice="Address editing opens the approved secure address flow">Change</button>
      </div>

      <span class="section-label">Date</span>
      <div class="date-control" role="group" aria-label="Choose a date">
        ${dateOption('Wed 15 Jul', 'Wed', '15')}
        ${dateOption('Thu 16 Jul', 'Thu', '16')}
        ${dateOption('Fri 17 Jul', 'Fri', '17')}
      </div>

      <span class="section-label">Available starts</span>
      <div class="time-control" role="group" aria-label="Choose a start time">
        ${timeOption('08:00')}${timeOption('10:00')}${timeOption('13:00')}
      </div>

      <div class="context-note"><strong>${state.time} is available now</strong><span>Checked again before booking confirmation</span></div>
      <button class="primary-button" type="button" data-next>Use ${state.day} at ${state.time}</button>
      <button class="text-button" type="button" data-back>Back</button>
    </div>`,
  () => `
    <div class="screen-enter">
      <p class="screen-eyebrow">Draft protected</p>
      <h2 class="screen-title">Sign in without losing your place</h2>
      <p class="screen-lede">Your clean stays ready while a secure link verifies your email</p>

      <div class="trust-list">
        <div class="trust-item"><strong>Your choices stay here</strong><span>Return to this same step after verification</span></div>
        <div class="trust-item"><strong>No booking yet</strong><span>Nothing is created before your final review</span></div>
        <div class="trust-item"><strong>No password required</strong><span>Use the secure link on this device</span></div>
      </div>

      <label class="field-label" for="prototype-email">Email address</label>
      <input class="email-input" id="prototype-email" type="email" autocomplete="email" value="${state.email}" />
      ${state.linkSent ? '<div class="sent-state"><strong>Secure link sent</strong><span>Open it on this device to return here</span></div><button class="primary-button blue" type="button" data-next>Preview verified return</button>' : '<button class="primary-button blue" type="button" data-send-link>Email my secure link</button>'}
      <button class="text-button" type="button" data-back>Back</button>
    </div>`,
  () => `
    <div class="screen-enter">
      <p class="screen-eyebrow">Final review</p>
      <h2 class="screen-title">Clear details before commitment</h2>
      <p class="screen-lede">Check the plan once before opening secure payment</p>

      <div class="booking-summary">
        ${summaryRow('Service', `${state.service} / ${state.duration}`)}
        ${summaryRow('When', `${state.day} / ${state.time}`)}
        ${summaryRow('Area', 'Rosebank')}
        ${summaryRow('Repeat', 'Once off')}
        ${summaryRow('Payment', 'Not started')}
      </div>

      <div class="payment-note"><strong>Payment boundary</strong><span>The approved provider shows the final amount and Zoot waits for server confirmation before showing success</span></div>
      <button class="primary-button" type="button" data-payment>Open secure payment</button>
      <button class="secondary-button" type="button" data-back>Change booking</button>
    </div>`,
  () => `
    <div class="screen-enter">
      <p class="screen-eyebrow">Verified booking state</p>
      <h2 class="screen-title">Zoot is matching your booking</h2>
      <p class="screen-lede">This status appears only after verified backend confirmation</p>

      <div class="status-note"><strong>Awaiting assignment</strong><span>${state.day} / ${state.time}</span></div>
      <ol class="status-timeline">
        <li class="done"><strong>Payment confirmed</strong><span>Complete</span></li>
        <li class="current"><strong>Finding your Zooter</strong><span>Now</span></li>
        <li><strong>Assigned</strong><span>Next</span></li>
      </ol>

      <div class="context-note"><strong>Preferred Zooter</strong><span>Thandi M is requested when available, never guaranteed</span></div>
      <button class="primary-button" type="button" data-notice="Booking details stay inside the authenticated Zoot app">View booking details</button>
      <button class="secondary-button" type="button" data-open-concierge>Get help</button>
    </div>`,
];

function serviceOption(name, description, color) {
  const selected = state.service === name;
  return `<button class="service-option" type="button" data-service="${name}" aria-pressed="${selected}">
    <span class="service-swatch" style="--service-color:${color}"></span>
    <span class="service-text"><strong>${name}</strong><span>${description}</span></span>
    <span class="radio-mark" aria-hidden="true"></span>
  </button>`;
}

function choiceOption(value, description, selectedValue) {
  const selected = value === selectedValue;
  return `<button class="choice-option" type="button" data-home-size="${value}" aria-pressed="${selected}">
    <span class="service-swatch" style="--service-color:${selected ? '#315be8' : '#c7d2cc'}"></span>
    <span class="choice-text"><strong>${value}</strong><span>${description}</span></span>
    <span class="radio-mark" aria-hidden="true"></span>
  </button>`;
}

function segmentOption(value, label, selectedValue) {
  return `<button type="button" data-duration="${value}" aria-pressed="${value === selectedValue}">${label}</button>`;
}

function dateOption(value, day, date) {
  return `<button type="button" data-day="${value}" aria-pressed="${value === state.day}"><small>${day}</small>${date}</button>`;
}

function timeOption(value) {
  return `<button type="button" data-time="${value}" aria-pressed="${value === state.time}">${value}</button>`;
}

function summaryRow(label, value) {
  return `<div class="summary-row"><span>${label}</span><strong>${value}</strong></div>`;
}

function render() {
  screen.innerHTML = screenTemplates[state.step]();
  screen.scrollTop = 0;
  stepLabel.textContent = state.step < 5 ? `Step ${state.step + 1} of 5` : 'Booking status';
  progressValue.style.width = state.step < 5 ? `${(state.step + 1) * 20}%` : '100%';

  reviewStepButtons.forEach((button) => {
    button.setAttribute('aria-current', Number(button.dataset.jump) === state.step ? 'step' : 'false');
  });

  bindScreenControls();
  screen.focus({ preventScroll: true });
}

function bindScreenControls() {
  screen.querySelectorAll('[data-service]').forEach((button) => button.addEventListener('click', () => {
    state.service = button.dataset.service;
    render();
  }));
  screen.querySelectorAll('[data-duration]').forEach((button) => button.addEventListener('click', () => {
    state.duration = button.dataset.duration;
    render();
  }));
  screen.querySelectorAll('[data-home-size]').forEach((button) => button.addEventListener('click', () => {
    state.homeSize = button.dataset.homeSize;
    render();
  }));
  screen.querySelectorAll('[data-day]').forEach((button) => button.addEventListener('click', () => {
    state.day = button.dataset.day;
    render();
  }));
  screen.querySelectorAll('[data-time]').forEach((button) => button.addEventListener('click', () => {
    state.time = button.dataset.time;
    render();
  }));
  screen.querySelectorAll('[data-next]').forEach((button) => button.addEventListener('click', () => {
    state.step = Math.min(5, state.step + 1);
    render();
  }));
  screen.querySelectorAll('[data-back]').forEach((button) => button.addEventListener('click', () => {
    state.step = Math.max(0, state.step - 1);
    render();
  }));
  screen.querySelectorAll('[data-send-link]').forEach((button) => button.addEventListener('click', () => {
    state.email = document.querySelector('#prototype-email').value;
    state.linkSent = true;
    render();
    showNotice('Prototype only - no email was sent');
  }));
  screen.querySelectorAll('[data-payment]').forEach((button) => button.addEventListener('click', () => {
    showNotice('Prototype stops here - payment success requires provider and backend confirmation');
  }));
  screen.querySelectorAll('[data-open-concierge]').forEach((button) => button.addEventListener('click', openConcierge));
  screen.querySelectorAll('[data-notice]').forEach((button) => button.addEventListener('click', () => showNotice(button.dataset.notice)));
}

reviewStepButtons.forEach((button) => button.addEventListener('click', () => {
  state.step = Number(button.dataset.jump);
  render();
}));

document.querySelectorAll('[data-tab]').forEach((button) => button.addEventListener('click', () => {
  document.querySelectorAll('[data-tab]').forEach((tab) => tab.setAttribute('aria-current', tab === button ? 'page' : 'false'));
  showNotice(`${button.textContent.trim()} navigation remains inside the Zoot app`);
}));

document.querySelectorAll('[data-notice]').forEach((button) => button.addEventListener('click', () => showNotice(button.dataset.notice)));
conciergeLauncher.addEventListener('click', openConcierge);
document.querySelector('[data-close-sheet]').addEventListener('click', closeConcierge);

backdrop.addEventListener('click', (event) => {
  if (event.target === backdrop) closeConcierge();
});

document.addEventListener('keydown', (event) => {
  if (backdrop.hidden) return;
  if (event.key === 'Escape') {
    closeConcierge();
    return;
  }
  if (event.key !== 'Tab') return;

  const focusable = Array.from(backdrop.querySelectorAll('button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'));
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});

document.querySelectorAll('[data-concierge-action]').forEach((button) => button.addEventListener('click', () => {
  const responses = {
    booking: 'Your draft is saved locally in this prototype, with no booking created yet',
    payment: 'Zoot never marks payment successful from chat and waits for verified backend confirmation',
    person: 'A human handoff would include only the safe summary you approve',
  };
  conciergeResponse.textContent = responses[button.dataset.conciergeAction];
}));

function openConcierge() {
  backdrop.hidden = false;
  document.body.style.overflow = 'hidden';
  appShell.inert = true;
  appShell.setAttribute('aria-hidden', 'true');
  document.querySelector('[data-close-sheet]').focus();
}

function closeConcierge() {
  backdrop.hidden = true;
  document.body.style.overflow = '';
  appShell.inert = false;
  appShell.removeAttribute('aria-hidden');
  conciergeLauncher.focus();
}

let toastTimer;
function showNotice(message) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.hidden = false;
  toastTimer = window.setTimeout(() => { toast.hidden = true; }, 3200);
}

render();
