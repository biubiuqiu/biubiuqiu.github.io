(() => {
  'use strict';

  const lab = document.getElementById('pool-lab');
  if (!lab) return;

  const users = 300;
  const period = 10;
  const seatsPerNode = 12;
  const arrivals = lab.querySelectorAll('input[name="pool-arrivals"]');
  const grace = lab.querySelector('#pool-grace');
  const series = lab.querySelector('[data-pool-series]');

  function update() {
    const burst = lab.querySelector('input[name="pool-arrivals"]:checked').value === 'burst';
    const keepMinutes = Number(grace.value);
    const starts = Array.from({ length: period }, (_, minute) => {
      if (burst) return minute === 0 ? users : 0;
      return users / period;
    });
    let peak = 0;
    let seatMinutes = 0;
    const bars = document.createDocumentFragment();

    starts.forEach((working, minute) => {
      let warm = 0;
      // The ten-minute cycle repeats, including the warm tail of the previous cycle.
      for (let offset = 1; offset <= keepMinutes; offset++) {
        warm += starts[(minute - offset + period) % period];
      }
      const total = working + warm;
      peak = Math.max(peak, total);
      seatMinutes += total;

      const bar = document.createElement('li');
      const description = `経過 ${minute + 1} 分：実行中 ${working} 枠、待機 ${warm} 枠、合計 ${total} 枠`;
      bar.setAttribute('aria-label', description);
      bar.title = description;
      const stack = document.createElement('span');
      stack.className = 'pool-stack';
      stack.setAttribute('aria-hidden', 'true');
      const active = document.createElement('span');
      active.className = 'pool-run';
      active.style.height = `${100 * working / users}%`;
      const held = document.createElement('span');
      held.className = 'pool-warm';
      held.style.height = `${100 * warm / users}%`;
      stack.append(active, held);
      const tick = document.createElement('span');
      tick.className = 'pool-minute';
      tick.textContent = minute + 1;
      tick.setAttribute('aria-hidden', 'true');
      bar.append(stack, tick);
      bars.append(bar);
    });

    series.replaceChildren(bars);
    const duration = `${keepMinutes} 分`;
    lab.querySelector('#pool-grace-value').value = duration;
    grace.setAttribute('aria-valuetext', duration);
    lab.querySelector('[data-pool-mean]').textContent = seatMinutes / period;
    lab.querySelector('[data-pool-peak]').textContent = peak;
    lab.querySelector('[data-pool-nodes]').textContent = Math.ceil(peak / seatsPerNode);
  }

  arrivals.forEach(input => input.addEventListener('change', update));
  grace.addEventListener('input', update);
  update();
  lab.querySelector('[data-pool-interactive]').hidden = false;
  lab.querySelector('[data-pool-fallback]').hidden = true;
})();
