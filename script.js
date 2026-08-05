// ============================================
// DISCOVER PLACES - MAIN JAVASCRIPT
// ============================================

// ============================================
// FIREBASE CONFIGURATION - YOUR CONFIG HERE
// ============================================
const firebaseConfig = {
    apiKey: "AIzaSyB28AzpT9kubVmwOcVLOCUlQz6EcxYOGF8",
    authDomain: "file-collector01.firebaseapp.com",
    databaseURL: "https://file-collector01-default-rtdb.firebaseio.com",
    projectId: "file-collector01",
    storageBucket: "file-collector01.firebasestorage.app",
    messagingSenderId: "685538831739",
    appId: "1:685538831739:web:ea00a889c5dea8095221de"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const storage = firebase.storage();

let places = [];
let originalPlaces = [];
let currentPlaceForQR = null;
let currentPlaceForDetails = null;
let tempEditImages = [];

// ============================================
// DRAG TO SCROLL VARIABLES
// ============================================
let isDragging = false;
let startX = 0;
let scrollLeftStart = 0;
let isAutoScrolling = true;

// ============================================
// DOM ELEMENTS
// ============================================
const searchInput = document.getElementById('searchInput');
const searchBtnIcon = document.getElementById('searchBtnIcon');
const searchResults = document.getElementById('searchResults');
const carouselTrack = document.getElementById('carouselTrack');
const carouselContainer = document.querySelector('.carousel-container');
const skeletonTrack = document.getElementById('skeletonTrack');
const hamburgerBtn = document.getElementById('hamburgerBtn');
const sideMenu = document.getElementById('sideMenu');
const menuOverlay = document.getElementById('menuOverlay');
const closeMenu = document.getElementById('closeMenu');
const themeToggle = document.getElementById('themeToggle');
const themeText = document.getElementById('themeText');

const qrModalOverlay = document.getElementById('qrModalOverlay');
const qrPlaceName = document.getElementById('qrPlaceName');
const qrImageContainer = document.getElementById('qrImageContainer');
const qrPlaceInfo = document.getElementById('qrPlaceInfo');
const downloadQrBtn = document.getElementById('downloadQrBtn');
const closeQrModal = document.getElementById('closeQrModal');

const detailsPanel = document.getElementById('detailsPanel');
const panelOverlay = document.getElementById('panelOverlay');
const detailsImageGrid = document.getElementById('detailsImageGrid');
const detailsTitle = document.getElementById('detailsTitle');
const detailsDescription = document.getElementById('detailsDescription');
const detailsDirectionBtn = document.getElementById('detailsDirectionBtn');
const detailsQrBtn = document.getElementById('detailsQrBtn');
const closePanel = document.getElementById('closePanel');
const btnEdit = document.getElementById('btnEdit');

const viewMode = document.getElementById('viewMode');
const editMode = document.getElementById('editMode');
const editDescription = document.getElementById('editDescription');
const editImagesGrid = document.getElementById('editImagesGrid');
const btnSave = document.getElementById('btnSave');
const btnCancel = document.getElementById('btnCancel');
const btnReset = document.getElementById('btnReset');

const offlineOverlay = document.getElementById('offlineOverlay');
const toastContainer = document.getElementById('toastContainer');
const imageViewerOverlay = document.getElementById('imageViewerOverlay');
const imageViewerImg = document.getElementById('imageViewerImg');
const imageViewerClose = document.getElementById('imageViewerClose');

// ============================================
// SECURITY: BLOCK DEV TOOLS
// ============================================
(function blockDevTools() {
    // Block F12
    document.addEventListener('keydown', function(e) {
        if (e.key === 'F12' || 
            (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i')) ||
            (e.ctrlKey && e.shiftKey && (e.key === 'J' || e.key === 'j')) ||
            (e.ctrlKey && (e.key === 'U' || e.key === 'u'))) {
            e.preventDefault();
            showToast('🔒 Developer tools are disabled.', 'warning');
            return false;
        }
    });

    // Block right-click
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        showToast('🔒 Right-click is disabled.', 'warning');
        return false;
    });

    // Block Ctrl+S (Save)
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && (e.key === 's' || e.key === 'S')) {
            e.preventDefault();
            showToast('🔒 Saving is disabled.', 'warning');
            return false;
        }
    });

    // Anti-debugging detection
    let element = new Image();
    Object.defineProperty(element, 'id', {
        get: function() {
            showToast('🔒 Developer tools detected!', 'error');
        }
    });
    console.log('%c', element);
})();

// ============================================
// TOAST SYSTEM
// ============================================
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = '';
    if (type === 'success') icon = '<span class="material-symbols-outlined">check_circle</span>';
    else if (type === 'error') icon = '<span class="material-symbols-outlined">error</span>';
    else if (type === 'warning') icon = '<span class="material-symbols-outlined">warning</span>';
    else icon = '<span class="material-symbols-outlined">info</span>';
    
    toast.innerHTML = `${icon} ${message}`;
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        if (toast.parentNode) toast.remove();
    }, 2700);
}

// ============================================
// OFFLINE DETECTION
// ============================================
function showOffline() { offlineOverlay.classList.add('active'); }
function hideOffline() { offlineOverlay.classList.remove('active'); }
window.addEventListener('online', () => { hideOffline(); showToast('Back online!', 'success'); });
window.addEventListener('offline', showOffline);
if (!navigator.onLine) showOffline();

// ============================================
// IMAGE FULL VIEWER
// ============================================
function openImageViewer(src) {
    imageViewerImg.src = src;
    imageViewerOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}
imageViewerClose.addEventListener('click', () => {
    imageViewerOverlay.classList.remove('active');
    document.body.style.overflow = '';
});
imageViewerOverlay.addEventListener('click', (e) => {
    if (e.target === imageViewerOverlay) {
        imageViewerOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && imageViewerOverlay.classList.contains('active')) {
        imageViewerOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }
});

// ============================================
// LOCAL STORAGE HELPERS
// ============================================
function getStorageKey(placeId) { return `place_edit_${placeId}`; }

function saveUserEdits(placeId, description, images) {
    const editData = { description, images, updatedAt: new Date().toISOString() };
    localStorage.setItem(getStorageKey(placeId), JSON.stringify(editData));
}

function resetUserEdits(placeId) {
    localStorage.removeItem(getStorageKey(placeId));
}

function loadUserEdits() {
    places.forEach((place, index) => {
        const saved = localStorage.getItem(getStorageKey(place.id));
        if (saved) {
            try {
                const editData = JSON.parse(saved);
                if (editData.description) {
                    places[index].fullDescription = editData.description;
                    places[index].shortDescription = editData.description.substring(0, 100) + '...';
                }
                if (editData.images && editData.images.length > 0) {
                    places[index].images = editData.images;
                }
            } catch (e) {
                console.error('Error loading saved edits:', e);
            }
        }
    });
}

// ============================================
// LOAD PLACES FROM FIREBASE
// ============================================
async function loadPlaces() {
    try {
        skeletonTrack.style.display = 'flex';
        carouselTrack.style.display = 'none';
        
        // Get data from Firebase Realtime Database
        const snapshot = await database.ref('places').once('value');
        const data = snapshot.val();
        
        if (data) {
            // Convert object to array
            places = Object.values(data);
            originalPlaces = JSON.parse(JSON.stringify(places));
            loadUserEdits();
            
            renderCarousel();
            skeletonTrack.style.display = 'none';
            carouselTrack.style.display = 'flex';
            setupDragScroll();
            showToast('✅ Places loaded successfully!', 'success');
        } else {
            throw new Error('No data found');
        }
    } catch (error) {
        console.error('Error loading places:', error);
        skeletonTrack.style.display = 'none';
        showToast('⚠️ Failed to load places. Please refresh.', 'error');
        showOffline();
    }
}

// ============================================
// UPDATE PLACE IN FIREBASE
// ============================================
async function updatePlaceInFirebase(placeId, updatedData) {
    try {
        // Find the place in the array
        const placeIndex = places.findIndex(p => p.id === placeId);
        if (placeIndex === -1) return false;
        
        // Update local data
        places[placeIndex] = { ...places[placeIndex], ...updatedData };
        
        // Update in Firebase
        await database.ref(`places/${placeId}`).update(updatedData);
        
        return true;
    } catch (error) {
        console.error('Error updating place:', error);
        return false;
    }
}

// ============================================
// RENDER CAROUSEL
// ============================================
function renderCarousel() {
    carouselTrack.innerHTML = '';
    // Create multiple copies for infinite scroll feel
    const allPlaces = [...places, ...places, ...places];
    allPlaces.forEach(place => {
        const card = createPlaceCard(place);
        carouselTrack.appendChild(card);
    });
}

function createPlaceCard(place) {
    const card = document.createElement('div');
    card.className = 'place-card';
    card.setAttribute('data-place-id', place.id);
    
    let imageContent;
    if (place.images && place.images[0]) {
        imageContent = `<img src="${place.images[0]}" alt="${place.name}" class="place-card-image" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"><div class="place-card-placeholder" style="display:none;">📍</div>`;
    } else {
        imageContent = '<div class="place-card-placeholder">📍</div>';
    }
    
    card.innerHTML = `
        <div class="place-card-image-container">
            ${imageContent}
            <span class="place-card-name-overlay">${place.name}</span>
        </div>
        <div class="place-card-body"><p class="place-card-desc">${place.shortDescription}</p></div>
        <div class="place-card-buttons">
            <button class="btn btn-info" onclick="event.stopPropagation(); openDetailsPanel(${place.id})"><span class="material-symbols-outlined">info</span>Full Info</button>
            <button class="btn btn-direction" onclick="event.stopPropagation(); openDirections(${place.latitude}, ${place.longitude})"><span class="material-symbols-outlined">directions</span></button>
            <button class="btn btn-qr" onclick="event.stopPropagation(); openQRModal(${place.id})"><span class="material-symbols-outlined">qr_code_2</span></button>
        </div>
    `;
    
    card.addEventListener('click', () => openDetailsPanel(place.id));
    return card;
}

// ============================================
// DRAG TO SCROLL
// ============================================
function setupDragScroll() {
    const container = carouselContainer;
    
    function pauseAutoScroll() {
        isAutoScrolling = false;
        carouselTrack.style.animationPlayState = 'paused';
    }
    
    function resumeAutoScroll() {
        isAutoScrolling = true;
        carouselTrack.style.animationPlayState = 'running';
        carouselTrack.style.transform = '';
        carouselTrack.style.transition = '';
    }
    
    container.addEventListener('mousedown', (e) => {
        if (e.target.closest('button')) return;
        isDragging = true;
        pauseAutoScroll();
        startX = e.pageX - container.offsetLeft;
        scrollLeftStart = container.scrollLeft;
        carouselTrack.style.cursor = 'grabbing';
        container.style.cursor = 'grabbing';
        e.preventDefault();
    });
    
    container.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.pageX - container.offsetLeft;
        const walk = (x - startX) * 2;
        container.scrollLeft = scrollLeftStart - walk;
    });
    
    container.addEventListener('mouseup', () => {
        if (!isDragging) return;
        isDragging = false;
        carouselTrack.style.cursor = 'grab';
        container.style.cursor = 'grab';
        clearTimeout(resumeAutoScroll.timeout);
        resumeAutoScroll.timeout = setTimeout(resumeAutoScroll, 2000);
    });
    
    container.addEventListener('mouseleave', () => {
        if (isDragging) {
            isDragging = false;
            carouselTrack.style.cursor = 'grab';
            container.style.cursor = 'grab';
            clearTimeout(resumeAutoScroll.timeout);
            resumeAutoScroll.timeout = setTimeout(resumeAutoScroll, 2000);
        }
    });
    
    container.addEventListener('touchstart', (e) => {
        if (e.target.closest('button')) return;
        isDragging = true;
        pauseAutoScroll();
        startX = e.touches[0].pageX - container.offsetLeft;
        scrollLeftStart = container.scrollLeft;
    }, { passive: false });
    
    container.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        const x = e.touches[0].pageX - container.offsetLeft;
        const walk = (x - startX) * 2;
        container.scrollLeft = scrollLeftStart - walk;
    }, { passive: false });
    
    container.addEventListener('touchend', () => {
        isDragging = false;
        clearTimeout(resumeAutoScroll.timeout);
        resumeAutoScroll.timeout = setTimeout(resumeAutoScroll, 3000);
    });
    
    carouselTrack.style.cursor = 'grab';
    container.style.cursor = 'grab';
    
    container.addEventListener('mouseenter', () => {
        if (!isDragging) {
            carouselTrack.style.animationPlayState = 'paused';
        }
    });
    
    container.addEventListener('mouseleave', () => {
        if (!isDragging && isAutoScrolling) {
            carouselTrack.style.animationPlayState = 'running';
        }
    });
}

// ============================================
// SEARCH
// ============================================
function performSearch() {
    const query = searchInput.value.trim().toLowerCase();
    searchResults.innerHTML = '';
    if (query.length === 0) { searchResults.classList.remove('active'); return; }
    
    const filtered = places.filter(place => 
        place.name.toLowerCase().includes(query) ||
        place.shortDescription.toLowerCase().includes(query) ||
        place.fullDescription.toLowerCase().includes(query)
    );
    
    if (filtered.length > 0) {
        filtered.forEach(place => {
            const resultItem = document.createElement('div');
            resultItem.className = 'search-result-item';
            let imageHtml = '';
            if (place.images && place.images[0]) {
                imageHtml = `<img src="${place.images[0]}" alt="${place.name}" class="search-result-image" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">`;
            }
            resultItem.innerHTML = `${imageHtml}<div class="search-result-placeholder" style="${place.images && place.images[0] ? 'display:none;' : 'display:flex;'}">${place.name.charAt(0)}</div><span class="search-result-name">${place.name}</span>`;
            resultItem.addEventListener('click', () => { openDetailsPanel(place.id); searchResults.classList.remove('active'); searchInput.value = ''; });
            searchResults.appendChild(resultItem);
        });
        searchResults.classList.add('active');
    } else {
        searchResults.innerHTML = '<div class="no-results">No places found</div>';
        searchResults.classList.add('active');
    }
}

searchInput.addEventListener('input', performSearch);
searchBtnIcon.addEventListener('click', performSearch);
searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') performSearch(); });
document.addEventListener('click', (e) => { if (!e.target.closest('.top-section')) searchResults.classList.remove('active'); });

// ============================================
// HAMBURGER MENU
// ============================================
hamburgerBtn.addEventListener('click', () => { sideMenu.classList.add('active'); menuOverlay.classList.add('active'); document.body.style.overflow = 'hidden'; });
closeMenu.addEventListener('click', closeSideMenu);
menuOverlay.addEventListener('click', closeSideMenu);
function closeSideMenu() { sideMenu.classList.remove('active'); menuOverlay.classList.remove('active'); document.body.style.overflow = ''; }

// ============================================
// DARK / LIGHT MODE
// ============================================
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') { document.documentElement.setAttribute('data-theme', 'dark'); themeToggle.checked = true; themeText.textContent = 'Light Mode'; }
themeToggle.addEventListener('change', () => {
    if (themeToggle.checked) { document.documentElement.setAttribute('data-theme', 'dark'); localStorage.setItem('theme', 'dark'); themeText.textContent = 'Light Mode'; }
    else { document.documentElement.removeAttribute('data-theme'); localStorage.setItem('theme', 'light'); themeText.textContent = 'Dark Mode'; }
});

// ============================================
// DIRECTIONS
// ============================================
function openDirections(lat, lng) { window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank'); }

// ============================================
// QR CODE MODAL
// ============================================
function openQRModal(placeId) {
    const place = places.find(p => p.id === placeId);
    if (!place) return;
    currentPlaceForQR = place;
    qrPlaceName.textContent = place.name;
    qrPlaceInfo.textContent = place.shortDescription;
    qrImageContainer.innerHTML = '';
    new QRCode(qrImageContainer, { text: `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`, width: 200, height: 200, colorDark: '#1a202c', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.H });
    qrModalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}
closeQrModal.addEventListener('click', () => { qrModalOverlay.classList.remove('active'); document.body.style.overflow = ''; });
qrModalOverlay.addEventListener('click', (e) => { if (e.target === qrModalOverlay) { qrModalOverlay.classList.remove('active'); document.body.style.overflow = ''; } });

// ============================================
// DOWNLOAD QR
// ============================================
downloadQrBtn.addEventListener('click', () => {
    if (!currentPlaceForQR) return;
    const canvas = qrImageContainer.querySelector('canvas');
    if (!canvas) return;
    const downloadCanvas = document.createElement('canvas');
    const ctx = downloadCanvas.getContext('2d');
    const qrSize = 300, padding = 30, textHeight = 60;
    downloadCanvas.width = qrSize + padding * 2;
    downloadCanvas.height = qrSize + padding * 2 + textHeight;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, downloadCanvas.width, downloadCanvas.height);
    ctx.drawImage(canvas, padding, padding, qrSize, qrSize);
    ctx.fillStyle = '#1a202c';
    ctx.font = 'bold 18px Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(currentPlaceForQR.name, downloadCanvas.width / 2, qrSize + padding + 25);
    const link = document.createElement('a');
    link.download = `${currentPlaceForQR.name.replace(/\s+/g, '_')}_QR.png`;
    link.href = downloadCanvas.toDataURL('image/png');
    link.click();
    showToast('QR code downloaded!', 'success');
});

// ============================================
// DETAILS PANEL
// ============================================
function openDetailsPanel(placeId) {
    const place = places.find(p => p.id === placeId);
    if (!place) return;
    currentPlaceForDetails = place;
    refreshViewMode(place);
    viewMode.style.display = 'block';
    editMode.style.display = 'none';
    detailsPanel.classList.add('active');
    panelOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function refreshViewMode(place) {
    detailsTitle.textContent = place.name;
    detailsDescription.textContent = place.fullDescription;
    detailsImageGrid.innerHTML = '';
    for (let i = 0; i < 4; i++) {
        if (place.images && place.images[i]) {
            const img = document.createElement('img');
            img.src = place.images[i];
            img.alt = `${place.name} - Image ${i + 1}`;
            img.loading = 'lazy';
            img.style.cursor = 'pointer';
            img.addEventListener('click', (e) => {
                e.stopPropagation();
                openImageViewer(place.images[i]);
            });
            img.onerror = function() { const ph = document.createElement('div'); ph.className = 'details-image-placeholder'; ph.textContent = '📷'; this.parentNode.replaceChild(ph, this); };
            detailsImageGrid.appendChild(img);
        } else {
            const placeholder = document.createElement('div');
            placeholder.className = 'details-image-placeholder';
            placeholder.textContent = '📷';
            detailsImageGrid.appendChild(placeholder);
        }
    }
    detailsDirectionBtn.onclick = () => openDirections(place.latitude, place.longitude);
    detailsQrBtn.onclick = () => openQRModal(place.id);
}

closePanel.addEventListener('click', closeDetailsPanel);
panelOverlay.addEventListener('click', closeDetailsPanel);
function closeDetailsPanel() { detailsPanel.classList.remove('active'); panelOverlay.classList.remove('active'); document.body.style.overflow = ''; }

// ============================================
// EDIT MODE
// ============================================
btnEdit.addEventListener('click', () => {
    if (!currentPlaceForDetails) return;
    const place = currentPlaceForDetails;
    editDescription.value = place.fullDescription;
    tempEditImages = place.images ? [...place.images] : [null, null, null, null];
    while (tempEditImages.length < 4) tempEditImages.push(null);
    renderEditImageSlots();
    updateSlotStates();
    viewMode.style.display = 'none';
    editMode.style.display = 'block';
    detailsPanel.scrollTop = 0;
});

function renderEditImageSlots() {
    const slots = editImagesGrid.querySelectorAll('.edit-image-slot');
    slots.forEach(slot => {
        const slotIndex = parseInt(slot.getAttribute('data-slot'));
        const existingImg = slot.querySelector('img');
        if (existingImg) existingImg.remove();
        
        if (tempEditImages[slotIndex]) {
            slot.classList.add('has-image');
            const img = document.createElement('img');
            img.src = tempEditImages[slotIndex];
            img.alt = `Image ${slotIndex + 1}`;
            slot.insertBefore(img, slot.firstChild);
        } else {
            slot.classList.remove('has-image');
        }
    });
}

function updateSlotStates() {
    const slots = editImagesGrid.querySelectorAll('.edit-image-slot');
    slots.forEach((slot, index) => {
        const fileInput = slot.querySelector('.edit-file-input');
        if (index === 0) {
            slot.classList.remove('slot-locked');
            fileInput.disabled = false;
        } else {
            if (tempEditImages[index - 1]) {
                slot.classList.remove('slot-locked');
                fileInput.disabled = false;
            } else {
                slot.classList.add('slot-locked');
                fileInput.disabled = true;
            }
        }
    });
}

function isDuplicateImage(newSrc) {
    return tempEditImages.some(img => img && img === newSrc);
}

document.querySelectorAll('.edit-file-input').forEach(input => {
    input.addEventListener('change', function() {
        const slotIndex = parseInt(this.getAttribute('data-slot'));
        const file = this.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const newSrc = e.target.result;
            if (isDuplicateImage(newSrc)) {
                showToast('⚠️ This image is already added to another slot!', 'warning');
                return;
            }
            tempEditImages[slotIndex] = newSrc;
            renderEditImageSlots();
            updateSlotStates();
            showToast('📷 Image added successfully!', 'success');
        };
        reader.readAsDataURL(file);
        this.value = '';
    });
});

// Save
btnSave.addEventListener('click', async () => {
    if (!currentPlaceForDetails) return;
    
    const newDescription = editDescription.value.trim();
    if (!newDescription) {
        showToast('Please enter a description.', 'error');
        return;
    }
    
    const cleanImages = [];
    tempEditImages.forEach(img => { if (img) cleanImages.push(img); });
    
    const placeId = currentPlaceForDetails.id;
    const updatedData = {
        fullDescription: newDescription,
        shortDescription: newDescription.substring(0, 100) + '...',
        images: cleanImages
    };
    
    const success = await updatePlaceInFirebase(placeId, updatedData);
    
    if (success) {
        const placeIndex = places.findIndex(p => p.id === placeId);
        currentPlaceForDetails = places[placeIndex];
        refreshViewMode(currentPlaceForDetails);
        renderCarousel();
        setupDragScroll();
        viewMode.style.display = 'block';
        editMode.style.display = 'none';
        saveUserEdits(placeId, newDescription, cleanImages);
        showToast('✅ Changes saved to Firebase!', 'success');
    } else {
        showToast('❌ Failed to save changes. Please try again.', 'error');
    }
});

// Cancel
btnCancel.addEventListener('click', () => {
    viewMode.style.display = 'block';
    editMode.style.display = 'none';
    if (currentPlaceForDetails) refreshViewMode(currentPlaceForDetails);
});

// Reset
btnReset.addEventListener('click', async () => {
    if (!currentPlaceForDetails || !confirm('Reset this place to original content? This cannot be undone.')) return;
    const original = originalPlaces.find(p => p.id === currentPlaceForDetails.id);
    if (!original) return;
    
    const placeId = currentPlaceForDetails.id;
    const resetData = {
        fullDescription: original.fullDescription,
        shortDescription: original.shortDescription,
        images: original.images || []
    };
    
    const success = await updatePlaceInFirebase(placeId, resetData);
    
    if (success) {
        resetUserEdits(placeId);
        currentPlaceForDetails = places.find(p => p.id === placeId);
        refreshViewMode(currentPlaceForDetails);
        renderCarousel();
        setupDragScroll();
        viewMode.style.display = 'block';
        editMode.style.display = 'none';
        showToast('🔄 Reset to original!', 'info');
    } else {
        showToast('❌ Failed to reset. Please try again.', 'error');
    }
});

// ============================================
// KEYBOARD SHORTCUTS
// ============================================
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (imageViewerOverlay.classList.contains('active')) {
            imageViewerOverlay.classList.remove('active');
            document.body.style.overflow = '';
            return;
        }
        if (detailsPanel.classList.contains('active')) closeDetailsPanel();
        if (qrModalOverlay.classList.contains('active')) { qrModalOverlay.classList.remove('active'); document.body.style.overflow = ''; }
        if (sideMenu.classList.contains('active')) closeSideMenu();
    }
    if ((e.ctrlKey && e.key === 'k') || (e.key === '/' && !e.ctrlKey && document.activeElement !== searchInput)) {
        e.preventDefault();
        searchInput.focus();
    }
});

// ============================================
// INITIALIZE
// ============================================
loadPlaces();
console.log('🚀 Discover Places ready!');
console.log('🖱️ Drag to scroll cards');
console.log('📱 Touch swipe supported');
