/**
 * Spotify Daylist Exporter
 * Export Spotify Daylists / Playlists to .txt & 1-Click Spotify Import (Cmd+V)
 */

(function () {
  'use strict';

  // State
  let currentPlaylist = null;
  let currentAudio = null;
  let currentlyPlayingBtn = null;
  let importedTracks = [];

  // DOM Elements
  const spotifyUrlInput = document.getElementById('spotifyUrl');
  const fetchBtn = document.getElementById('fetchBtn');
  const clearBtn = document.getElementById('clearBtn');
  const sampleDaylistBtn = document.getElementById('sampleDaylistBtn');
  const pasteClipboardBtn = document.getElementById('pasteClipboardBtn');
  const alertBox = document.getElementById('alertBox');

  // Result Elements
  const resultCard = document.getElementById('resultCard');
  const playlistCover = document.getElementById('playlistCover');
  const playlistTitle = document.getElementById('playlistTitle');
  const playlistDescription = document.getElementById('playlistDescription');
  const trackCount = document.getElementById('trackCount');
  const totalDuration = document.getElementById('totalDuration');
  const openInSpotifyBtn = document.getElementById('openInSpotifyBtn');
  const tracksTableBody = document.getElementById('tracksTableBody');
  const trackSearch = document.getElementById('trackSearch');
  const selectAllCheckbox = document.getElementById('selectAllCheckbox');
  const selectedCountText = document.getElementById('selectedCountText');
  const toggleSelectAllBtn = document.getElementById('toggleSelectAllBtn');

  // Action Buttons
  const copyForSpotifyBtn = document.getElementById('copyForSpotifyBtn');
  const downloadTxtBtn = document.getElementById('downloadTxtBtn');
  const copyTxtBtn = document.getElementById('copyTxtBtn');
  const formatSelect = document.getElementById('formatSelect');
  const previewTxtToggle = document.getElementById('previewTxtToggle');
  const txtPreviewContainer = document.getElementById('txtPreviewContainer');
  const txtPreviewArea = document.getElementById('txtPreviewArea');
  const copyPreviewBtn = document.getElementById('copyPreviewBtn');

  // Tabs
  const navTabs = document.querySelectorAll('.nav-tab');
  const tabContents = document.querySelectorAll('.tab-content');

  // Import Tab Elements
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const importTextarea = document.getElementById('importTextarea');
  const parseImportBtn = document.getElementById('parseImportBtn');
  const clearImportBtn = document.getElementById('clearImportBtn');
  const importResults = document.getElementById('importResults');
  const importTracksCount = document.getElementById('importTracksCount');
  const importedPreviewList = document.getElementById('importedPreviewList');
  const copyImportedForSpotifyBtn = document.getElementById('copyImportedForSpotifyBtn');
  const copyImportedListBtn = document.getElementById('copyImportedListBtn');

  // Audio Player
  const miniPlayer = document.getElementById('miniPlayer');
  const miniPlayerTitle = document.getElementById('miniPlayerTitle');
  const miniPlayerArtist = document.getElementById('miniPlayerArtist');
  const miniPlayerCover = document.getElementById('miniPlayerCover');
  const miniPlayerPlayBtn = document.getElementById('miniPlayerPlayBtn');
  const miniPlayerPlayIcon = document.getElementById('miniPlayerPlayIcon');
  const miniPlayerCloseBtn = document.getElementById('miniPlayerCloseBtn');
  const globalAudio = document.getElementById('globalAudioPlayer');

  // Help Modal
  const helpBtn = document.getElementById('helpBtn');
  const helpModal = document.getElementById('helpModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const modalGotItBtn = document.getElementById('modalGotItBtn');
  const toastContainer = document.getElementById('toastContainer');

  const SAMPLE_DAYLIST_URL = 'https://open.spotify.com/playlist/37i9dQZF1FbEn59rE9ZAPD?si=054b4617bdd24acf';

  // --- INITIALIZATION ---
  init();

  function init() {
    bindEvents();
    checkUrlParams();
  }

  function bindEvents() {
    // Navigation Tabs
    navTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetTab = tab.getAttribute('data-tab');
        navTabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(targetTab).classList.add('active');
      });
    });

    // Input events
    spotifyUrlInput.addEventListener('input', () => {
      clearBtn.classList.toggle('hidden', !spotifyUrlInput.value.trim());
    });

    clearBtn.addEventListener('click', () => {
      spotifyUrlInput.value = '';
      clearBtn.classList.add('hidden');
      spotifyUrlInput.focus();
    });

    sampleDaylistBtn.addEventListener('click', () => {
      spotifyUrlInput.value = SAMPLE_DAYLIST_URL;
      clearBtn.classList.remove('hidden');
      loadPlaylist();
    });

    pasteClipboardBtn.addEventListener('click', async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text && text.includes('spotify.com')) {
          spotifyUrlInput.value = text.trim();
          clearBtn.classList.remove('hidden');
          loadPlaylist();
        } else {
          showToast('В буфере обмена нет ссылки на Spotify', 'info');
        }
      } catch (e) {
        showToast('Пожалуйста, вставьте ссылку вручную (Ctrl+V / Cmd+V)', 'info');
        spotifyUrlInput.focus();
      }
    });

    fetchBtn.addEventListener('click', loadPlaylist);

    spotifyUrlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        loadPlaylist();
      }
    });

    // Action buttons
    copyForSpotifyBtn.addEventListener('click', () => copyTracksForSpotify());
    downloadTxtBtn.addEventListener('click', downloadTxtFile);
    copyTxtBtn.addEventListener('click', copyFormattedTxt);
    formatSelect.addEventListener('change', updateTxtPreview);
    previewTxtToggle.addEventListener('click', () => {
      txtPreviewContainer.classList.toggle('hidden');
      if (!txtPreviewContainer.classList.contains('hidden')) {
        updateTxtPreview();
      }
    });
    copyPreviewBtn.addEventListener('click', copyFormattedTxt);

    // Track search & selection
    trackSearch.addEventListener('input', filterTracks);
    selectAllCheckbox.addEventListener('change', (e) => {
      const checked = e.target.checked;
      if (!currentPlaylist) return;
      currentPlaylist.tracks.forEach(t => t.selected = checked);
      renderTracksTable();
      updateSelectionStats();
      updateTxtPreview();
    });

    toggleSelectAllBtn.addEventListener('click', () => {
      if (!currentPlaylist) return;
      const allSelected = currentPlaylist.tracks.every(t => t.selected);
      const newStatus = !allSelected;
      currentPlaylist.tracks.forEach(t => t.selected = newStatus);
      selectAllCheckbox.checked = newStatus;
      renderTracksTable();
      updateSelectionStats();
      updateTxtPreview();
    });

    // Import Tab Events
    setupImportEvents();

    // Audio Player Events
    miniPlayerPlayBtn.addEventListener('click', toggleGlobalAudio);
    miniPlayerCloseBtn.addEventListener('click', stopAudio);
    globalAudio.addEventListener('ended', onAudioEnded);
    globalAudio.addEventListener('pause', onAudioPause);
    globalAudio.addEventListener('play', onAudioPlay);

    // Help Modal Events
    helpBtn.addEventListener('click', () => helpModal.classList.remove('hidden'));
    closeModalBtn.addEventListener('click', () => helpModal.classList.add('hidden'));
    modalGotItBtn.addEventListener('click', () => helpModal.classList.add('hidden'));
    helpModal.addEventListener('click', (e) => {
      if (e.target === helpModal) helpModal.classList.add('hidden');
    });
  }

  // --- PLAYLIST LOADING & PARSING ---

  async function loadPlaylist() {
    const rawUrl = spotifyUrlInput.value.trim();
    if (!rawUrl) {
      showAlert('Пожалуйста, введите ссылку на плейлист или Daylist Spotify', 'error');
      spotifyUrlInput.focus();
      return;
    }

    const playlistId = extractPlaylistId(rawUrl);
    if (!playlistId) {
      showAlert('Некорректная ссылка на Spotify. Ожидается вид https://open.spotify.com/playlist/...', 'error');
      return;
    }

    setLoading(true);
    hideAlert();

    try {
      // Primary attempt: fetch embed via Jina Reader with HTML return format
      const playlist = await fetchSpotifyEmbedData(playlistId);
      currentPlaylist = playlist;

      // Update URL without reload for easy sharing
      const newUrl = new URL(window.location);
      newUrl.searchParams.set('playlist', playlistId);
      window.history.replaceState({}, '', newUrl);

      displayPlaylist(playlist);
      showToast(`Успешно загружено: ${playlist.tracks.length} треков!`, 'success');
    } catch (err) {
      console.error('Fetch error:', err);
      // Fallback attempt: fetch markdown version
      try {
        const fallbackPlaylist = await fetchSpotifyEmbedMarkdown(playlistId);
        currentPlaylist = fallbackPlaylist;
        displayPlaylist(fallbackPlaylist);
        showToast(`Загружено через текстовый режим: ${fallbackPlaylist.tracks.length} треков!`, 'success');
      } catch (fallbackErr) {
        console.error('Fallback error:', fallbackErr);
        showAlert(`Не удалось загрузить плейлист: ${err.message || 'Ошибка сети'}. Убедитесь, что плейлист открыт или попробуйте еще раз через несколько секунд.`, 'error');
      }
    } finally {
      setLoading(false);
    }
  }

  function extractPlaylistId(url) {
    // Matches: https://open.spotify.com/playlist/37i9dQZF1FbEn59rE9ZAPD?si=...
    // or spotify:playlist:37i9dQZF1FbEn59rE9ZAPD
    // or 37i9dQZF1FbEn59rE9ZAPD
    const webMatch = url.match(/playlist\/([a-zA-Z0-9]+)/);
    if (webMatch) return webMatch[1];

    const uriMatch = url.match(/spotify:playlist:([a-zA-Z0-9]+)/);
    if (uriMatch) return uriMatch[1];

    if (/^[a-zA-Z0-9]{22}$/.test(url)) return url;
    return null;
  }

  async function fetchSpotifyEmbedData(playlistId) {
    const targetUrl = `https://open.spotify.com/embed/playlist/${playlistId}`;
    const proxyUrl = `https://r.jina.ai/${targetUrl}`;

    const response = await fetch(proxyUrl, {
      method: 'GET',
      headers: {
        'X-Return-Format': 'html'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s);

    if (!nextDataMatch) {
      throw new Error('Данные плейлиста не найдены в HTML');
    }

    const jsonData = JSON.parse(nextDataMatch[1]);
    const entity = jsonData?.props?.pageProps?.state?.data?.entity;

    if (!entity) {
      throw new Error('Некорректная структура данных плейлиста');
    }

    const tracks = (entity.trackList || []).map((t, idx) => {
      const uri = t.uri || '';
      const trackId = uri.replace('spotify:track:', '') || '';
      return {
        id: trackId,
        index: idx + 1,
        title: t.title || 'Unknown Title',
        artist: t.subtitle || 'Unknown Artist',
        uri: uri || (trackId ? `spotify:track:${trackId}` : ''),
        url: trackId ? `https://open.spotify.com/track/${trackId}` : '',
        durationMs: t.duration || 0,
        previewUrl: t.audioPreview?.url || null,
        selected: true
      };
    });

    let coverUrl = entity.coverArt?.sources?.[0]?.url || '';
    if (!coverUrl && entity.images?.[0]?.url) {
      coverUrl = entity.images[0].url;
    }

    return {
      id: playlistId,
      title: entity.title || entity.name || 'Daylist',
      subtitle: entity.subtitle || 'Spotify',
      description: entity.subtitle ? `Создано для вас • ${entity.subtitle}` : 'Персональный плейлист Spotify',
      cover: coverUrl || 'https://daylist.spotifycdn.com/playlist-covers-mix/en/evening_default.jpg',
      tracks: tracks
    };
  }

  async function fetchSpotifyEmbedMarkdown(playlistId) {
    const targetUrl = `https://open.spotify.com/embed/playlist/${playlistId}`;
    const proxyUrl = `https://r.jina.ai/${targetUrl}`;

    const response = await fetch(proxyUrl, { method: 'GET' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const markdown = await response.text();

    // Extract title
    let title = 'Spotify Playlist';
    const titleMatch = markdown.match(/Title:\s*(.+?)(?:\s*-\s*Spotify)?\n/);
    if (titleMatch) title = titleMatch[1].trim();

    // Extract cover image
    let cover = '';
    const imgMatch = markdown.match(/!\[.*?\]\((https:\/\/.*?\.jpg.*?)\)/);
    if (imgMatch) cover = imgMatch[1];

    // Extract tracks:
    // 1. ### Fell On Black Days
    // #### Soundgarden
    // 04:43
    const tracks = [];
    const regex = /(\d+)\.\s+###\s+([^\n]+)\s+####\s+(?:E\s+)?([^\n]+)\s+(\d{2}:\d{2})/g;
    let match;
    let idx = 1;

    while ((match = regex.exec(markdown)) !== null) {
      const trackTitle = match[2].trim();
      const trackArtist = match[3].trim();
      const durationStr = match[4].trim();
      const [min, sec] = durationStr.split(':').map(Number);
      const durationMs = (min * 60 + sec) * 1000;

      tracks.push({
        id: `t_${idx}`,
        index: idx,
        title: trackTitle,
        artist: trackArtist,
        uri: '',
        url: '',
        durationMs: durationMs,
        previewUrl: null,
        selected: true
      });
      idx++;
    }

    if (tracks.length === 0) {
      throw new Error('Не удалось извлечь треки из текстового ответа');
    }

    return {
      id: playlistId,
      title: title,
      subtitle: 'Spotify',
      description: 'Сформировано из Spotify Daylist',
      cover: cover,
      tracks: tracks
    };
  }

  // --- DISPLAY & RENDERING ---

  function displayPlaylist(playlist) {
    resultCard.classList.remove('hidden');

    playlistCover.src = playlist.cover;
    playlistCover.onerror = () => {
      playlistCover.src = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect width=%22100%22 height=%22100%22 fill=%22%23282828%22/><text x=%2250%22 y=%2255%22 font-size=%2235%22 fill=%22%231db954%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22>🎵</text></svg>';
    };

    playlistTitle.textContent = playlist.title;
    playlistDescription.textContent = playlist.description || 'Spotify Daylist';
    trackCount.textContent = `${playlist.tracks.length} треков`;

    const totalMs = playlist.tracks.reduce((acc, t) => acc + (t.durationMs || 0), 0);
    const totalMinutes = Math.round(totalMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    totalDuration.textContent = hours > 0 ? `~${hours} ч. ${mins} мин.` : `~${mins} мин.`;

    openInSpotifyBtn.href = `https://open.spotify.com/playlist/${playlist.id}`;

    selectAllCheckbox.checked = true;
    renderTracksTable();
    updateSelectionStats();
    updateTxtPreview();

    // Scroll smoothly to results
    resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderTracksTable(filterQuery = '') {
    if (!currentPlaylist) return;

    tracksTableBody.innerHTML = '';
    const q = filterQuery.toLowerCase().trim();

    const filtered = currentPlaylist.tracks.filter(t => {
      if (!q) return true;
      return t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q);
    });

    if (filtered.length === 0) {
      tracksTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 24px; color: var(--text-muted);">Ничего не найдено по запросу "${filterQuery}"</td></tr>`;
      return;
    }

    filtered.forEach(track => {
      const tr = document.createElement('tr');

      // Checkbox
      const tdCheck = document.createElement('td');
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = track.selected;
      cb.addEventListener('change', () => {
        track.selected = cb.checked;
        updateSelectionStats();
        updateTxtPreview();
      });
      tdCheck.appendChild(cb);

      // Index
      const tdNum = document.createElement('td');
      tdNum.style.color = 'var(--text-muted)';
      tdNum.textContent = track.index;

      // Play Preview Button
      const tdPlay = document.createElement('td');
      if (track.previewUrl) {
        const playBtn = document.createElement('button');
        playBtn.className = 'track-play-btn';
        playBtn.title = 'Прослушать 30 сек';
        playBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
        playBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          playAudioTrack(track, playBtn);
        });
        tdPlay.appendChild(playBtn);
      }

      // Title
      const tdTitle = document.createElement('td');
      tdTitle.className = 'track-row-title';
      tdTitle.textContent = track.title;

      // Artist
      const tdArtist = document.createElement('td');
      tdArtist.className = 'track-row-artist';
      tdArtist.textContent = track.artist;

      // Duration
      const tdDuration = document.createElement('td');
      tdDuration.className = 'text-right';
      tdDuration.style.color = 'var(--text-muted)';
      tdDuration.textContent = formatDuration(track.durationMs);

      // External Link
      const tdLink = document.createElement('td');
      if (track.url) {
        const link = document.createElement('a');
        link.href = track.url;
        link.target = '_blank';
        link.rel = 'noopener';
        link.className = 'track-open-link';
        link.title = 'Открыть в Spotify';
        link.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>';
        tdLink.appendChild(link);
      }

      tr.appendChild(tdCheck);
      tr.appendChild(tdNum);
      tr.appendChild(tdPlay);
      tr.appendChild(tdTitle);
      tr.appendChild(tdArtist);
      tr.appendChild(tdDuration);
      tr.appendChild(tdLink);

      tracksTableBody.appendChild(tr);
    });
  }

  function filterTracks() {
    renderTracksTable(trackSearch.value);
  }

  function updateSelectionStats() {
    if (!currentPlaylist) return;
    const total = currentPlaylist.tracks.length;
    const selected = currentPlaylist.tracks.filter(t => t.selected).length;
    selectedCountText.textContent = `Выбрано: ${selected} / ${total}`;
    selectAllCheckbox.checked = selected === total;
  }

  // --- AUDIO PREVIEW PLAYBACK ---

  function playAudioTrack(track, buttonElem) {
    if (currentAudio === track.previewUrl && !globalAudio.paused) {
      globalAudio.pause();
      return;
    }

    if (currentlyPlayingBtn) {
      currentlyPlayingBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
      currentlyPlayingBtn.classList.remove('playing');
    }

    currentAudio = track.previewUrl;
    currentlyPlayingBtn = buttonElem;

    globalAudio.src = track.previewUrl;
    globalAudio.play().then(() => {
      buttonElem.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>';
      buttonElem.classList.add('playing');

      // Update mini player
      miniPlayerTitle.textContent = track.title;
      miniPlayerArtist.textContent = track.artist;
      miniPlayerCover.style.backgroundImage = `url('${currentPlaylist?.cover || ''}')`;
      miniPlayerPlayIcon.innerHTML = '<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>';
      miniPlayer.classList.remove('hidden');
    }).catch(err => {
      console.warn('Playback error:', err);
      showToast('Не удалось воспроизвести аудио-превью', 'info');
    });
  }

  function toggleGlobalAudio() {
    if (globalAudio.paused) {
      globalAudio.play();
    } else {
      globalAudio.pause();
    }
  }

  function stopAudio() {
    globalAudio.pause();
    miniPlayer.classList.add('hidden');
    if (currentlyPlayingBtn) {
      currentlyPlayingBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
      currentlyPlayingBtn.classList.remove('playing');
    }
  }

  function onAudioEnded() {
    if (currentlyPlayingBtn) {
      currentlyPlayingBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
      currentlyPlayingBtn.classList.remove('playing');
    }
    miniPlayerPlayIcon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"></polygon>';
  }

  function onAudioPause() {
    if (currentlyPlayingBtn) {
      currentlyPlayingBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
      currentlyPlayingBtn.classList.remove('playing');
    }
    miniPlayerPlayIcon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"></polygon>';
  }

  function onAudioPlay() {
    if (currentlyPlayingBtn) {
      currentlyPlayingBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>';
      currentlyPlayingBtn.classList.add('playing');
    }
    miniPlayerPlayIcon.innerHTML = '<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>';
  }

  // --- EXPORT & COPY ENGINE ---

  function getSelectedTracks() {
    if (!currentPlaylist) return [];
    const selected = currentPlaylist.tracks.filter(t => t.selected);
    return selected.length > 0 ? selected : currentPlaylist.tracks;
  }

  function generateTxtContent(format) {
    const tracks = getSelectedTracks();
    if (!tracks.length) return '';

    return tracks.map((t, idx) => {
      switch (format) {
        case 'artist-title':
          return `${t.artist} — ${t.title}`;
        case 'numbered':
          return `${idx + 1}. ${t.artist} — ${t.title}`;
        case 'uri':
          return t.uri || `spotify:track:${t.id}`;
        case 'url':
          return t.url || `https://open.spotify.com/track/${t.id}`;
        case 'full':
          return `${idx + 1}. ${t.artist} — ${t.title} [${formatDuration(t.durationMs)}]${t.url ? ' (' + t.url + ')' : ''}`;
        default:
          return `${t.artist} — ${t.title}`;
      }
    }).join('\n');
  }

  function updateTxtPreview() {
    if (txtPreviewContainer.classList.contains('hidden') && !currentPlaylist) return;
    const format = formatSelect.value;
    txtPreviewArea.value = generateTxtContent(format);
  }

  // Copy for Spotify Cmd+V import (URIs or URLs)
  async function copyTracksForSpotify() {
    const tracks = getSelectedTracks();
    if (!tracks.length) {
      showToast('Нет выбранных треков для копирования', 'error');
      return;
    }

    // Spotify Desktop allows pasting either URIs (spotify:track:...) or URLs (https://open.spotify.com/track/...)
    // Prefer URIs, fallback to URLs or text
    const spotifyStrings = tracks.map(t => {
      if (t.uri) return t.uri;
      if (t.url) return t.url;
      return `${t.artist} - ${t.title}`;
    }).join('\n');

    try {
      await copyToClipboard(spotifyStrings);
      showSpotifyPasteModal(tracks.length);
    } catch (e) {
      showToast('Не удалось скопировать. Разрешите доступ к буферу обмена.', 'error');
    }
  }

  async function copyFormattedTxt() {
    const format = formatSelect.value;
    const text = generateTxtContent(format);
    if (!text) {
      showToast('Нет выбранных треков', 'error');
      return;
    }

    try {
      await copyToClipboard(text);
      showToast(`Скопировано ${getSelectedTracks().length} треков в формате .txt!`, 'success');
    } catch (e) {
      showToast('Не удалось скопировать', 'error');
    }
  }

  function downloadTxtFile() {
    const format = formatSelect.value;
    const text = generateTxtContent(format);
    if (!text) {
      showToast('Нет данных для скачивания', 'error');
      return;
    }

    const playlistName = (currentPlaylist?.title || 'daylist')
      .replace(/[^a-zA-Z0-9а-яА-ЯёЁ\-_ ]/g, '')
      .trim()
      .replace(/\s+/g, '_');

    const filename = `${playlistName}.txt`;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast(`Файл "${filename}" скачан!`, 'success');
  }

  function showSpotifyPasteModal(count) {
    showToast(`✅ Скопировано ${count} треков для Spotify!`, 'success');

    // Also trigger modal so user sees the instruction
    setTimeout(() => {
      helpModal.classList.remove('hidden');
    }, 400);
  }

  // --- IMPORT TAB (Restoring / Adding from .txt) ---

  function setupImportEvents() {
    // Drag & drop
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) {
        handleImportFile(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        handleImportFile(e.target.files[0]);
      }
    });

    parseImportBtn.addEventListener('click', parseImportText);

    clearImportBtn.addEventListener('click', () => {
      importTextarea.value = '';
      importResults.classList.add('hidden');
      fileInput.value = '';
      importedTracks = [];
    });

    copyImportedForSpotifyBtn.addEventListener('click', copyImportedForSpotify);
    copyImportedListBtn.addEventListener('click', copyImportedList);
  }

  function handleImportFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      importTextarea.value = e.target.result;
      parseImportText();
    };
    reader.readAsText(file);
  }

  function parseImportText() {
    const raw = importTextarea.value.trim();
    if (!raw) {
      showToast('Пожалуйста, вставьте текст или загрузите .txt файл', 'info');
      return;
    }

    const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    const parsed = [];

    lines.forEach((line, idx) => {
      // Ignore comments or empty
      if (line.startsWith('#') || line.startsWith('//')) return;

      // Check if Spotify URI
      const uriMatch = line.match(/(spotify:track:[a-zA-Z0-9]+)/);
      if (uriMatch) {
        parsed.push({
          index: idx + 1,
          raw: line,
          uri: uriMatch[1],
          url: `https://open.spotify.com/track/${uriMatch[1].replace('spotify:track:', '')}`,
          display: uriMatch[1]
        });
        return;
      }

      // Check if Spotify URL
      const urlMatch = line.match(/https:\/\/open\.spotify\.com\/track\/([a-zA-Z0-9]+)/);
      if (urlMatch) {
        parsed.push({
          index: idx + 1,
          raw: line,
          uri: `spotify:track:${urlMatch[1]}`,
          url: urlMatch[0],
          display: urlMatch[0]
        });
        return;
      }

      // Plain text track: "Artist - Title" or "1. Artist - Title"
      let clean = line.replace(/^\d+[\.\)]\s*/, '').trim(); // Remove leading number
      clean = clean.replace(/\[\d{2}:\d{2}\].*$/, '').trim(); // Remove duration if any
      clean = clean.replace(/\(https?:\/\/.*?\)/, '').trim(); // Remove trailing url if any

      if (clean) {
        parsed.push({
          index: idx + 1,
          raw: line,
          uri: '',
          url: '',
          display: clean
        });
      }
    });

    if (parsed.length === 0) {
      showToast('Не удалось распознать треки в тексте', 'error');
      return;
    }

    importedTracks = parsed;
    importTracksCount.textContent = parsed.length;
    importResults.classList.remove('hidden');

    // Render preview of imported tracks
    importedPreviewList.innerHTML = parsed.map(t => {
      return `<div><span style="color:var(--text-muted);">${t.index}.</span> ${escapeHtml(t.display)}</div>`;
    }).join('');

    showToast(`Распознано ${parsed.length} треков! Нажмите «Скопировать для Spotify»`, 'success');
  }

  async function copyImportedForSpotify() {
    if (!importedTracks.length) return;

    // If tracks have URIs, copy them; otherwise copy raw strings
    const output = importedTracks.map(t => t.uri || t.url || t.display).join('\n');

    try {
      await copyToClipboard(output);
      showToast(`✅ Скопировано ${importedTracks.length} треков для Spotify!`, 'success');
      helpModal.classList.remove('hidden');
    } catch (e) {
      showToast('Не удалось скопировать в буфер', 'error');
    }
  }

  async function copyImportedList() {
    if (!importedTracks.length) return;
    const output = importedTracks.map(t => t.display).join('\n');
    try {
      await copyToClipboard(output);
      showToast('Список скопирован как текст', 'success');
    } catch (e) {
      showToast('Ошибка копирования', 'error');
    }
  }

  // --- UTILITY FUNCTIONS ---

  function checkUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const playlistId = params.get('playlist');
    if (playlistId) {
      spotifyUrlInput.value = `https://open.spotify.com/playlist/${playlistId}`;
      clearBtn.classList.remove('hidden');
      loadPlaylist();
    }
  }

  function setLoading(isLoading) {
    const btnText = fetchBtn.querySelector('.btn-text');
    const spinner = fetchBtn.querySelector('.btn-spinner');

    if (isLoading) {
      btnText.textContent = 'Загрузка...';
      spinner.classList.remove('hidden');
      fetchBtn.disabled = true;
    } else {
      btnText.textContent = 'Получить треки';
      spinner.classList.add('hidden');
      fetchBtn.disabled = false;
    }
  }

  function showAlert(msg, type = 'error') {
    alertBox.textContent = msg;
    alertBox.className = `alert alert-${type}`;
    alertBox.classList.remove('hidden');
  }

  function hideAlert() {
    alertBox.classList.add('hidden');
  }

  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(20px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  async function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.top = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    if (!successful) throw new Error('execCommand copy failed');
  }

  function formatDuration(ms) {
    if (!ms) return '00:00';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

})();
