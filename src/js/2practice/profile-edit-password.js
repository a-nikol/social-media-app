document.addEventListener("DOMContentLoaded", function () {
    Backendless.UserService.getCurrentUser()
        .then(function (currentUser) {
            if (!currentUser) {
                alert("User not logged in");
                window.location.href = 'login.html';
                return;
            }

            const profileLink = document.getElementById('profileLink');
            profileLink.href = `profile.html?email=${currentUser.email}`;

            const editPasswordForm = document.getElementById('editPasswordForm');
            editPasswordForm.addEventListener('submit', function (event) {
                event.preventDefault();

                const oldPassword = document.getElementById('oldPassword').value;
                const newPassword = document.getElementById('newPassword').value;
                const confirmPassword = document.getElementById('confirmPassword').value;
                if (newPassword !== confirmPassword) {
                    showPopup("New password and confirm password do not match.");
                    return;
                }

                // Trying to verify old password
                Backendless.UserService.login(currentUser.email, oldPassword, true)
                    .then(function (loggedInUser) {
                        if (loggedInUser) {
                            const updatedUser = {
                                objectId: currentUser.objectId,
                                password: newPassword,
                            };

                            Backendless.UserService.update(updatedUser)
                                .then(function (updatedUser) {
                                    showPopup('Password updated successfully! You should log in again.');
                                    setTimeout(() => {
                                        Backendless.UserService.logout()
                                            .then(function () {
                                                window.location.href = 'login.html';
                                            })
                                            .catch(function (logoutError) {
                                                console.error("Logout error", logoutError);
                                                window.location.href = 'login.html';
                                            });
                                    }, 5000);
                                })
                                .catch(function (error) {
                                    showPopup(error.message);
                                });
                        } else {
                            showPopup("Old password is incorrect.");
                        }
                    })
                    .catch(function (error) {
                        console.error('Error verifying old password', error);
                        showPopup("Old password is incorrect.");
                    });
            });
        })
        .catch(function (error) {
            console.error("Error fetching user data", error);
            Backendless.UserService.logout()
                .then(function () {
                    window.location.href = 'login.html';
                })
                .catch(function (logoutError) {
                    console.error("Logout error", logoutError);
                    window.location.href = 'login.html';
                });
        });
});
