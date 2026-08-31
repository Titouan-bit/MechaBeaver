const headerStyle = `
<style>
.topbar {
    height: 80px;
    background: linear-gradient(135deg, #138808 0%, #05501c 100%);
    padding: 15px 20px;
    display: flex;
    align-items: center;
    box-sizing: border-box;
}

#Mascotte-topbar {
    width: 107px;
    height: 100px;
    flex-shrink: 0;
}

#zone-name {
    color: #E29D29;
    font-family: 'Orbitron', sans-serif;
    font-weight: 700;
    font-size: 40px;
    margin-left: 10px;
    display: inline-block;
    transform: scaleY(1.4);
    cursor: pointer;
    height: auto;
}

.AllText {
    font-family: 'Quicksand', sans-serif;
}

#settingsbox {
    margin-left: auto;
    display: flex;
    align-items: center;
    cursor: pointer;
    padding-right: 15px;
}

.tiny-icon {
    width: 30px;
    height: 30px;
    object-fit: contain;
}

#Settings {
    font-size: 30px;
    color: white;
}

#SettingsRow {
    margin-right: 5px;
}

#settingsDisplay {
    display: none;
    background: linear-gradient(135deg, #0B132B, #1C2541);
    width: 200px;
    height: 400px;
    flex-direction: column;
    border-radius: 20px;
    position: absolute;
    top: 120px;
    left: 85%;
    user-select: none;
    z-index: 9999;
    padding: 10px;
    box-sizing: border-box;
}

#settingsDisplay.bright-theme {
    background: linear-gradient(135deg, #cbf803, #ceb604);
}

#settingsDisplay.dark-theme {
    background: linear-gradient(135deg, #0B132B, #1C2541);
}

#ChooseYourStyle {
    text-align: left;
    color: white;
    width: 100%;
    font-size: 20px;
    margin: 15px 0 5px 0;
}

#modeSVG {
    justify-content: space-between;
    display: flex;
    align-items: center;
    width: 100%;
    height: auto;
    margin-top: 10px;
}

#moon {
    margin-right: 5px;
    margin-top: 0;
}

#sun {
    margin-left: 5px;
    margin-top: 0;
}

#sun:hover {
    cursor: pointer;
    stroke: #ddf50b;
    transform: scale(1.15);
}

#moon:hover {
    cursor: pointer;
    fill: #4A90E2;
    stroke: #7EB6FF;
    transform: scale(1.15);
}

#or {
    color: white;
    font-size: 16px;
    margin: 0;
}

#headerSettings fieldset {
    display: flex;
    align-items: center;
    padding: 0;
    margin: 0;
    border: none;
    height: 45px;
}

#pSettingsDisplay {
    margin-left: 5px;
    color: white;
    margin-right: auto;
    font-size: 20px;
}

#line {
    height: 2px;
    width: 100%;
    background-color: #2a2e3d;
    margin-top: 2px;
}

.closeSVG:hover {
    cursor: pointer;
    transform: scale(1.45);
}
</style>
`;

const topbarHTML = `
${headerStyle}
<div class="topbar">
    <div>
        <img src="../Mascotte.png" id="Mascotte-topbar">
    </div>
    <div id="zone-name">
        <p><strong>MECHA-BEAVER</strong></p>
    </div>
    <div id="settingsbox">
        <svg class="tiny-icon" id="SettingsRow" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
            <circle cx="12" cy="12" r="3"></circle>
        </svg>
        <p class="AllText" id="Settings">Settings</p>
    </div>
</div>

<div id="settingsDisplay">
    <div id="headerSettings">
        <fieldset>
            <svg class="tiny-icon" id="SettingsRowDisplay" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                <circle cx="12" cy="12" r="3"></circle>
            </svg>
            <p id="pSettingsDisplay">Settings</p>
            <svg class="closeSVG" id="closeSettings" width="13" height="13" viewBox="0 0 150 150" fill="#F85149">
                <path d="M 120 0 L 150 30 L 105 75 L 150 120 L 120 150 L 75 105 L 30 150 L 0 120 L 45 75 L 0 30 L 30 0 L 75 45 Z"/>
            </svg>
        </fieldset>
        <div id="line"></div>
    </div>
    <div>
        <p id="ChooseYourStyle">Choose the style:</p>
    </div>
    <div id="modeSVG">
        <img id="sun" src="../sun.png" width="48" height="48">
        <p id="or">OR</p>
        <svg id="moon" width="48" height="48" viewBox="0 0 24 24" fill="#1B263B" stroke="#415A77" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        </svg>
    </div>
    <a href="https://mechabeaverbot.netlify.app/rules" style="color: #4A90E2; margin-top: 15px; display: block;">Rules</a>
</div>
`;

document.addEventListener('DOMContentLoaded', () => {
    const headerElement = document.getElementById('main-header');
    if (headerElement) {
        headerElement.innerHTML = topbarHTML;
        initTopbarEvents();
    }
});

function initTopbarEvents() {
    const settingsbox = document.getElementById('settingsbox');
    const settingsDisplay = document.getElementById('settingsDisplay');
    const sun = document.getElementById('sun');
    const moon = document.getElementById('moon');
    const closeSettings = document.getElementById('closeSettings');
    const zoneName = document.getElementById('zone-name');

    let isDragging = false;
    let offsetX = 0;
    let offsetY = 0;

    function setTheme(theme) {
        const isDark = (theme === 'dark');
        document.body.classList.toggle("dark-theme", isDark);
        document.body.classList.toggle("bright-theme", !isDark);
        if (settingsDisplay) {
            settingsDisplay.classList.toggle("dark-theme", isDark);
            settingsDisplay.classList.toggle("bright-theme", !isDark);
        }
        localStorage.setItem('theme', theme);
    }

    const savedTheme = localStorage.getItem('theme') || 'bright';
    setTheme(savedTheme);

    if (settingsbox && settingsDisplay) {
        settingsbox.addEventListener('click', () => {
            settingsDisplay.style.display = "flex";
        });
    }

    if (sun) {
        sun.addEventListener('click', () => setTheme('bright'));
    }

    if (moon) {
        moon.addEventListener('click', () => setTheme('dark'));
    }


    if (closeSettings && settingsDisplay) {
        closeSettings.addEventListener('click', () => {
            settingsDisplay.style.display = "none";
        });
    }

    if (zoneName) {
        zoneName.addEventListener('click', () => {
            window.location.href = "https://mechabeaverbot.netlify.app/";
        });
    }

    if (settingsDisplay) {
        settingsDisplay.addEventListener('mousedown', (e) => {
            if (e.target === closeSettings) return;
            isDragging = true;
            const rect = settingsDisplay.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
            settingsDisplay.style.transform = 'none';

            let newLeft = e.clientX - offsetX;
            let newTop = e.clientY - offsetY;

            const maxLeft = window.innerWidth - settingsDisplay.offsetWidth;
            const maxTop = window.innerHeight - settingsDisplay.offsetHeight;

            newLeft = Math.max(0, Math.min(newLeft, maxLeft));
            newTop = Math.max(0, Math.min(newTop, maxTop));

            settingsDisplay.style.left = `${newLeft}px`;
            settingsDisplay.style.top = `${newTop}px`;
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
    }
}