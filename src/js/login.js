document.addEventListener('DOMContentLoaded', function () {

    document.getElementById('loginForm').addEventListener('submit', function (event) {
        event.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const errorMessage = document.getElementById('errorMessage');

        Backendless.Data.of('Users').find({ where: `email = '${email}'`})
            .then(function (foundUsers) {
                if (foundUsers.length === 0) {
                    errorMessage.innerText = 'No user with this email exists.';
                } else {
                    Backendless.UserService.login(email, password, true)
                        .then(function (loggedInUser) {
                            window.location.href = 'home.html';
                        })
                        .catch(function (error) {
                            errorMessage.innerText = 'Invalid email or password.';
                            if (error.code === 3064) {
                                errorMessage.innerText = 'Session token expired. Please log in again.';
                            } else {
                                errorMessage.innerText = 'Login failed: ' + error.message;
                            }
                        });
                }
            })
            .catch(function (error) {
                console.error('Error checking user existence:', error);
                errorMessage.innerText = 'An error occurred while checking user existence: ' + error.message;
            });
    });
});