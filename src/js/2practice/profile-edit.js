document.addEventListener("DOMContentLoaded", function() {
    Backendless.UserService.getCurrentUser()
        .then(function(currentUser) {
            if (!currentUser) {
                alert("User not logged in");
                window.location.href = 'login.html';
                return;
            }

            const profileLink = document.getElementById('profileLink');
            profileLink.href = `profile.html?email=${currentUser.email}`;

            const userProperties = ['name', 'username', 'email', 'country', 'birthdate', 'gender'];
            userProperties.forEach(function(property) {
                const element = document.getElementById(property);
                if (element && currentUser[property]) {
                    if (property === 'gender') {
                        document.getElementById(`dot-${currentUser[property]}`).checked = true;
                    } else {
                        element.value = currentUser[property];
                    }
                }
            });

            const editProfileForm = document.getElementById('editProfileForm');
            editProfileForm.addEventListener('submit', function(event) {
                event.preventDefault();

                const birthdate = document.getElementById('birthdate').value;
                if (!isValidAge(birthdate)) {
                    showPopup("You must be at least 5 years old!.");
                    return;
                }

                const updatedUser = {
                    objectId: currentUser.objectId,
                    name: document.getElementById('name').value,
                    username: document.getElementById('username').value,
                    email: document.getElementById('email').value,
                    country: document.getElementById('country').value,
                    birthdate: birthdate,
                    gender: document.querySelector('input[name="gender"]:checked') ? document.querySelector('input[name="gender"]:checked').value : currentUser.gender,
                };

                Backendless.UserService.update(updatedUser)
                    .then(function(updatedUser) {
                        showPopup('Profile updated successfully');
                        setTimeout(() => {
                            window.location.href = 'profile.html';
                        }, 3000);
                    })
                    .catch(function(error) {
                        console.error('Error updating profile', error);
                        showPopup(error);
                    });
            });
        })
        .catch(function(error) {
            console.error("Error fetching user data", error);
            Backendless.UserService.logout()
                .then(function() {
                    window.location.href = 'login.html';
                })
                .catch(function(logoutError) {
                    console.error("Logout error", logoutError);
                    window.location.href = 'login.html';
                });
        });
});

function isValidAge(birthdate) {
    const today = new Date();
    const birthdateObj = new Date(birthdate);
    let age = today.getFullYear() - birthdateObj.getFullYear();
    const monthDiff = today.getMonth() - birthdateObj.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthdateObj.getDate())) {
        age--;
    }

    return age >= 5;
}