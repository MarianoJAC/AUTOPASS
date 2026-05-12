document.addEventListener('DOMContentLoaded', () => {
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.onsubmit = (e) => {
            e.preventDefault();
            alert('Gracias por comunicarse con AUTOPASS. Su mensaje ha sido enviado con éxito y un asesor lo contactará a la brevedad.');
            e.target.reset();
        };
    }
});
