/* -------------------------------------------------------------
 * OpenE5 Core Application Logic
 * Single Page Application (SPA) Engine & Search Router
 * ------------------------------------------------------------- */

// Global State
const state = {
  chapters: [],
  components: [],
  glossary: [],
  timeline: [],
  currentView: 'inicio',
  currentChapterId: null,
  searchQuery: '',
  glossaryFilter: ''
};

// UI Elements Cache
const elements = {
  sidebar: document.getElementById('sidebar'),
  sidebarOverlay: document.getElementById('sidebar-overlay'),
  menuToggle: document.getElementById('menu-toggle'),
  searchField: document.getElementById('global-search'),
  clearSearch: document.getElementById('clear-search'),
  sidebarChaptersList: document.getElementById('sidebar-chapters-list'),
  currentViewTitle: document.getElementById('current-view-title'),
  contentViewport: document.getElementById('content-viewport'),
  tooltip: document.getElementById('glossary-tooltip'),
  tooltipTerm: document.getElementById('tooltip-term'),
  tooltipDef: document.getElementById('tooltip-definition')
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
  loadDatabases();
});

// Event Listeners
function initEventListeners() {
  // Mobile drawer menu toggles
  elements.menuToggle.addEventListener('click', toggleMobileSidebar);
  elements.sidebarOverlay.addEventListener('click', closeMobileSidebar);

  // Global Search input listener
  elements.searchField.addEventListener('input', handleSearchInput);
  elements.clearSearch.addEventListener('click', clearSearchField);

  // Hash-routing listener
  window.addEventListener('hashchange', handleRouting);

  // Close mobile sidebar on link clicks
  elements.sidebar.addEventListener('click', (e) => {
    const link = e.target.closest('.nav-link') || e.target.closest('.chapter-link');
    if (link) {
      closeMobileSidebar();
      
      // Update active nav styling manually (fallback indicator)
      document.querySelectorAll('.nav-link, .chapter-link').forEach(el => el.classList.remove('active'));
      link.classList.add('active');
    }
  });

  // Tooltip event handlers
  document.body.addEventListener('click', (e) => {
    // Hide tooltip if clicked outside highlight term
    if (!e.target.closest('.glossary-term-highlight') && !e.target.closest('.glossary-tooltip')) {
      hideTooltip();
    }
  });
}

// Drawer Sidebar Controls
function toggleMobileSidebar() {
  elements.sidebar.classList.toggle('open');
  elements.sidebarOverlay.classList.toggle('visible');
}

function closeMobileSidebar() {
  elements.sidebar.classList.remove('open');
  elements.sidebarOverlay.classList.remove('visible');
}

// Fetch databases from JSON files
async function loadDatabases() {
  try {
    const [chaptersRes, componentsRes, glossaryRes, timelineRes] = await Promise.all([
      fetch('data/chapters.json'),
      fetch('data/components.json'),
      fetch('data/glossary.json'),
      fetch('data/timeline.json')
    ]);

    state.chapters = await chaptersRes.json();
    state.components = await componentsRes.json();
    state.glossary = await glossaryRes.json();
    state.timeline = await timelineRes.json();

    // Populate chapters sublist in sidebar
    renderSidebarChapters();

    // Trigger router based on current url hash
    handleRouting();
  } catch (error) {
    console.error('Error cargando bases de datos de OpenE5:', error);
    elements.contentViewport.innerHTML = `
      <div class="view-loading">
        <i data-lucide="alert-triangle" style="color: var(--accent-red); width: 48px; height: 48px;"></i>
        <h3>Error al inicializar la base de datos</h3>
        <p>No se pudieron recuperar los ficheros JSON locales. Asegúrate de ejecutar un servidor web local.</p>
      </div>
    `;
    lucide.createIcons();
  }
}

// Render chapter navigation list in sidebar
function renderSidebarChapters() {
  elements.sidebarChaptersList.innerHTML = '';
  
  if (state.chapters.length === 0) {
    elements.sidebarChaptersList.innerHTML = '<li class="loading-placeholder">Sin capítulos</li>';
    return;
  }

  state.chapters.forEach(chap => {
    const li = document.createElement('li');
    li.className = 'chapter-item';
    li.innerHTML = `
      <a href="#manual/capitulo/${chap.id}" class="chapter-link" data-chap-id="${chap.id}" title="${chap.title}">
        Cap. ${chap.id}: ${chap.title}
      </a>
    `;
    elements.sidebarChaptersList.appendChild(li);
  });
}

// Search field change handler
function handleSearchInput(e) {
  const query = e.target.value.trim();
  state.searchQuery = query;

  if (query.length > 0) {
    elements.clearSearch.style.display = 'flex';
    // Navigate to search hash view
    window.location.hash = `buscar?q=${encodeURIComponent(query)}`;
  } else {
    elements.clearSearch.style.display = 'none';
    // Return to home or previous view if cleared
    window.location.hash = 'inicio';
  }
}

function clearSearchField() {
  elements.searchField.value = '';
  elements.clearSearch.style.display = 'none';
  state.searchQuery = '';
  window.location.hash = 'inicio';
  elements.searchField.focus();
}

// Client-side hash routing handler
function handleRouting() {
  const hash = window.location.hash || '#inicio';
  hideTooltip();

  // Highlight matching sidebar nav item
  updateSidebarActiveItem(hash);

  // Parse path & params
  // E.g. #manual/capitulo/12 or #buscar?q=dvvt
  if (hash.startsWith('#manual/capitulo/')) {
    const chapId = parseInt(hash.substring(17));
    state.currentView = 'manual';
    state.currentChapterId = chapId;
    renderManualView(chapId);
  } else if (hash.startsWith('#buscar')) {
    state.currentView = 'buscar';
    const params = new URLSearchParams(hash.substring(hash.indexOf('?')));
    const query = params.get('q') || '';
    state.searchQuery = query;
    elements.searchField.value = query;
    if (query) elements.clearSearch.style.display = 'flex';
    renderSearchView(query);
  } else {
    const viewName = hash.substring(1);
    state.currentView = viewName;
    state.currentChapterId = null;
    
    switch (viewName) {
      case 'inicio':
        renderInicioView();
        break;
      case 'componentes':
        renderComponentesView();
        break;
      case 'investigacion':
        renderInvestigacionView();
        break;
      case 'glosario':
        renderGlosarioView();
        break;
      default:
        renderInicioView();
    }
  }
}

// Update active highlight classes on navigation list
function updateSidebarActiveItem(hash) {
  // Clear all
  document.querySelectorAll('.nav-link, .chapter-link').forEach(el => el.classList.remove('active'));

  if (hash.startsWith('#manual/capitulo/')) {
    const chapId = hash.substring(17);
    const link = document.querySelector(`.chapter-link[data-chap-id="${chapId}"]`);
    if (link) link.classList.add('active');
  } else if (hash.startsWith('#buscar')) {
    // No specific active tab
  } else {
    const viewName = hash.substring(1);
    const link = document.querySelector(`.nav-link[data-view="${viewName}"]`);
    if (link) link.classList.add('active');
  }
}

// Helper to inject Lucide icons into rendered dynamic content
function refreshIcons() {
  lucide.createIcons();
}

/* -------------------------------------------------------------
 * Views Rendering Engines
 * ------------------------------------------------------------- */

// VIEW: Inicio (Dashboard Home)
function renderInicioView() {
  elements.currentViewTitle.textContent = "Inicio";
  
  // Calculate project completion stats
  const totalChapters = state.chapters.length;
  const totalComponents = state.components.length;
  const confirmedComponents = state.components.filter(c => c.status.includes('Confirmado')).length;
  const completedMilestones = state.timeline.filter(t => t.completed).length;
  const totalMilestones = state.timeline.length;
  
  const completionPercentage = Math.round((confirmedComponents / totalComponents) * 100);
  const milestonePercentage = Math.round((completedMilestones / totalMilestones) * 100);

  elements.contentViewport.innerHTML = `
    <div class="home-container">
      
      <section class="hero-section">
        <span class="hero-subtitle">Proyecto Abierto de Ingeniería</span>
        <h2 class="hero-title">Plataforma OpenE5</h2>
        <p class="hero-description">
          Documentación técnica colaborativa y bitácora de ingeniería inversa del SUV híbrido enchufable <strong>DFSK E5 Plus</strong>.
        </p>
        <div class="hero-badges">
          <div class="hero-badge-item active">
            <i data-lucide="shield-check"></i>
            <span>Plataforma DE-i</span>
          </div>
          <div class="hero-badge-item">
            <i data-lucide="zap"></i>
            <span>Híbrido Enchufable</span>
          </div>
          <div class="hero-badge-item">
            <i data-lucide="compass"></i>
            <span>Ingeniería Inversa</span>
          </div>
        </div>
      </section>

      <section class="dashboard-grid">
        
        <!-- Status Card 1 -->
        <div class="dashboard-card">
          <div class="card-header-icon">
            <span class="card-title">Investigación del Vehículo</span>
            <div class="icon-container">
              <i data-lucide="gauge"></i>
            </div>
          </div>
          <p class="card-content-text">
            Nivel de fidelidad técnica de las especificaciones y esquemas de fluidos catalogados.
          </p>
          <div class="progress-bar-container">
            <div class="progress-label">
              <span>Fidelidad de Partes</span>
              <span>${completionPercentage}%</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${completionPercentage}%"></div>
            </div>
          </div>
        </div>

        <!-- Status Card 2 -->
        <div class="dashboard-card">
          <div class="card-header-icon">
            <span class="card-title">Hitos del Proyecto</span>
            <div class="icon-container green">
              <i data-lucide="calendar"></i>
            </div>
          </div>
          <p class="card-content-text">
            Tareas de reverse engineering, escaneos OBD y despieces de manual de taller oficiales pendientes.
          </p>
          <div class="progress-bar-container">
            <div class="progress-label">
              <span>Hitos Cumplidos</span>
              <span>${completedMilestones} / ${totalMilestones}</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill green" style="width: ${milestonePercentage}%"></div>
            </div>
          </div>
        </div>

        <!-- Status Card 3 -->
        <div class="dashboard-card">
          <div class="card-header-icon">
            <span class="card-title">Base Editorial</span>
            <div class="icon-container teal">
              <i data-lucide="book-open"></i>
            </div>
          </div>
          <p class="card-content-text">
            Capítulos documentados detallando suspensión, VCU, PCU, BMS, red de baja y alta tensión.
          </p>
          <div class="progress-bar-container">
            <div class="progress-label">
              <span>Capítulos Redactados</span>
              <span>${totalChapters} Capítulos</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill teal" style="width: 100%"></div>
            </div>
          </div>
        </div>

      </section>

      <section class="quick-nav-section">
        <h3 class="section-headline">Navegación Rápida</h3>
        <div class="quick-links-grid">
          <a href="#manual/capitulo/2" class="quick-link-btn">
            <span>Motor F31A Atkinson</span>
            <i data-lucide="chevron-right"></i>
          </a>
          <a href="#manual/capitulo/24" class="quick-link-btn">
            <span>Estrategia Híbrida DE-i</span>
            <i data-lucide="chevron-right"></i>
          </a>
          <a href="#manual/capitulo/22" class="quick-link-btn">
            <span>Sistema Eléctrico 12V</span>
            <i data-lucide="chevron-right"></i>
          </a>
          <a href="#manual/capitulo/25" class="quick-link-btn">
            <span>Bitácora de Ingeniería</span>
            <i data-lucide="chevron-right"></i>
          </a>
        </div>
      </section>

    </div>
  `;
  refreshIcons();
}

// VIEW: Manual Chapter Content Viewer
function renderManualView(chapId) {
  const chapter = state.chapters.find(c => c.id === chapId);
  if (!chapter) {
    elements.currentViewTitle.textContent = "Error";
    elements.contentViewport.innerHTML = `
      <div class="view-loading">
        <i data-lucide="alert-circle" style="color: var(--accent-red); width: 48px; height: 48px;"></i>
        <h3>Capítulo no encontrado</h3>
        <p>El capítulo seleccionado (ID: ${chapId}) no existe o no pudo ser cargado.</p>
        <a href="#inicio" class="quick-link-btn">Volver al inicio</a>
      </div>
    `;
    refreshIcons();
    return;
  }

  elements.currentViewTitle.textContent = `Capítulo ${chapter.id}`;
  
  // Format Date for metadata
  const updateDate = "19 de Julio, 2026";
  
  // Process Markdown Content
  const rawMarkdown = chapter.content;
  let parsedHtml = marked.parse(rawMarkdown);
  
  // Custom Post-Processing on HTML
  parsedHtml = parseAlertsAndAdmonitions(parsedHtml);
  parsedHtml = wrapTablesWithScroll(parsedHtml);
  parsedHtml = highlightGlossaryTerms(parsedHtml);

  // Setup Next/Prev navigation
  const prevChapter = state.chapters.find(c => c.id === chapId - 1);
  const nextChapter = state.chapters.find(c => c.id === chapId + 1);

  let navHtml = '';
  if (prevChapter || nextChapter) {
    navHtml = `<div class="chapter-navigation">`;
    if (prevChapter) {
      navHtml += `
        <a href="#manual/capitulo/${prevChapter.id}" class="nav-chap-btn prev">
          <span class="nav-label"><i data-lucide="arrow-left" style="display: inline; width: 10px; height: 10px; margin-right: 4px;"></i> Anterior</span>
          <span class="nav-title">Cap. ${prevChapter.id}: ${prevChapter.title}</span>
        </a>
      `;
    } else {
      navHtml += `<div></div>`; // space holder
    }
    if (nextChapter) {
      navHtml += `
        <a href="#manual/capitulo/${nextChapter.id}" class="nav-chap-btn next">
          <span class="nav-label">Siguiente <i data-lucide="arrow-right" style="display: inline; width: 10px; height: 10px; margin-left: 4px;"></i></span>
          <span class="nav-title">Cap. ${nextChapter.id}: ${nextChapter.title}</span>
        </a>
      `;
    }
    navHtml += `</div>`;
  }

  elements.contentViewport.innerHTML = `
    <div class="chapter-view-container">
      <header class="chapter-header">
        <div class="chapter-number">Manual Técnico • Sección ${chapter.id}</div>
        <h2 class="chapter-main-title">${chapter.title}</h2>
        ${chapter.subtitle ? `<p style="font-size: 1.15rem; color: var(--text-secondary); margin-top: 8px;">${chapter.subtitle}</p>` : ''}
        <div class="chapter-meta">
          <div class="meta-item">
            <i data-lucide="edit-3"></i>
            <span>Revisión: v4.0 Alpha</span>
          </div>
          <div class="meta-item">
            <i data-lucide="clock"></i>
            <span>Actualizado: ${updateDate}</span>
          </div>
        </div>
      </header>

      <div class="chapter-body">
        ${parsedHtml}
      </div>

      ${navHtml}
    </div>
  `;

  // Bind tooltip triggers for the dynamically created highlights
  bindTooltipEvents();
  
  // Refresh Lucide Icons
  refreshIcons();

  // Scroll main viewport to top
  elements.contentViewport.scrollTop = 0;
}

// VIEW: Component Catalog Spec Sheets
function renderComponentesView() {
  elements.currentViewTitle.textContent = "Componentes";
  
  if (state.components.length === 0) {
    elements.contentViewport.innerHTML = '<div class="no-results-view">No hay componentes catalogados en la base de datos.</div>';
    return;
  }

  let cardsHtml = '';
  state.components.forEach(comp => {
    // Generate specs list
    let specsListHtml = '';
    for (const [key, value] of Object.entries(comp.specs)) {
      specsListHtml += `
        <li class="spec-item">
          <span class="spec-name">${key}</span>
          <span class="spec-value">${value}</span>
        </li>
      `;
    }

    // Generate related chapters tags
    let chaptersHtml = '';
    comp.related_chapters.forEach(chapNum => {
      const chap = state.chapters.find(c => c.id === chapNum);
      const name = chap ? `Cap. ${chapNum}` : `Capítulo ${chapNum}`;
      chaptersHtml += `
        <li>
          <a href="#manual/capitulo/${chapNum}" class="relation-link" title="${chap ? chap.title : ''}">${name}</a>
        </li>
      `;
    });

    cardsHtml += `
      <div class="component-spec-card" id="comp-${comp.id}">
        <div class="component-card-header">
          <div class="component-header-main">
            <h3>${comp.name}</h3>
            <span class="component-type">${comp.type}</span>
          </div>
          <div class="component-meta-badges">
            <span class="badge ${comp.status.includes('Confirmado') ? 'badge-alpha' : 'badge-confidence'}">${comp.status}</span>
            <span class="badge badge-confidence">Fidelidad: ${comp.confidence}%</span>
          </div>
        </div>
        <div class="component-card-body">
          <div class="component-desc-section">
            <h4>Descripción del Sistema</h4>
            <p class="component-description">${comp.description}</p>
            
            <div class="component-relations">
              <h4>Secciones Relacionadas</h4>
              <ul class="component-relations-list">
                ${chaptersHtml}
              </ul>
            </div>
          </div>
          <div class="component-specs-section">
            <h4>Especificaciones Técnicas</h4>
            <ul class="spec-list">
              <li class="spec-item">
                <span class="spec-name">Fabricante</span>
                <span class="spec-value">${comp.manufacturer}</span>
              </li>
              ${specsListHtml}
            </ul>
          </div>
        </div>
      </div>
    `;
  });

  elements.contentViewport.innerHTML = `
    <div class="components-container">
      <div class="components-grid">
        ${cardsHtml}
      </div>
    </div>
  `;
  refreshIcons();
}

// VIEW: Reverse Engineering Timeline
function renderInvestigacionView() {
  elements.currentViewTitle.textContent = "Línea de Tiempo";

  if (state.timeline.length === 0) {
    elements.contentViewport.innerHTML = '<div class="no-results-view">Sin hitos registrados en la bitácora.</div>';
    return;
  }

  let timelineEventsHtml = '';
  state.timeline.forEach(event => {
    const nodeIcon = event.completed ? 'check-circle' : 'circle';
    const eventClass = event.completed ? 'completed' : 'planned';
    
    timelineEventsHtml += `
      <div class="timeline-event ${eventClass}">
        <div class="timeline-node">
          <i data-lucide="${nodeIcon}"></i>
        </div>
        <div class="timeline-date">${event.date}</div>
        <div class="timeline-card">
          <h3 class="timeline-title">${event.title}</h3>
          <p class="timeline-desc">${event.description}</p>
        </div>
      </div>
    `;
  });

  elements.contentViewport.innerHTML = `
    <div class="timeline-container">
      <div class="timeline-line"></div>
      ${timelineEventsHtml}
    </div>
  `;
  refreshIcons();
}

// VIEW: Glossary Terms & Filtering
function renderGlosarioView() {
  elements.currentViewTitle.textContent = "Glosario Técnico";
  
  const filterVal = state.glossaryFilter.toLowerCase().trim();

  // Filter terms
  const filteredTerms = state.glossary.filter(item => {
    return item.term.toLowerCase().includes(filterVal) || 
           item.definition.toLowerCase().includes(filterVal);
  });

  let cardsHtml = '';
  if (filteredTerms.length === 0) {
    cardsHtml = `
      <div class="no-results-view" style="grid-column: 1 / -1;">
        <i data-lucide="info"></i>
        <p>No se encontraron términos que coincidan con "${state.glossaryFilter}".</p>
      </div>
    `;
  } else {
    filteredTerms.forEach(item => {
      cardsHtml += `
        <div class="glossary-card" id="glossary-term-${item.term.toUpperCase()}">
          <h3 class="glossary-term">${item.term}</h3>
          <p class="glossary-def">${item.definition}</p>
        </div>
      `;
    });
  }

  elements.contentViewport.innerHTML = `
    <div class="glossary-container">
      <div class="glossary-header">
        <p style="color: var(--text-secondary); font-size: 0.9rem;">
          Presiona sobre cualquier término resaltado en los capítulos para ver esta ventana emergente.
        </p>
        <div class="glossary-filter-box">
          <i data-lucide="filter"></i>
          <input type="text" id="glossary-filter-input" placeholder="Filtrar términos..." value="${state.glossaryFilter}" autocomplete="off">
        </div>
      </div>
      <div class="glossary-list">
        ${cardsHtml}
      </div>
    </div>
  `;

  // Filter input listeners
  const filterInput = document.getElementById('glossary-filter-input');
  filterInput.addEventListener('input', (e) => {
    state.glossaryFilter = e.target.value;
    renderGlosarioView();
    // Keep focus at the end of text input
    const input = document.getElementById('glossary-filter-input');
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  });

  refreshIcons();
}

// VIEW: Global Search Results
function renderSearchView(query) {
  elements.currentViewTitle.textContent = `Resultados para: "${query}"`;
  
  if (!query) {
    elements.contentViewport.innerHTML = '<div class="no-results-view">Escribe un término de búsqueda en la barra lateral.</div>';
    return;
  }

  const queryLower = query.toLowerCase();

  // Search Chapters
  const chapterResults = [];
  state.chapters.forEach(chap => {
    const titleMatch = chap.title.toLowerCase().includes(queryLower);
    const contentMatch = chap.content.toLowerCase().includes(queryLower);
    
    if (titleMatch || contentMatch) {
      // Create a highlight text snippet
      let snippet = "";
      if (contentMatch) {
        const text = chap.content;
        const pos = text.toLowerCase().indexOf(queryLower);
        const start = Math.max(0, pos - 60);
        const end = Math.min(text.length, pos + 100);
        snippet = "..." + escapeHTML(text.substring(start, end)) + "...";
        // Highlight terms
        const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
        snippet = snippet.replace(regex, '<mark>$1</mark>');
      } else {
        snippet = chap.subtitle || "Coincidencia en el título de la sección.";
      }

      chapterResults.push({
        id: chap.id,
        title: chap.title,
        snippet: snippet
      });
    }
  });

  // Search Components
  const componentResults = [];
  state.components.forEach(comp => {
    const nameMatch = comp.name.toLowerCase().includes(queryLower);
    const descMatch = comp.description.toLowerCase().includes(queryLower);
    const specKeys = Object.keys(comp.specs).join(' ').toLowerCase();
    const specValues = Object.values(comp.specs).join(' ').toLowerCase();
    const specMatch = specKeys.includes(queryLower) || specValues.includes(queryLower);

    if (nameMatch || descMatch || specMatch) {
      componentResults.push({
        id: comp.id,
        name: comp.name,
        type: comp.type,
        snippet: descMatch ? comp.description : `Ficha técnica: ${comp.type}`
      });
    }
  });

  // Search Glossary
  const glossaryResults = [];
  state.glossary.forEach(g => {
    const termMatch = g.term.toLowerCase().includes(queryLower);
    const defMatch = g.definition.toLowerCase().includes(queryLower);

    if (termMatch || defMatch) {
      glossaryResults.push({
        term: g.term,
        definition: g.definition
      });
    }
  });

  const totalResults = chapterResults.length + componentResults.length + glossaryResults.length;

  if (totalResults === 0) {
    elements.contentViewport.innerHTML = `
      <div class="search-results-container">
        <div class="no-results-view">
          <i data-lucide="search-code"></i>
          <h3>Sin coincidencias</h3>
          <p>No se encontraron capítulos, componentes ni siglas que contengan "${query}".</p>
        </div>
      </div>
    `;
    refreshIcons();
    return;
  }

  let html = `
    <div class="search-results-container">
      <p class="search-summary-text">Se encontraron ${totalResults} resultados relacionados con tu búsqueda.</p>
  `;

  // Render Chapters Matches
  if (chapterResults.length > 0) {
    html += `
      <div class="search-result-group">
        <h3 class="search-group-title">Capítulos del Manual (${chapterResults.length})</h3>
        <ul class="results-list">
    `;
    chapterResults.forEach(res => {
      html += `
        <li class="search-result-item">
          <a href="#manual/capitulo/${res.id}" class="search-result-card">
            <div class="search-result-header">
              <span class="search-result-title">Capítulo ${res.id}: ${res.title}</span>
              <span class="search-result-badge">Manual</span>
            </div>
            <p class="search-result-snippet">${res.snippet}</p>
          </a>
        </li>
      `;
    });
    html += `</ul></div>`;
  }

  // Render Components Matches
  if (componentResults.length > 0) {
    html += `
      <div class="search-result-group">
        <h3 class="search-group-title">Fichas de Componentes (${componentResults.length})</h3>
        <ul class="results-list">
    `;
    componentResults.forEach(res => {
      html += `
        <li class="search-result-item">
          <a href="#componentes" class="search-result-card" onclick="setTimeout(() => { document.getElementById('comp-${res.id}')?.scrollIntoView({behavior: 'smooth'}); }, 100);">
            <div class="search-result-header">
              <span class="search-result-title">${res.name}</span>
              <span class="search-result-badge">Especificación</span>
            </div>
            <p class="search-result-snippet">${res.snippet}</p>
          </a>
        </li>
      `;
    });
    html += `</ul></div>`;
  }

  // Render Glossary Matches
  if (glossaryResults.length > 0) {
    html += `
      <div class="search-result-group">
        <h3 class="search-group-title">Siglas y Abreviaturas (${glossaryResults.length})</h3>
        <ul class="results-list">
    `;
    glossaryResults.forEach(res => {
      html += `
        <li class="search-result-item">
          <a href="#glosario" class="search-result-card" onclick="state.glossaryFilter = '${res.term}';">
            <div class="search-result-header">
              <span class="search-result-title">${res.term}</span>
              <span class="search-result-badge">Sigla</span>
            </div>
            <p class="search-result-snippet">${res.definition}</p>
          </a>
        </li>
      `;
    });
    html += `</ul></div>`;
  }

  html += `</div>`;
  elements.contentViewport.innerHTML = html;
  refreshIcons();
}

/* -------------------------------------------------------------
 * Markdown Parsers & HTML Utilities
 * ------------------------------------------------------------- */

// Parse blocks and format Admonitions alerts in HTML: > [!NOTE]
function parseAlertsAndAdmonitions(html) {
  // Regex to match blockquote blocks starting with alert types
  // Marked compiles: <blockquote>\n<p>[!NOTE]\nText...</p>\n</blockquote>
  const regex = /<blockquote>\s*<p>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*([\s\S]*?)<\/p>\s*<\/blockquote>/gi;
  
  return html.replace(regex, (match, type, content) => {
    let iconName = 'info';
    type = type.toUpperCase();
    
    switch (type) {
      case 'NOTE': iconName = 'info'; break;
      case 'TIP': iconName = 'lightbulb'; break;
      case 'IMPORTANT': iconName = 'shield-alert'; break;
      case 'WARNING': iconName = 'alert-triangle'; break;
      case 'CAUTION': iconName = 'skull'; break;
    }

    return `
      <div class="admonition admonition-${type.toLowerCase()}">
        <div class="admonition-title">
          <i data-lucide="${iconName}"></i>
          <span>${type}</span>
        </div>
        <div class="admonition-content">
          <p>${content.trim()}</p>
        </div>
      </div>
    `;
  });
}

// Wrap tables with custom wrapper to enforce horizontal scroll boundaries
function wrapTablesWithScroll(html) {
  const regex = /<table>([\s\S]*?)<\/table>/gi;
  return html.replace(regex, (match) => {
    return `<div class="table-container">${match}</div>`;
  });
}

// Highlight glossary abbreviations inside text blocks automatically
function highlightGlossaryTerms(html) {
  if (state.glossary.length === 0) return html;

  // Let's build a sorted terms list (longest term first, to prevent partial overrides of sub-acronyms)
  const sortedTerms = [...state.glossary].sort((a, b) => b.term.length - a.term.length);

  // We should only replace terms inside text paragraphs, not inside tag attributes, code blocks or tags.
  // A robust client-side approach is parsing utilizing a temp DOM, but we can do a target replacement
  // that avoids inside <pre>, <code>, <a> tags.
  // To keep it safe, let's parse using a temporary HTML parser.
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  // Recursive walker to scan text nodes
  function walkTextNodes(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      let text = node.nodeValue;
      let replaced = false;
      let newHtml = text;

      // Check if node is child of interactive elements where highlights are bad
      let parent = node.parentNode;
      let skipNode = false;
      while (parent) {
        const tagName = parent.tagName ? parent.tagName.toUpperCase() : '';
        if (tagName === 'CODE' || tagName === 'PRE' || tagName === 'A' || tagName === 'H1' || tagName === 'H2' || tagName === 'H3' || tagName === 'H4' || parent.classList.contains('glossary-term-highlight')) {
          skipNode = true;
          break;
        }
        parent = parent.parentNode;
      }

      if (skipNode) return;

      // Replace matching acronyms
      sortedTerms.forEach(item => {
        // Match word boundaries: e.g. \bDVVT\b (ignoring matches inside existing attributes/tags)
        // Also support Spanish plurals like DVVTs or lowercase
        const termRegex = new RegExp(`\\b(${escapeRegex(item.term)})(s|es)?\\b`, 'gi');
        
        if (termRegex.test(newHtml)) {
          // Replace matching occurrences
          newHtml = newHtml.replace(termRegex, `<span class="glossary-term-highlight" data-term="${escapeHTML(item.term)}">$1$2</span>`);
          replaced = true;
        }
      });

      if (replaced) {
        const span = document.createElement('span');
        span.innerHTML = newHtml;
        node.parentNode.replaceChild(span, node);
      }
    } else {
      // Loop backwards because we might replace nodes
      for (let i = node.childNodes.length - 1; i >= 0; i--) {
        walkTextNodes(node.childNodes[i]);
      }
    }
  }

  walkTextNodes(tempDiv);
  return tempDiv.innerHTML;
}

// Bind event handlers for tooltip hover triggers in parsed content
function bindTooltipEvents() {
  const highlights = document.querySelectorAll('.glossary-term-highlight');
  
  highlights.forEach(el => {
    const term = el.getAttribute('data-term');
    const termObj = state.glossary.find(g => g.term.toLowerCase() === term.toLowerCase());
    
    if (termObj) {
      // Hover event
      el.addEventListener('mouseenter', (e) => {
        showTooltip(e, termObj);
      });
      
      el.addEventListener('mouseleave', () => {
        hideTooltip();
      });

      // Mobile click event (fallbacks to scroll)
      el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Show tooltip on click (mobile-friendly)
        showTooltip(e, termObj);
        
        // If clicked again or clicked action, navigate
        // Let's make it click to jump to the glossary card
        setTimeout(() => {
          window.location.hash = 'glosario';
          state.glossaryFilter = termObj.term;
          // After loading glossary view, scroll to target card
          setTimeout(() => {
            const card = document.getElementById(`glossary-term-${termObj.term.toUpperCase()}`);
            if (card) {
              card.scrollIntoView({ behavior: 'smooth', block: 'center' });
              card.style.borderColor = 'var(--accent-blue)';
              card.style.boxShadow = '0 0 15px rgba(14, 165, 233, 0.3)';
              setTimeout(() => {
                card.style.borderColor = '';
                card.style.boxShadow = '';
              }, 2000);
            }
          }, 150);
        }, 1500);
      });
    }
  });
}

// Show tooltip adjacent to active text element
function showTooltip(e, termObj) {
  elements.tooltipTerm.textContent = termObj.term;
  elements.tooltipDef.textContent = termObj.definition;
  
  elements.tooltip.classList.add('visible');
  
  // Position
  const rect = e.target.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  
  // Calculate top & left coordinates
  let top = rect.bottom + window.scrollY + 8;
  let left = rect.left + window.scrollX - 20;

  // Boundary checks to keep tooltip fully on screen
  if (left + 280 > viewportWidth) {
    left = viewportWidth - 300;
  }
  if (left < 10) {
    left = 10;
  }

  elements.tooltip.style.top = `${top}px`;
  elements.tooltip.style.left = `${left}px`;
}

function hideTooltip() {
  elements.tooltip.classList.remove('visible');
}

// Regex escape helper
function escapeRegex(string) {
  return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

// HTML escape helper
function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}
