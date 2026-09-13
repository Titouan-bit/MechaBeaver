const zoneName = document.getElementById('zone-name');
const settingsbox = document.getElementById('settingsbox');
const settingsDisplay = document.getElementById('settingsDisplay');
const sun = document.getElementById('sun');
const moon = document.getElementById('moon');
const closeSettings = document.getElementById('closeSettings');
const PopUpAdd = document.getElementById('PopUpAdd');
const AddToWhatsApp = document.getElementById('AddToWhatsApp');
const buttonIAgree = document.getElementById('buttonIAgree');
const AddToWhatsAppBis = document.getElementById('AddToWhatsAppBis');
const closeAddToWhatsapp = document.getElementById('closeAddToWhatsapp');
const closeVerifyCode = document.getElementById('closeVerifyCode');
const verifyCode = document.getElementById('verifyCode');
const codeInput = document.getElementById('codeInput');
const OK = document.getElementById('OK');

let isDragging = false;
let offsetX = 0;
let offsetY = 0;

let highestZIndex = 100;

function bringToFront(element) {
    highestZIndex++;
    element.style.zIndex = highestZIndex;
}

function setTheme(theme) {
    const isDark = (theme === 'dark');
    
    document.body.classList.toggle("dark-theme", isDark);
    document.body.classList.toggle("bright-theme", !isDark);
    settingsDisplay.classList.toggle("dark-theme", isDark);
    settingsDisplay.classList.toggle("bright-theme", !isDark);
    
    localStorage.setItem('theme', theme);
}

settingsbox.addEventListener('click', function(){
    settingsDisplay.style.display = "flex";
});

sun.addEventListener('click', function(){
    settingsDisplay.classList.remove("dark-theme");
    settingsDisplay.classList.add("bright-theme");
    document.body.classList.remove("dark-theme");
    document.body.classList.add("bright-theme");
    localStorage.setItem('theme', 'bright');
});

moon.addEventListener('click', function(){
    settingsDisplay.classList.remove("bright-theme");
    settingsDisplay.classList.add("dark-theme");
    document.body.classList.remove("bright-theme");
    document.body.classList.add("dark-theme");
    localStorage.setItem('theme', 'dark');
});

closeSettings.addEventListener('click', function(){
    settingsDisplay.style.display = "none";
});

closeVerifyCode.addEventListener('click', function(){
    verifyCode.style.display = "none";
})


const savedTheme = localStorage.getItem('theme') || 'bright';
setTheme(savedTheme);

settingsDisplay.addEventListener('mousedown', (e) => {
    if (e.target === closeSettings) return;
    isDragging = true;
    
    const rect = settingsDisplay.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    
    bringToFront(settingsDisplay);
});

document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    e.preventDefault();
    
    let newLeft = e.clientX - offsetX;
    let newTop = e.clientY - offsetY;

    const maxLeft = window.innerWidth - settingsDisplay.offsetWidth;
    const maxTop = window.innerHeight - settingsDisplay.offsetHeight;

    newLeft = Math.max(0, Math.min(newLeft, maxLeft));
    newTop = Math.max(0, Math.min(newTop, maxTop));

    settingsDisplay.style.transform = 'none';
    settingsDisplay.style.left = `${newLeft}px`;
    settingsDisplay.style.top = `${newTop}px`;
});

document.addEventListener('mouseup', () => {
    isDragging = false;
});

zoneName.addEventListener('click', function(){
    window.location.href = "https://mechabeaverbot.netlify.app/";
});

AddToWhatsApp.addEventListener('click', function(){
    PopUpAdd.style.display = "flex";
});

buttonIAgree.addEventListener('click', function(){
    PopUpAdd.style.display = "none";
    AddToWhatsAppBis.style.display = "flex";
});

closeAddToWhatsapp.addEventListener('click', function(){
    AddToWhatsAppBis.style.display = "none";
})



document.addEventListener('DOMContentLoaded', () => {
    const digits = document.querySelectorAll('.digits-box .digit');

    digits.forEach((input, index) => {
        input.addEventListener('input', () => {
            if (input.value.length === 1 && index < digits.length - 1) {
                digits[index + 1].focus();
            }
        });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && input.value === '' && index > 0) {
                digits[index - 1].focus();
            }
        });
        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const pastedData = (e.clipboardData || window.clipboardData).getData('text').trim();
            const numbersOnly = pastedData.replace(/\D/g, '');

            numbersOnly.split('').forEach((char, i) => {
                if (digits[i]) {
                    digits[i].value = char;
                }
            });

            const nextIndex = Math.min(numbersOnly.length, digits.length - 1);
            digits[nextIndex].focus();
        });
    });
});

const btn = document.getElementById('sendTheCode');
let secretCode = null;
let phoneNumber = null;
if (!btn) {
    console.log('error');
} else {
    btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const prefix = document.querySelector('.prefix-box')?.value.replace('+', '') || '33';
        let numberDigits = '';
        document.querySelectorAll('.digit').forEach(input => {
            numberDigits += input.value.trim();
        });

        phoneNumber = prefix + numberDigits;
        secretCode = String(Number(numberDigits) * 2);

        try {
            const response = await fetch('https://mechabeaver.onrender.com/send-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    phoneNumber: phoneNumber,
                    code: secretCode
                })
            });

            const data = await response.json();

            if (data.success) {
                alert('Code envoyé !');
                verifyCode.style.display = "flex";
                AddToWhatsAppBis.style.display = "none";
            } else {
                alert('Erreur : ' + (data.message || data.error));
            }
        } catch (error) {
            console.error('Erreur :', error);
            alert('Impossible de contacter le serveur.');
        }

    });
}

let ItIsGood = null;
OK.addEventListener('click', function(){
    if (codeInput) {
        const EnteredCode = codeInput.value;
        if (EnteredCode == secretCode) {
            fetch('https://mechabeaver.onrender.com/send-HelloMessage', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    phoneNumber: phoneNumber
                })
            })
            .then(response => response.json())
            .then(function(data) {
                alert(data.message);
            })
            .catch(function(error) {
                alert(error.message);
            });
        }
    }
});


console.log('worked');