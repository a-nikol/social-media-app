document.addEventListener('DOMContentLoaded', function () {

    document.getElementById('resetPasswordForm').addEventListener('submit', function (event) {
        event.preventDefault();

        const email = document.getElementById('email').value;
        const birthdateInput = document.getElementById('birthdate').value;
        const birthdate = new Date(birthdateInput).toISOString().split('T')[0];
        const errorMessage = document.getElementById('errorMessage');
        const successMessage = document.getElementById('successMessage');

        errorMessage.innerText = '';
        successMessage.innerText = '';

        Backendless.Data.of('Users').find({
            where: `email = '${email}'`
        }).then(function (foundUsers) {
            if (foundUsers.length === 0) {
                errorMessage.innerText = 'No user with this email exists.';
            } else {
                const user = foundUsers[0];
                if (user.birthdate === birthdate) {
                    Backendless.UserService.restorePassword(email)
                        .then(function () {
                            successMessage.innerText = 'Password reset email has been sent to your email address. Redirecting to login page in 3 seconds...';
                            setTimeout(() => {
                                window.location.href = "../1practice/login.html";
                            }, 3000);

                        })
                        .catch(function (error) {
                            errorMessage.innerText = 'Error in sending password reset email: ' + error.message;
                        });
                } else {
                    errorMessage.innerText = 'The provided birthdate does not match the user.';
                }
            }
        }).catch(function (error) {
            errorMessage.innerText = 'Error. Try again later.';
        });
    });
});
