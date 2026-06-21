// Launcher for the phone-in-headset experiments. Renders a full-screen list of
// experiences; tapping one navigates to that experiment's own page (its index.html).
//
// The list is HARDCODED for now. When the API endpoint exists, swap the body of
// loadExperiences() for the fetch — the rest of the page doesn't care where the
// list comes from, as long as the shape matches:
//
//   { slug, title, desc, path }
//
//   slug  — stable id (also the directory name)
//   title — display name
//   desc  — one-line description
//   path  — URL to open (each experiment is served from its own directory)

const HARDCODED_EXPERIENCES = [
  {
    slug: 'hello-world',
    title: 'Stereo Hello World',
    desc: 'Split-screen scene — look around a ring of spinning cubes.',
    path: '/hello-world/',
  },
  {
    slug: 'lit-textures',
    title: 'Lit Textures',
    desc: 'PBR materials + image-based lighting in stereo.',
    path: '/lit-textures/',
  },
];

// Single source of the list. Today: return the hardcoded array.
// Later: `return await (await fetch('/api/experiences')).json();`
async function loadExperiences() {
  return HARDCODED_EXPERIENCES;
}

function cardFor({ title, desc, path }) {
  const a = document.createElement('a');
  a.className = 'card';
  a.href = path;
  a.innerHTML = `
    <span class="arrow">›</span>
    <div class="title"></div>
    <div class="desc"></div>
  `;
  // Set text via textContent (not innerHTML) so titles/descriptions can't inject markup —
  // matters once these come from an API.
  a.querySelector('.title').textContent = title;
  a.querySelector('.desc').textContent = desc;
  return a;
}

async function render() {
  const list = document.getElementById('list');
  let experiences;
  try {
    experiences = await loadExperiences();
  } catch (err) {
    list.innerHTML = '<div class="empty">Couldn’t load experiences.</div>';
    console.error('[headset] failed to load experiences:', err);
    return;
  }

  if (!experiences || experiences.length === 0) {
    list.innerHTML = '<div class="empty">No experiences yet.</div>';
    return;
  }

  list.replaceChildren(...experiences.map(cardFor));
}

render();
