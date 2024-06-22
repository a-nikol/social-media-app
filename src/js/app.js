//test
// const APP_ID = '193CD7BC-6A6F-43A4-938B-7B7B47BE8C77';
// const API_KEY = '58EF9EE2-FE94-4F84-AC00-1C806F50866E';

// nure
const APP_ID = '2327A49D-933A-4542-8286-C3605436DF7A';
const API_KEY = '280985DA-6930-47F4-A023-E6689FEEE7DF';

Backendless.serverURL = 'https://api.backendless.com';
Backendless.initApp(APP_ID, API_KEY);

document.getElementById("logout").addEventListener("click", function (event) {
    event.preventDefault();
    Backendless.UserService.logout()
        .then(function () {
            console.log("User logged out");
            window.location.href = "login.html";
        })
        .catch(function (error) {
            console.error("Logout error", error);
        });
});

function showPopup(message) {
    const overlay = document.getElementById('overlay');
    const popup = document.getElementById('popup');
    const popupMessage = document.getElementById('popupMessage');
    const closeMessage = document.getElementById('closeMessage');

    popupMessage.textContent = message;
    closeMessage.textContent = "This window will close automatically within 3 seconds";
    overlay.classList.remove('hidden');
    popup.classList.remove('hidden');

    setTimeout(function () {
        popup.classList.add('hidden');
        overlay.classList.add('hidden');
    }, 3000);
}

function showPromptPopup(message, callback) {
    const promptOverlay = document.getElementById('overlay');
    const promptPopup = document.getElementById('promptPopup');
    const promptMessage = document.getElementById('popupPrompt');
    const promptInput = document.getElementById('promptInput');
    const promptSubmit = document.getElementById('promptSubmit');

    promptMessage.textContent = message;
    promptInput.value = '';
    promptOverlay.classList.remove('hidden');
    promptPopup.classList.remove('hidden');

    function handleSubmit() {
        const inputValue = promptInput.value.trim();
        if (inputValue) {
            callback(inputValue);
        }
        promptPopup.classList.add('hidden');
        promptOverlay.classList.add('hidden');
        promptSubmit.removeEventListener('click', handleSubmit);
    }

    promptSubmit.addEventListener('click', handleSubmit);
}