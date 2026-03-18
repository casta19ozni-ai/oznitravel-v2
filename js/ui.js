// ===== FUNCIONES DE MODALES =====
function toggleModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.style.display = modal.style.display === 'flex' ? 'none' : 'flex';
}

function closeModalOnBgClick(event, modalId) {
    const modal = document.getElementById(modalId);
    if (event.target === modal) {
        modal.classList.remove('active');
    }
}

// ===== NAVEGACIÓN =====
function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function scrollTo(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

function toggleMenu() {
    const navMenu = document.getElementById('navMenu');
    navMenu.classList.toggle('active');
}

function toggleContactDropdown() {
    const dropdown = document.getElementById('contactDropdown');
    if (!dropdown) return;
    dropdown.classList.toggle('active');
}

// ===== CREW ON SHORE VIDEO =====
function onYouTubeIframeAPIReady() {
    crewPlayer = new YT.Player('crewVideo', {
        videoId: 'cABBzFK6_II',
        playerVars: {
            autoplay: 1,
            mute: 1,
            loop: 1,
            playlist: 'cABBzFK6_II',
            controls: 0,
            modestbranding: 1,
            rel: 0,
            fs: 0,
            iv_load_policy: 3
        },
        events: {
            onReady: onPlayerReady,
            onStateChange: onPlayerStateChange
        }
    });
}

function onPlayerReady(event) {
    event.target.playVideo();
}

function onPlayerStateChange(event) {
    // Optional: handle state changes
}

function crewVideoUnmute() {
    const btn = document.getElementById('crewVideoUnmuteBtn');
    if (!crewPlayer || !btn) return;

    if (crewPlayer.isMuted()) {
        crewPlayer.unMute();
        btn.textContent = i18n[currentLang]?.crew_mute || 'Silenciar sonido';
    } else {
        crewPlayer.mute();
        btn.textContent = i18n[currentLang]?.crew_unmute || 'Activar sonido';
    }
}

// ===== DESTINOS TRAVORIUM (LISTA INTERNA) =====
function toggleDestinationsList() {
    const panel = document.getElementById('travoriumDestinations');
    if (!panel) return;
    panel.style.display = panel.style.display === 'none' || panel.style.display === '' ? 'block' : 'none';
}

// ===== INFORMACIÓN DE EMPRESA =====
function goToVision() {
    alert('NUESTRA VISIÓN\n\nSer la plataforma número uno en Latinoamérica para viajeros que buscan experiencias premium, ahorro inteligente y servicios de conserjería personalizado.');
}

function goToMission() {
    alert('NUESTRA MISIÓN\n\nFacilitar viajes extraordinarios mediante membresías Travorium, asesoría personalizada y acceso a experiencias VIP, eliminando intermediarios y maximizando ahorro.');
}

function openPrivacyPolicy() {
    alert('POLÍTICA DE PRIVACIDAD\n\nTus datos están protegidos según GDPR. No compartimos información con terceros sin tu consentimiento.\n\nVer: [Enlace a página completa]');
}

function openTerms() {
    alert('TÉRMINOS DE SERVICIO\n\nAl utilizar OZNITRAVEL aceptas nuestros términos. Todas las reservas están sujetas a disponibilidad y políticas de cada proveedor.\n\nVer: [Enlace a página completa]');
}

// ===== CRM =====
function openCRMModule(moduleName) {
    alert(`Módulo CRM: ${moduleName.toUpperCase()}\n\nEste es un placeholder del módulo completo.\nEn producción se integraría con base de datos Supabase.\n\nNota: Implementar autenticación y permisos según rol.`);
}

function updateLanguageSwitcherUI(lang) {
    const buttons = document.querySelectorAll('#languageSwitcher button');
    buttons.forEach(btn => {
        const isActive = btn.getAttribute('onclick')?.includes(`'${lang}'`);
        btn.style.opacity = isActive ? '1' : '0.5';
        btn.style.fontWeight = isActive ? '700' : '400';
    });
}