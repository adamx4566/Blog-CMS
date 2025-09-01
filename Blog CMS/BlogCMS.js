const STORAGE_KEY = "simple_blog_posts_v1";

const searchInput = document.getElementById("searchInput");
const newBtn = document.getElementById("newBtn");
const exportBtn = document.getElementById("exportBtn");
const importBtn = document.getElementById("importBtn");
const importFile = document.getElementById("importFile");

const postsListEl = document.getElementById("postsList");
const titleInput = document.getElementById("titleInput");
const tagsInput = document.getElementById("tagsInput");
const publishedCheckbox = document.getElementById("publishedCheckbox");
const pubLabel = document.getElementById("pubLabel");
const contentInput = document.getElementById("contentInput");
const previewEl = document.getElementById("preview");
const saveBtn = document.getElementById("saveBtn");
const deleteBtn = document.getElementById("deleteBtn");
const viewBtn = document.getElementById("viewBtn");

let posts = [];
let currentId = null;

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2,8);
}

function loadPosts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    posts = raw ? JSON.parse(raw) : [];
  } catch {
    posts = [];
  }
}

function savePosts() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
}

function renderList(filter = "") {
  const q = filter.trim().toLowerCase();
  postsListEl.innerHTML = "";
  const sorted = [...posts].sort((a,b) => (b.updated || b.created) - (a.updated || a.created));
  sorted.forEach(post => {
    if (q && !(post.title + " " + (post.tags||"") + " " + (post.content||"")).toLowerCase().includes(q)) return;
    const div = document.createElement("div");
    div.className = "post-item " + (post.published ? "published" : "draft");
    const meta = document.createElement("div");
    meta.className = "meta";
    const t = document.createElement("div"); t.className = "title"; t.textContent = post.title || "(Untitled)";
    const s = document.createElement("div"); s.className = "sub"; s.textContent = `${post.tags||""} • ${new Date(post.updated || post.created).toLocaleString()}`;
    meta.appendChild(t); meta.appendChild(s);
    const badge = document.createElement("div");
    badge.textContent = post.published ? "Published" : "Draft";
    badge.style.fontSize = "12px"; badge.style.opacity = "0.9";
    div.appendChild(meta); div.appendChild(badge);
    div.addEventListener("click", () => openPost(post.id));
    postsListEl.appendChild(div);
  });
}

function openPost(id) {
  const post = posts.find(p => p.id === id);
  if (!post) return;
  currentId = id;
  titleInput.value = post.title || "";
  tagsInput.value = post.tags || "";
  publishedCheckbox.checked = !!post.published;
  pubLabel.textContent = post.published ? "Published" : "Draft";
  contentInput.value = post.content || "";
  renderPreview();
  location.hash = `post-${id}`;
}

function newPost() {
  const post = {
    id: uid(),
    title: "",
    tags: "",
    content: "",
    published: false,
    created: Date.now()
  };
  posts.unshift(post);
  savePosts();
  renderList(searchInput.value);
  openPost(post.id);
}

function deleteCurrent() {
  if (!currentId) return;
  posts = posts.filter(p => p.id !== currentId);
  savePosts();
  currentId = null;
  clearEditor();
  renderList(searchInput.value);
  location.hash = "";
}

function clearEditor() {
  titleInput.value = "";
  tagsInput.value = "";
  publishedCheckbox.checked = false;
  pubLabel.textContent = "Draft";
  contentInput.value = "";
  previewEl.innerHTML = "";
}

function saveCurrent() {
  const title = titleInput.value.trim();
  const tags = tagsInput.value.trim();
  const published = !!publishedCheckbox.checked;
  const content = contentInput.value;
  if (!currentId) {
    // if no current, create new
    const p = {
      id: uid(),
      title, tags, content, published,
      created: Date.now(), updated: Date.now()
    };
    posts.unshift(p);
    currentId = p.id;
  } else {
    const p = posts.find(x => x.id === currentId);
    if (!p) return;
    p.title = title;
    p.tags = tags;
    p.published = published;
    p.content = content;
    p.updated = Date.now();
  }
  savePosts();
  renderList(searchInput.value);
  pubLabel.textContent = published ? "Published" : "Draft";
  // keep hash in sync
  if (currentId) location.hash = `post-${currentId}`;
}

function renderPreview() {
  const md = contentInput.value || "";
  previewEl.innerHTML = marked.parse(md);
}

function exportPosts() {
  const data = JSON.stringify(posts, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `blog_export_${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function importPostsFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      if (!Array.isArray(imported)) throw new Error("Invalid file");
      // merge but avoid id collisions: generate new ids for imported posts
      const mapped = imported.map(p => ({ ...p, id: uid(), created: Date.now(), updated: p.updated || Date.now() }));
      posts = [...mapped, ...posts];
      savePosts();
      renderList();
      alert("Imported " + mapped.length + " posts.");
    } catch (e) {
      alert("Failed to import file.");
    }
  };
  reader.readAsText(file);
}

function handleHash() {
  const h = location.hash;
  if (!h) return;
  const m = h.match(/^#post-(.+)$/);
  if (m) {
    const id = m[1];
    const exists = posts.find(p => p.id === id);
    if (exists) openPost(id);
  }
}

// event wiring
searchInput.addEventListener("input", () => renderList(searchInput.value));
newBtn.addEventListener("click", newPost);
saveBtn.addEventListener("click", saveCurrent);
deleteBtn.addEventListener("click", () => {
  if (confirm("Delete this post?")) deleteCurrent();
});
viewBtn.addEventListener("click", () => {
  if (!currentId) return alert("Open or save a post first.");
  const p = posts.find(x => x.id === currentId);
  const slug = (p.title || "post").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g,"");
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(p.title)}</title></head><body>${marked.parse(p.content || "")}</body></html>`;
  const blob = new Blob([html], {type:'text/html'});
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
  URL.revokeObjectURL(url);
});

exportBtn.addEventListener("click", exportPosts);
importBtn.addEventListener("click", () => importFile.click());
importFile.addEventListener("change", (e) => {
  const f = e.target.files[0];
  importPostsFile(f);
  importFile.value = "";
});

contentInput.addEventListener("input", renderPreview);
publishedCheckbox.addEventListener("change", () => {
  pubLabel.textContent = publishedCheckbox.checked ? "Published" : "Draft";
});

window.addEventListener("hashchange", handleHash);

// initial load
loadPosts();
renderList();
handleHash();
renderPreview();

// helpers
function escapeHtml(s){ return String(s||"").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]); }
