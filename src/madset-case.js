import {escapeHtml} from './content-utils.js'

const ASSETS = '/madset-case/'
const shot = (name, alt, extra = '') => `<figure class="ms-phone ${extra}"><img src="${ASSETS}${name}.webp" alt="${alt}" width="1080" height="2347" loading="lazy" decoding="async"></figure>`
const label = (left, right) => `<div class="ms-label"><span>${left}</span><span>${right}</span></div>`
const image = (name, alt, extra = '') => `<img class="${extra}" src="${ASSETS}${name}.webp" alt="${alt}" loading="lazy" decoding="async">`

// An editorial presentation for MADSET only. CMS media remains intact and supplies the film.
export function renderMadsetCase(project) {
  const film = project.media?.find(item => item._type === 'videoFile' && item.fileUrl)
  const appStore = 'https://apps.apple.com/sa/app/madset/id6804025895'
  return `<article class="ms-case" aria-label="MADSET product design case study">
    <header class="ms-cover">
      ${label('Independent product / iOS', '2026 · Design & development')}
      <div class="ms-cover-top"><img src="${ASSETS}appicon.webp" alt="MADSET app icon" width="72" height="72"><p>A training log.<br>A personal practice.<br>Made from the ground up.</p><span>Product design<br>Art direction<br>Custom typography</span></div>
      <div class="ms-cover-title"><p>Built for<br>the next set.</p><h1>MADSET<span>.</span></h1></div>
      <div class="ms-cover-bottom"><span>A little less noise.<br>A lot more focus.</span><a href="${appStore}" target="_blank" rel="noopener">Live on the App Store <span aria-hidden="true">↗</span></a></div>
    </header>

    <section class="ms-intro ms-section">
      ${label('01 / The idea', 'Training, with intention')}
      <div class="ms-editorial"><h2>Make room<br>for the work.</h2><p><span class="ms-muted">I wanted a training app that felt like a tool I could trust.</span> A clear plan, a quick way to log a set, and a record of what came before. So I designed and built MADSET — from the first screen to the type that gives it a voice.</p></div>
      <dl class="ms-facts"><div><dt>Discipline</dt><dd>Product & identity</dd></div><div><dt>Platform</dt><dd>Native iOS</dd></div><div><dt>Languages</dt><dd>English + Arabic</dd></div><div><dt>Project</dt><dd>Designed & shipped</dd></div></dl>
    </section>

    <section class="ms-system ms-section">
      ${label('02 / The product', 'One language. Every screen.')}
      <h2 class="ms-large">Train. Log.<br><span class="ms-muted">Come back stronger.</span></h2>
      <div class="ms-phone-trio">${shot('progress','MADSET progress screen with training history')}${shot('home','MADSET dashboard showing workout, body weight and recovery')}${shot('workout','MADSET workout screen with the planned exercises')}</div>
      <p class="ms-footnote">Actual screens from the app · Dashboard / Training / Progress</p>
    </section>

    <section class="ms-approach ms-section">
      ${label('03 / The approach', 'Less friction, more clarity')}
      <div class="ms-pair"><div><span class="ms-small">The challenge</span><h2>Keep the detail.<br>Lose the noise.</h2><p>Training creates a lot of information. The challenge was to keep the useful parts close without making every session feel like filling in a spreadsheet.</p></div><div><span class="ms-small">The response</span><h2>A familiar rhythm.<br>One set at a time.</h2><p>A shared visual system connects the plan, the set sheet and the history. Clear hierarchy and restrained colour help the important information stand out.</p></div></div>
    </section>

    <section class="ms-portrait ms-section">
      <div class="ms-portrait-copy">${label('Made for the everyday athlete', 'MADSET')}
        <h2>Show up.<br>Find your<br><span class="ms-muted">rhythm.</span></h2><p>A personal routine deserves a personal tool. Quiet enough to stay out of the way. Useful enough to come back to.</p><span class="ms-small">Human first. Numbers second.</span>
      </div>
      ${image('portrait','Editorial portrait of an athlete in a charcoal technical running jacket')}
    </section>

    <section class="ms-feature ms-section">
      ${label('04 / Dashboard', 'Your day, at a glance')}
      <div class="ms-feature-grid"><div class="ms-feature-copy"><h2>Everything<br>starts here.</h2><p>The next session, recent training and recovery sit together. One place to get your bearings before getting into the work.</p><ul><li>Today’s workout</li><li>Training activity</li><li>Recovery & body data</li></ul></div>${shot('home','Full dashboard with the next session, readiness and training activity')}</div>
    </section>

    <section class="ms-workout ms-section">
      ${label('05 / In the session', 'Plan → set → record')}
      <div class="ms-editorial"><h2>Less tapping.<br>More training.</h2><p class="ms-muted">Move from the plan into an exercise and log the set. The previous session stays close, so the next decision has some context.</p></div>
      <div class="ms-duo">${shot('workout','The workout plan and exercise list')}${shot('sheet','The set entry sheet with exercise targets')}</div>
    </section>

    <section class="ms-feature ms-section ms-feature-reverse">
      ${label('06 / Recovery', 'See the bigger picture')}
      <div class="ms-feature-grid">${shot('recovery','MADSET recovery screen with WHOOP recovery, sleep and strain')}<div class="ms-feature-copy"><h2>There’s more<br>to the session<br><span class="ms-muted">than the session.</span></h2><p>Sleep, recovery and strain live alongside the training log. A little more context for how you feel today, without turning the interface into a wall of charts.</p><span class="ms-small">Connected recovery / WHOOP</span></div></div>
    </section>

    <section class="ms-type ms-section">
      ${label('07 / Visual identity', 'A voice made of dots')}
      <div class="ms-editorial"><h2>Small dots.<br>Strong character.</h2><p class="ms-muted">MADDot gives the big moments their character. Mdot carries the smaller readouts. Together they create a visual rhythm that runs through the whole app.</p></div>
      <div class="ms-type-specimen"><span class="ms-small">MADDot / Display</span><p class="ms-dot">Made to move.</p><div class="ms-type-bottom"><span class="ms-dot">0123456789</span><span class="ms-micro-dot">REPS / SETS / REST / REPEAT</span></div></div>
      <div class="ms-palette"><div style="--swatch:#080808"><span>Canvas</span><span>#080808</span></div><div style="--swatch:#1c1c1e"><span>Surface</span><span>#1C1C1E</span></div><div style="--swatch:#8e8e93"><span>Secondary</span><span>#8E8E93</span></div><div class="ms-light" style="--swatch:#f5f5f5"><span>Primary</span><span>#F5F5F5</span></div></div>
      <p class="ms-footnote">A monochrome foundation. Colour appears when the information needs it.</p>
    </section>

    <section class="ms-icons ms-section">
      ${label('08 / The details', 'A system, not a collection')}
      <div class="ms-editorial"><h2>One visual<br>vocabulary.</h2><p class="ms-muted">Navigation, training and recovery share the same dot-based character. Familiar shapes help connect the smallest action to the wider product.</p></div>
      <div class="ms-icon-grid">${image('01-navigation-ui','MADSET navigation and interface icons')}${image('02-workout-training','MADSET workout and training icons')}${image('03-time-progress','MADSET time and progress icons')}${image('04-body-health','MADSET body and health icons')}</div>
      <div class="ms-language"><div><span class="ms-small">English / العربية</span><h3>Two languages.<br>One experience.</h3></div><p lang="ar" dir="rtl">كل تمرينة<br>ليها حكاية.</p></div>
    </section>

    ${film ? `<section class="ms-film ms-section">${label('09 / In motion','Inside the app')}<h2>See how it feels.</h2><video controls playsinline preload="none" ${film.posterUrl ? `poster="${escapeHtml(film.posterUrl)}"` : ''} aria-label="MADSET app walkthrough"><source src="${escapeHtml(film.fileUrl)}" type="video/mp4"></video><p class="ms-footnote">A walkthrough of the app. Press play to explore the screens.</p></section>` : ''}

    <section class="ms-lifestyle">${image('movement','Athlete in refined dark running clothes walking through a studio')}<div><span class="ms-small">Made for your own pace.</span><h2>Keep<br>showing up.</h2></div></section>

    <footer class="ms-close ms-section">${label('From a personal idea to a real product','MAD / 2026')}<img src="${ASSETS}appicon.webp" alt="" width="80" height="80" loading="lazy"><h2>Meet your<br>next training partner.</h2><a class="ms-download" href="${appStore}" target="_blank" rel="noopener">Explore MADSET <span aria-hidden="true">↗</span></a><p>Product design · Art direction · Type design · Development</p><span class="ms-close-word ms-dot" aria-hidden="true">MadSet.</span></footer>
  </article>`
}
