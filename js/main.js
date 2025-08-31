// ===== APLICACIÓN PRINCIPAL RICK AND MORTY =====

/**
 * Clase principal de la aplicación
 */
class RickAndMortyApp {
  // SCROLL INFINITO
  // FAVORITOS
  isFavorite(id) {
    const favs = JSON.parse(localStorage.getItem('favorites') || '[]');
    return favs.includes(id);
  }
  toggleFavorite(id) {
    let favs = JSON.parse(localStorage.getItem('favorites') || '[]');
    const isFavorite = favs.includes(id);
    
    if (isFavorite) {
      favs = favs.filter(f => f !== id);
    } else {
      favs.push(id);
    }
    
    localStorage.setItem('favorites', JSON.stringify(favs));
    
    // Actualizar la clase visual de la tarjeta
    const card = document.querySelector(`.character-card[data-character-id="${id}"]`);
    if (card) {
      card.classList.toggle('favorite', !isFavorite);
    }
    
    if (this.showingFavorites) this.loadCharacters();
  }
  async toggleFavoritesView() {
    this.showingFavorites = !this.showingFavorites;
    if (this.showingFavorites) {
      await this.loadFavoriteCharacters();
    } else {
      await this.loadCharacters();
    }
    this.elements.favoritesBtn.classList.toggle('active', this.showingFavorites);
  }
  async loadFavoriteCharacters() {
    const favs = JSON.parse(localStorage.getItem('favorites') || '[]');
    if (favs.length === 0) {
      this.characters = [];
      this.totalCharacters = 0;
      this.renderCharacters();
      this.updateResultsDisplay();
      return;
    }
    // Obtener datos completos de los favoritos
    const promises = favs.map(id => api.getCharacter(id));
    this.characters = await Promise.all(promises);
    this.totalCharacters = this.characters.length;
    this.renderCharacters();
    this.updateResultsDisplay();
  }
  constructor() {
    this.currentPage = 1;
    this.currentFilters = {
      name: '',
      status: '',
      species: ''
    };
    this.characters = [];
    this.totalPages = 1;
    this.totalCharacters = 0;
    this.currentCharacterIndex = 0;
    this.allSpecies = [];
    
    // Referencias a elementos del DOM
    this.elements = {};
    
    // Managers
    this.themeManager = new Utils.ThemeManager();
    
    this.init();
  }

  /**
   * Inicializa la aplicación
   */
  async init() {
    try {
      this.bindElements();
      this.bindEvents();
      await this.loadInitialData();
      this.setupBackToTop();
    } catch (error) {
      console.error('Error al inicializar la aplicación:', error);
      Utils.showError('Error al cargar la aplicación. Por favor, recarga la página.');
    }
  }

  /**
   * Vincula elementos del DOM
   */
  bindElements() {
    this.elements = {
      // Búsqueda y filtros
      searchInput: document.getElementById('searchInput'),
      searchBtn: document.getElementById('searchBtn'),
  statusFilter: document.getElementById('statusFilter'),
  speciesFilter: document.getElementById('speciesFilter'),
  episodeFilter: document.getElementById('episodeFilter'),
      clearFilters: document.getElementById('clearFilters'),
      
      // Resultados
      resultsCount: document.getElementById('resultsCount'),
      charactersGrid: document.getElementById('charactersGrid'),
      pagination: document.getElementById('pagination'),
      
      // Loading y errores
      loadingSpinner: document.getElementById('loadingSpinner'),
      errorMessage: document.getElementById('errorMessage'),
      retryBtn: document.getElementById('retryBtn'),
      
      // Modal
      modalOverlay: document.getElementById('modalOverlay'),
      characterModal: document.getElementById('characterModal'),
      modalContent: document.getElementById('modalContent'),
      modalClose: document.getElementById('modalClose'),
      prevCharacter: document.getElementById('prevCharacter'),
      nextCharacter: document.getElementById('nextCharacter'),
      
      // Tema y navegación
      themeToggle: document.getElementById('themeToggle'),
  backToTop: document.getElementById('backToTop'),
  favoritesBtn: document.getElementById('favoritesBtn')
    };
  }

  /**
   * Vincula eventos
   */
  bindEvents() {
  // Favoritos
  this.showingFavorites = false;
  this.elements.favoritesBtn.addEventListener('click', () => this.toggleFavoritesView());
    // Búsqueda
    const debouncedSearch = Utils.debounce(() => this.handleSearch(), 500);
    this.elements.searchInput.addEventListener('input', debouncedSearch);
    this.elements.searchBtn.addEventListener('click', () => this.handleSearch());
    
    // Enter en búsqueda
    this.elements.searchInput.addEventListener('keypress', (e) => {
      if (Utils.KeyboardManager.isEnterKey(e)) {
        this.handleSearch();
      }
    });
    
    // Filtros
  this.elements.statusFilter.addEventListener('change', () => this.handleFilterChange());
  this.elements.speciesFilter.addEventListener('change', () => this.handleFilterChange());
  this.elements.episodeFilter.addEventListener('change', () => this.handleFilterChange());
    this.elements.clearFilters.addEventListener('click', () => this.clearAllFilters());
    
    // Modal
    this.elements.modalClose.addEventListener('click', () => this.closeModal());
    this.elements.modalOverlay.addEventListener('click', (e) => {
      if (e.target === this.elements.modalOverlay) {
        this.closeModal();
      }
    });
    
    // Navegación en modal
    this.elements.prevCharacter.addEventListener('click', () => this.showPreviousCharacter());
    this.elements.nextCharacter.addEventListener('click', () => this.showNextCharacter());
    
    // Tema
    this.elements.themeToggle.addEventListener('click', () => this.themeManager.toggle());
    
    // Reintentar
    this.elements.retryBtn.addEventListener('click', () => this.loadCharacters());
    
    // Back to top
    this.elements.backToTop.addEventListener('click', () => Utils.scrollToTop());
    
    // Teclado global
    document.addEventListener('keydown', (e) => this.handleGlobalKeyboard(e));
    
    // Scroll para back to top
    const throttledScroll = Utils.throttle(() => this.handleScroll(), 100);
    window.addEventListener('scroll', throttledScroll);
  }

  /**
   * Carga datos iniciales
   */
  async loadInitialData() {
    Utils.showLoading();
    
    try {
  // Cargar especies para el filtro
  await this.loadSpecies();
  // Cargar episodios para el filtro
  await this.loadEpisodes();
  // Cargar personajes iniciales
  await this.loadCharacters();
      
    } catch (error) {
      console.error('Error al cargar datos iniciales:', error);
      Utils.showError(APIHelpers.handleAPIError(error));
    } finally {
      Utils.hideLoading();
    }
  }

  /**
   * Carga las especies para el filtro
   */
  async loadSpecies() {
    try {
      this.allSpecies = await api.getAllSpecies();
      this.populateSpeciesFilter();
    } catch (error) {
      console.warn('Error al cargar especies:', error);
    }
  }

  /**
   * Carga los episodios para el filtro
   */
  async loadEpisodes() {
    try {
      const episodes = await api.getAllEpisodes();
      this.populateEpisodeFilter(episodes);
    } catch (error) {
      console.warn('Error al cargar episodios:', error);
    }
  }

  /**
   * Puebla el filtro de episodios
   */
  populateEpisodeFilter(episodes) {
    const episodeFilter = this.elements.episodeFilter;
    while (episodeFilter.children.length > 1) {
      episodeFilter.removeChild(episodeFilter.lastChild);
    }
    episodes.forEach(ep => {
      const option = document.createElement('option');
      option.value = ep.id;
      option.textContent = `${ep.episode} - ${ep.name}`;
      episodeFilter.appendChild(option);
    });
  }

  /**
   * Puebla el filtro de especies
   */
  populateSpeciesFilter() {
    const speciesFilter = this.elements.speciesFilter;
    
    // Limpiar opciones existentes (excepto la primera)
    while (speciesFilter.children.length > 1) {
      speciesFilter.removeChild(speciesFilter.lastChild);
    }
    
    // Agregar especies
    this.allSpecies.forEach(species => {
      const option = document.createElement('option');
      option.value = species;
      option.textContent = species;
      speciesFilter.appendChild(option);
    });
  }

  /**
   * Carga personajes según filtros actuales
   */
  async loadCharacters() {
    Utils.showLoading();
    Utils.hideError();
    
    try {
      let response;
      if (this.showingFavorites) {
        await this.loadFavoriteCharacters();
        return;
      }
      // Solo enviar filtros válidos (name, status, species)
      const filters = {
        name: this.currentFilters.name,
        status: this.currentFilters.status,
        species: this.currentFilters.species
      };
      response = await api.getCharactersWithFilters(filters, this.currentPage);
      this.characters = response.results;
      this.totalPages = response.info.pages;
      this.totalCharacters = response.info.count;
      this.renderCharacters(false);
      this.updateResultsDisplay();
      
    } catch (error) {
      console.error('Error al cargar personajes:', error);
      Utils.showError(APIHelpers.handleAPIError(error));
      this.characters = [];
      this.renderCharacters();
    } finally {
      Utils.hideLoading();
    }
  }

  /**
   * Renderiza las tarjetas de personajes
   * @param {boolean} append - Si es true, agrega los personajes al final. Si es false, reemplaza todo.
   */
  renderCharacters(append = false) {
    const grid = this.elements.charactersGrid;
    
    if (!append) {
      grid.innerHTML = '';
    }
    
    if (this.characters.length === 0 && !append) {
      const noResults = Utils.createElement('div', {
        className: 'no-results text-center'
      }, `
        <h3>No se encontraron personajes</h3>
        <p>Intenta ajustar tus filtros de búsqueda</p>
      `);
      grid.appendChild(noResults);
      return;
    }
    
    const startIndex = append ? grid.children.length : 0;
    const charactersToRender = append ? 
      this.characters.slice(startIndex) : 
      this.characters;
    
    charactersToRender.forEach((character, index) => {
      const card = this.createCharacterCard(character, startIndex + index);
      grid.appendChild(card);
    });
  }

  /**
   * Crea una tarjeta de personaje
   * @param {Object} character - Datos del personaje
   * @param {number} index - Índice del personaje
   * @returns {HTMLElement} Tarjeta del personaje
   */
  createCharacterCard(character, index) {
  const isFavorite = this.isFavorite(character.id);
    const card = Utils.createElement('div', {
      className: `character-card fade-in ${isFavorite ? 'favorite' : ''}`,
      dataset: { characterId: character.id, index }
    });
    
    const statusClass = Utils.getStatusClass(character.status);
    const formattedStatus = Utils.formatStatus(character.status);
    
    card.innerHTML = `
      <img class="character-image" src="${character.image}" alt="${character.name}" loading="lazy">
      <div class="character-info">
        <h3 class="character-name">${character.name}</h3>
        <div class="character-details">
          <div class="character-detail">
            <span class="status-indicator ${statusClass}"></span>
            <span>${formattedStatus}</span>
          </div>
          <div class="character-detail">
            <strong>Especie:</strong> ${character.species}
          </div>
          <div class="character-detail">
            <strong>Origen:</strong> ${character.origin.name}
          </div>
        </div>
        <div class="card-actions">
          <button class="favorite-btn" data-character-id="${character.id}" title="Agregar a favoritos">
            <span>⭐</span>
          </button>
          <button class="detail-btn" data-character-id="${character.id}" data-index="${index}">
            Ver Detalles
          </button>
        </div>
      </div>
    `;
    // Favorito
    const favBtn = card.querySelector('.favorite-btn');
    if (isFavorite) {
      favBtn.classList.add('active');
    } else {
      favBtn.classList.remove('active');
    }
    favBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleFavorite(character.id);
      favBtn.classList.toggle('active', this.isFavorite(character.id));
    });

    
    // Event listeners para la tarjeta
    card.addEventListener('click', (e) => {
      if (!e.target.classList.contains('detail-btn')) {
        this.showCharacterModal(character, index);
      }
    });
    
    const detailBtn = card.querySelector('.detail-btn');
    detailBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showCharacterModal(character, index);
    });
    
    return card;
  }

  /**
   * Muestra el modal de detalles del personaje
   * @param {Object} character - Datos del personaje
   * @param {number} index - Índice del personaje
   */
  async showCharacterModal(character, index) {
    this.currentCharacterIndex = index;
    
    try {
      // Mostrar información básica inmediatamente
      this.renderBasicCharacterInfo(character);
      this.openModal();
      
      // Cargar información adicional
      await this.loadCharacterDetails(character);
      
    } catch (error) {
      console.error('Error al mostrar detalles del personaje:', error);
      Utils.showError('Error al cargar los detalles del personaje.');
    }
  }

  /**
   * Renderiza información básica del personaje en el modal
   * @param {Object} character - Datos del personaje
   */
  renderBasicCharacterInfo(character) {
    const statusClass = Utils.getStatusClass(character.status);
    const formattedStatus = Utils.formatStatus(character.status);
    const formattedGender = Utils.formatGender(character.gender);
    
    this.elements.modalContent.innerHTML = `
      <div class="modal-character">
        <img class="modal-character-image" src="${character.image}" alt="${character.name}">
        <div class="modal-character-details">
          <div class="modal-character-info">
            <div class="info-group">
              <div class="info-label">Nombre</div>
              <div class="info-value">${character.name}</div>
            </div>
            <div class="info-group">
              <div class="info-label">Estado</div>
              <div class="info-value">
                <span class="status-indicator ${statusClass}"></span>
                ${formattedStatus}
              </div>
            </div>
            <div class="info-group">
              <div class="info-label">Especie</div>
              <div class="info-value">${character.species}</div>
            </div>
            <div class="info-group">
              <div class="info-label">Género</div>
              <div class="info-value">${formattedGender}</div>
            </div>
            <div class="info-group">
              <div class="info-label">Origen</div>
              <div class="info-value">${character.origin.name}</div>
            </div>
            <div class="info-group">
              <div class="info-label">Ubicación actual</div>
              <div class="info-value">${character.location.name}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="loading-episodes">
        <div class="spinner"></div>
        <p>Cargando episodios...</p>
      </div>
    `;
  }

  /**
   * Carga detalles adicionales del personaje
   * @param {Object} character - Datos del personaje
   */
  async loadCharacterDetails(character) {
    try {
      // Obtener IDs de episodios
      const episodeIds = APIHelpers.extractEpisodeIds(character.episode);
      
      if (episodeIds.length > 0) {
        // Cargar primeros 5 episodios
        const episodesToLoad = episodeIds.slice(0, 5);
        const episodes = await api.getMultipleEpisodes(episodesToLoad);
        
        this.renderEpisodes(episodes, character.episode.length);
      } else {
        this.renderNoEpisodes();
      }
      
    } catch (error) {
      console.error('Error al cargar episodios:', error);
      this.renderEpisodeError();
    }
  }

  /**
   * Renderiza la lista de episodios
   * @param {Array} episodes - Lista de episodios
   * @param {number} totalEpisodes - Total de episodios
   */
  renderEpisodes(episodes, totalEpisodes) {
    const loadingEpisodes = this.elements.modalContent.querySelector('.loading-episodes');
    if (loadingEpisodes) {
      loadingEpisodes.remove();
    }
    
    const episodesSection = Utils.createElement('div', {
      className: 'episodes-list'
    });
    
    episodesSection.innerHTML = `
      <h4 class="episodes-title">Episodios (${totalEpisodes} total, mostrando primeros 5)</h4>
      ${episodes.map(episode => `
        <div class="episode-item">
          ${APIHelpers.formatEpisode(episode)}
        </div>
      `).join('')}
    `;
    
    this.elements.modalContent.appendChild(episodesSection);
  }

  /**
   * Renderiza mensaje cuando no hay episodios
   */
  renderNoEpisodes() {
    const loadingEpisodes = this.elements.modalContent.querySelector('.loading-episodes');
    if (loadingEpisodes) {
      loadingEpisodes.innerHTML = '<p>No hay episodios disponibles</p>';
    }
  }

  /**
   * Renderiza error al cargar episodios
   */
  renderEpisodeError() {
    const loadingEpisodes = this.elements.modalContent.querySelector('.loading-episodes');
    if (loadingEpisodes) {
      loadingEpisodes.innerHTML = '<p>Error al cargar episodios</p>';
    }
  }

  /**
   * Abre el modal
   */
  openModal() {
    this.elements.modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    this.updateModalNavigation();
  }

  /**
   * Cierra el modal
   */
  closeModal() {
    this.elements.modalOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  /**
   * Muestra el personaje anterior en el modal
   */
  showPreviousCharacter() {
    if (this.currentCharacterIndex > 0) {
      const prevIndex = this.currentCharacterIndex - 1;
      const prevCharacter = this.characters[prevIndex];
      this.showCharacterModal(prevCharacter, prevIndex);
    }
  }

  /**
   * Muestra el siguiente personaje en el modal
   */
  showNextCharacter() {
    if (this.currentCharacterIndex < this.characters.length - 1) {
      const nextIndex = this.currentCharacterIndex + 1;
      const nextCharacter = this.characters[nextIndex];
      this.showCharacterModal(nextCharacter, nextIndex);
    }
  }

  /**
   * Actualiza la navegación del modal
   */
  updateModalNavigation() {
    this.elements.prevCharacter.disabled = this.currentCharacterIndex === 0;
    this.elements.nextCharacter.disabled = this.currentCharacterIndex === this.characters.length - 1;
  }

  /**
   * Renderiza la paginación
   */
  renderPagination() {
  // Eliminada la paginación
  }

  /**
   * Crea un botón de página
   * @param {string} text - Texto del botón
   * @param {number} page - Número de página
   * @param {boolean} disabled - Si está deshabilitado
   * @param {boolean} active - Si está activo
   * @returns {HTMLElement} Botón de página
   */
  createPageButton(text, page, disabled = false, active = false) {
    const btn = Utils.createElement('button', {
      className: `page-btn ${active ? 'active' : ''}`,
      disabled: disabled
    }, text);
    
    if (!disabled && page !== null) {
      btn.addEventListener('click', () => this.goToPage(page));
    }
    
    return btn;
  }

  /**
   * Va a una página específica
   * @param {number} page - Número de página
   */
  async goToPage(page) {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      await this.loadCharacters();
      Utils.smoothScrollTo('.characters-section', 100);
    }
  }

  /**
   * Maneja la búsqueda
   */
  async handleSearch() {
    const searchTerm = this.elements.searchInput.value.trim();
    this.currentFilters.name = searchTerm;
    this.currentPage = 1;
    await this.loadCharacters();
  }

  /**
   * Maneja cambios en los filtros
   */
  async handleFilterChange() {
    this.currentFilters.status = this.elements.statusFilter.value;
    this.currentFilters.species = this.elements.speciesFilter.value;
    this.currentPage = 1;
    await this.loadCharacters();
  }

  /**
   * Limpia todos los filtros
   */
  async clearAllFilters() {
    this.elements.searchInput.value = '';
    this.elements.statusFilter.value = '';
    this.elements.speciesFilter.value = '';
    this.elements.episodeFilter.value = '';
    
    this.currentFilters = {
      name: '',
      status: '',
      species: ''
    };
    
    this.currentPage = 1;
    this.showingFavorites = false;
    this.elements.favoritesBtn.classList.remove('active');
    await this.loadCharacters();
  }

  /**
   * Actualiza la visualización de resultados
   */
  updateResultsDisplay() {
    // Contar el número actual de personajes mostrados
    const currentShown = this.elements.charactersGrid.querySelectorAll('.character-card').length;
    const start = Math.max(1, currentShown - 19); // Si acabamos de cargar 20 más, empezar desde currentShown - 19
    const end = currentShown;
    Utils.updateResultsCount(`Mostrando ${start}-${end} de ${this.totalCharacters} personajes`, this.totalCharacters);
  }

  /**
   * Maneja eventos globales del teclado
   * @param {KeyboardEvent} e - Evento de teclado
   */
  handleGlobalKeyboard(e) {
    // Cerrar modal con Escape
    if (Utils.KeyboardManager.isEscapeKey(e) && this.elements.modalOverlay.classList.contains('active')) {
      this.closeModal();
    }
    
    // Navegación en modal con flechas
    if (this.elements.modalOverlay.classList.contains('active')) {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        this.showPreviousCharacter();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        this.showNextCharacter();
      }
    }
  }

  /**
   * Maneja el scroll para mostrar/ocultar botón back to top y cargar más personajes
   */
  handleScroll() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    
    // Mostrar/ocultar botón back to top
    if (scrollTop > 300) {
      this.elements.backToTop.classList.add('visible');
    } else {
      this.elements.backToTop.classList.remove('visible');
    }
    
    // Scroll infinito
    // Cargar más cuando falten 300px para llegar al final
    if (!this.showingFavorites && !this.loadingMore && 
        (windowHeight + scrollTop + 300 >= documentHeight)) {
      this.loadMoreCharacters();
    }
  }

  // SCROLL INFINITO
  async loadMoreCharacters() {
    if (this.loadingMore || this.showingFavorites || this.currentPage >= this.totalPages) return;
    try {
      this.loadingMore = true;
      
      // Mostrar indicador de carga
      const loadingIndicator = document.createElement('div');
      loadingIndicator.className = 'loading-more';
      loadingIndicator.innerHTML = '<div class="spinner"></div><p>Cargando más personajes...</p>';
      this.elements.charactersGrid.appendChild(loadingIndicator);
      
      this.currentPage++;
      const filters = {
        name: this.currentFilters.name,
        status: this.currentFilters.status,
        species: this.currentFilters.species
      };
      
      const response = await api.getCharactersWithFilters(filters, this.currentPage);
      if (response && response.results) {
        // Eliminar el indicador de carga
        loadingIndicator.remove();
        
        // Obtener el número actual de personajes antes de agregar más
        const currentCount = this.elements.charactersGrid.querySelectorAll('.character-card').length;
        
        this.characters = [...this.characters, ...response.results];
        this.renderCharacters(true); // true para append
        
        // Mostrar el incremento específico (últimos 20 personajes cargados)
        const newCount = this.elements.charactersGrid.querySelectorAll('.character-card').length;
        console.log(`Cargados ${newCount - currentCount} nuevos personajes (${currentCount + 1}-${newCount} de ${this.totalCharacters})`);
        
        this.updateResultsDisplay();
      }
    } catch (error) {
      console.error('Error al cargar más personajes:', error);
      this.currentPage--; // Revertir el incremento de página si hay error
    } finally {
      this.loadingMore = false;
    }
  }

  /**
   * Configura el botón back to top
   */
  setupBackToTop() {
    this.handleScroll(); // Verificar posición inicial
  }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  window.app = new RickAndMortyApp();
});

// Manejar errores globales
window.addEventListener('error', (e) => {
  console.error('Error global:', e.error);
  Utils.showError('Ha ocurrido un error inesperado. Por favor, recarga la página.');
});

// Manejar errores de promesas no capturadas
window.addEventListener('unhandledrejection', (e) => {
  console.error('Promesa rechazada no manejada:', e.reason);
  Utils.showError('Error de conexión. Por favor, verifica tu conexión a internet.');
});