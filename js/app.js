// ===== CONFIGURACIÓN GLOBAL =====
const WHATSAPP_NUMBER = '593983977320';
const APP_DOWNLOAD_URL = './oznitravel-app.apk';
var crewPlayer;

// ===== CRM INTERNO (NO VISIBLE) =====
async function sendLeadToApi(payload) {
    try {
        await fetch('/api/lead', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
    } catch (e) {
        console.warn('Lead logging failed (non crítico)', e);
    }
}

// ===== WHATSAPP HANDLING =====
function handleWhatsApp(message, meta = {}) {
    const {
        destination: destino = null,
        actionType: accion = 'WhatsApp',
        source: origen = null,
        name: nombre = null,
        email = null,
        phone: telefono = null
    } = meta || {};

    sendLeadToApi({
        nombre,
        email,
        telefono,
        destino,
        accion,
        origen
    });

    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
}

function handleAppDownload() {
    sendLeadToApi({
        nombre: null,
        email: null,
        telefono: null,
        destino: null,
        accion: 'Descargar App',
        origen: 'header'
    });
    // The <a> element's href + download attribute will handle the file download.
}

// ===== FORMULARIOS =====
function handleConciergeForm(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const name = formData.get('name');
    const email = formData.get('email');
    const phone = formData.get('phone');
    const destination = formData.get('destination');
    const preferences = formData.get('preferences');

    const message = `Nueva solicitud de conserjería:\nNombre: ${name}\nEmail: ${email}\nTeléfono: ${phone}\nDestino: ${destination}\nPreferencias: ${preferences}`;

    sendLeadToApi({
        nombre: name,
        email: email,
        telefono: phone,
        destino: destination,
        accion: 'Formulario',
        origen: 'concierge_modal'
    });

    handleWhatsApp(message, {
        destination: destination,
        actionType: 'Formulario',
        source: 'concierge_modal',
        name: name,
        email: email,
        phone: phone
    });
    toggleModal('conciergeModal');
    trackEvent('concierge_form_submit');
}

// ===== AFILIADOS =====
function openAffiliate(url) {
    window.open(url, '_blank');
}

function openTravelpayouts() {
    window.open('https://app.travelpayouts.com/whitelabels/web/2947/code', '_blank');
}

// ===== DESCARGA DE APP =====
function initAppDownloadLink() {
    const downloadButton = document.getElementById('downloadAppBtn');
    if (!downloadButton) return;

    const downloadUrl = './oznitravel-app.apk';
    downloadButton.href = downloadUrl;
    downloadButton.download = 'oznitravel-app.apk';
}

// ===== DESTINOS TRAVORIUM (LISTA INTERNA) =====
function openDestinationWhatsApp(destinationName, actionType) {
    const baseInfoMessage = `Hola, me interesa el destino ${destinationName}. ¿Podría enviarme información y disponibilidad?`;
    let message = baseInfoMessage;

    if (actionType === 'Información') {
        message = `Hola, me interesa el destino ${destinationName}. ¿Podría enviarme más información, ejemplos de hoteles y detalles de la experiencia?`;
    } else if (actionType === 'Disponibilidad') {
        message = `Hola, me interesa la disponibilidad para el destino ${destinationName}. ¿Podría indicarme fechas, tarifas y opciones actuales?`;
    }

    handleWhatsApp(message, {
        destination: destinationName,
        actionType: actionType || 'Información',
        source: 'destinations_section'
    });
}

// ===== ANALÍTICA (PLACEHOLDERS GA4/MIXPANEL) =====
function trackEvent(eventName, eventParams = {}) {
    // Placeholder para Google Analytics 4
    if (typeof gtag !== 'undefined') {
        gtag('event', eventName, eventParams);
    }

    // Placeholder para Mixpanel
    if (typeof mixpanel !== 'undefined') {
        mixpanel.track(eventName, eventParams);
    }

    console.log(`📊 Event: ${eventName}`, eventParams);
}

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', function() {
    trackEvent('page_view');

    const stored = getStoredLang();
    const initialLang = stored || getBrowserLang();
    setLanguage(initialLang);

    // Inicializa el enlace de descarga de la app.
    initAppDownloadLink();

    console.log('✅ OZNITRAVEL cargado correctamente');
});

// Cerrar modal al presionar ESC
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        document.querySelectorAll('.modal.active').forEach(modal => {
            modal.classList.remove('active');
        });
    }
});