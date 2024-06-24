document.addEventListener("DOMContentLoaded", function () {

    const friendsContainer = document.getElementById("friendsContainer");
    const searchButton = document.getElementById("customLocationButton");
    const friendNameInput = document.getElementById("friendName");
    const searchRadiusInput = document.getElementById("searchRadius");

    let map, markerGroup;

    function initializeMap(lat = 50.014935, lng = 36.227994) {
        map = L.map('map').setView([lat, lng], 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        markerGroup = L.layerGroup().addTo(map);
    }

    function addMarker(lat, lng, popupText) {
        L.marker([lat, lng]).addTo(markerGroup).bindPopup(popupText);
    }

    function displayNoFriendsMessage(container, message) {
        const noFriendsMessage = document.createElement('p');
        noFriendsMessage.textContent = message;
        noFriendsMessage.classList.add('no-files-message');
        noFriendsMessage.style.color = '#9b59b6';
        container.appendChild(noFriendsMessage);
        container.innerHTML = `<p>${message}</p>`;
    }

    async function loadFriends() {
        const currentUser = await Backendless.UserService.getCurrentUser();
        const queryBuilder = Backendless.DataQueryBuilder.create();
        queryBuilder.setRelated(['friends']);
        queryBuilder.setWhereClause(`objectId = '${currentUser.objectId}'`);

        try {
            const result = await Backendless.Data.of("Users").find(queryBuilder);
            const friends = result[0].friends;
            if (!friends || friends.length === 0) {
                displayNoFriendsMessage(friendsContainer, 'There are no friends!');
                return;
            }

            friendsContainer.innerHTML = '';
            friends.forEach(friend => {
                const friendItem = document.createElement("div");
                friendItem.classList.add("friend-item");
                friendItem.innerHTML = `
                    <div class="friend-pfp">
                        <img src="${friend.profile_pic || '../2practice/prof_pic.jpg'}" alt="Friend pfp">
                    </div>
                    <div class="friend-details">
                        <p class="friend-email">${friend.email}</p>
                        <p class="friend-name">${friend.name}</p>
                    </div>
                    <button class="delete-button" data-friend-id="${friend.objectId}">Remove</button>
                `;
                friendsContainer.appendChild(friendItem);
            });
            addDeleteFriendListeners();
        } catch (error) {
            console.error("Error loading friends:", error);
            displayNoFriendsMessage(friendsContainer, 'Failed to load friends. Please try again later.');
        }
    }

    function addDeleteFriendListeners() {
        const deleteButtons = document.querySelectorAll(".delete-button");
        deleteButtons.forEach(button => {
            button.addEventListener("click", async function () {
                const friendId = this.getAttribute("data-friend-id");
                await deleteFriend(friendId);
            });
        });
    }

    async function deleteFriend(friendId) {
        const currentUser = await Backendless.UserService.getCurrentUser();
        const parentObject = {objectId: currentUser.objectId};
        const childObject = {objectId: friendId};

        try {
            await Backendless.Data.of("Users").deleteRelation(parentObject, "friends", [childObject]);
            await Backendless.Data.of("Users").deleteRelation(childObject, "friends", [parentObject]);
            console.log("Relation has been deleted");
            showPopup("Friend was removed!");
            loadFriends();
        } catch (error) {
            console.error("Error deleting friend:", error);
            alert("Failed to delete friend. Please try again.");
        }
    }

    async function searchFriends() {
        const email = friendNameInput.value.trim();
        const radius = parseFloat(searchRadiusInput.value.trim());

        // if (!email && !radius) {
        //     loadFriends();
        //     return;
        // }

        const currentUser = await Backendless.UserService.getCurrentUser();

        if (currentUser.my_location) {
            const userLocation = currentUser.my_location;
            const userLat = userLocation.getLatitude();
            const userLng = userLocation.getLongitude();

            const queryBuilder = Backendless.DataQueryBuilder.create();
            queryBuilder.setRelated(['friends']);
            queryBuilder.setWhereClause(`objectId = '${currentUser.objectId}'`);

            try {
                markerGroup.clearLayers();
                const result = await Backendless.Data.of("Users").find(queryBuilder);
                const friends = result[0].friends;

                if (!friends || friends.length === 0) {
                    showPopup('No friends found.');
                    return;
                }

                const filteredFriends = friends.filter(friend => friend.email.includes(email) && friend.track_geolocation);

                if (filteredFriends.length === 0) {
                    showPopup('No friends found with the provided email and tracking enabled.');
                    return;
                }

                filteredFriends.forEach(friend => {
                    if (friend.my_location) {
                        const location = friend.my_location;
                        const lat = location.getLatitude();
                        const lng = location.getLongitude();
                        const popupText = `Name: ${friend.name}<br>Email: ${friend.email}`;
                        addMarker(lat, lng, popupText);
                    }
                });

                let circle;
                if (radius && radius > 0) {
                    circle = L.circle([userLat, userLng], {
                        color: 'blue',
                        fillColor: '#30f',
                        fillOpacity: 0.2,
                        radius: radius * 1000
                    }).addTo(markerGroup);
                } else if (radius <= 0) {
                    markerGroup.clearLayers();
                    showPopup("Invalid radius!")
                    return;
                }

                if (circle) {
                    markerGroup.eachLayer(marker => {
                        if (!circle.getBounds().contains(marker.getLatLng())) {
                            markerGroup.removeLayer(marker);
                        }
                    });
                }
                map.setView([userLat, userLng], 3);
            } catch (error) {
                console.error("Error searching for friends:", error);
                showPopup("Failed to search for friends. Please try again later.");
            }
        } else {
            showPopup("Current user's location is not available.");
        }
    }
    searchButton.addEventListener("click", searchFriends);

    initializeMap();
    loadFriends();
});
