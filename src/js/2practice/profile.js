document.addEventListener("DOMContentLoaded", function () {
    Backendless.UserService.getCurrentUser()
        .then(function (currentUser) {
            if (!currentUser) {
                alert("User not logged in");
                window.location.href = "../1practice/login.html";
                return;
            }

            const profileLink = document.getElementById('profileLink');
            const email = currentUser.email.replace(/[@.]/g, '_');
            const mainFolderPath = `users/${email}/`;
            profileLink.href = `profile.html?email=${currentUser.email}`;

            const userProperties = ['name', 'username', 'email', 'country', 'birthdate', 'gender'];
            userProperties.forEach(function (property) {
                const element = document.getElementById(property);
                if (element && currentUser[property]) {
                    element.value = currentUser[property];
                }
            });

            const profileImage = document.getElementById('profileImage');
            const defaultProfilePic = 'https://archive.org/download/twitter-default-pfp/e.png';

            if (currentUser.profile_pic) {
                profileImage.src = currentUser.profile_pic;
            } else {
                profileImage.src = defaultProfilePic;
            }

            // User tries to change profile pic
            const changeProfileImgBtn = document.getElementById('changeProfileImg');
            const pfpSelect = document.getElementById('pfpSelect');

            changeProfileImgBtn.addEventListener('click', function() {
                loadProfilePictures(mainFolderPath);
                pfpSelect.style.display = 'block';
                pfpSelect.focus();
            });

            // User enables tracking location
            const trackLocationCheckbox = document.getElementById('trackLocation');
            trackLocationCheckbox.checked = currentUser.track_geolocation || false;

            trackLocationCheckbox.addEventListener('change', function (event) {
                currentUser.track_geolocation = event.target.checked;
                Backendless.UserService.update(currentUser)
                    .then(() => {
                        console.log("User updated track_geolocation = " + event.target.checked);
                        if (event.target.checked) {
                            startTrackingLocation(currentUser);
                        } else {
                            stopTrackingLocation(currentUser);
                        }
                    })
                    .catch(console.error);
            });

            if (trackLocationCheckbox.checked) {
                startTrackingLocation(currentUser);
            }

            // const fileInput = document.getElementById('fileInput');
            // fileInput.addEventListener('change', function () {
            //     const file = fileInput.files[0];
            //     if (file) {
            //         uploadProfilePicture(file, email)
            //             .then(response => {
            //                 console.log('Profile picture uploaded successfully:', response);
            //             })
            //             .catch(error => {
            //                 console.error('Error uploading profile picture:', error);
            //             });
            //     }
            // });

        })
        .catch(function (error) {
            console.error("Error fetching user data or schema", error);
            Backendless.UserService.logout()
                .then(function () {
                    window.location.href = "../1practice/login.html";
                })
                .catch(function (logoutError) {
                    console.error("Logout error", logoutError);
                    window.location.href = "../1practice/login.html";
                });
        });

    async function loadProfilePictures(mainFolderPath) {
        try {
            const fileExtensions = ["*.jpg", "*.jpeg", "*.png", "*.gif"];
            const fileInfoArray = [];

            for (const extension of fileExtensions) {
                const regexPattern = extension.replace('*', '').split('').map(char => `[${char.toLowerCase()}${char.toUpperCase()}]`).join('');
                const files = await Backendless.Files.listing(mainFolderPath, `*${regexPattern}`, true);
                fileInfoArray.push(...files);
            }

            const pfpSelect = document.getElementById('pfpSelect');
            pfpSelect.innerHTML = '';

            fileInfoArray.forEach(fileInfo => {
                const option = document.createElement('option');
                option.value = fileInfo.publicUrl;
                option.text = fileInfo.name;
                pfpSelect.appendChild(option);
            });

            pfpSelect.addEventListener('change', async function () {
                const selectedPfp = pfpSelect.value;
                console.log("Selected profile picture URL:", selectedPfp);

                if (selectedPfp) {
                    pfpSelect.style.display = 'none';
                    await uploadProfilePicture(selectedPfp);
                    profileImage.src = selectedPfp;
                } else {
                    console.error("No profile picture selected");
                }
            });

        } catch (error) {
            console.error("Error loading profile pictures:", error);
        }
    }

    async function uploadProfilePicture(fileURL) {
        try {
            let currentUser = await Backendless.UserService.getCurrentUser();
            currentUser.profile_pic = fileURL;

            await Backendless.Data.of('Users').save(currentUser);

            console.log("Profile picture URL saved to user object:", currentUser);
            showPopup('Profile picture updated successfully');

        } catch (error) {
            console.error("Error updating user object:", error);
            showPopup(error);
        }
    }

    async function startTrackingLocation(currentUser) {
        if (navigator.geolocation) {
            const updateLocation = async () => {
                navigator.geolocation.getCurrentPosition(async (position) => {
                    const {latitude, longitude} = position.coords;
                    const point = new Backendless.Data.Point()
                        .setLatitude(latitude)
                        .setLongitude(longitude);
                    currentUser.my_location = point;
                    try {
                        await Backendless.Data.of('Users').save(currentUser);
                        console.log("Location updated:", point);
                    } catch (error) {
                        console.error("Error updating location:", error);
                    }
                });
            };
            updateLocation();
            // Updating location every minute
            currentUser.locationTrackingInterval = setInterval(updateLocation, 60000);
        } else {
            alert("Geolocation is not supported by this browser.");
        }
    }

    function stopTrackingLocation(currentUser) {
        clearInterval(currentUser.locationTrackingInterval);
    }

});
