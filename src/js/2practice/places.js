document.addEventListener('DOMContentLoaded', function () {
    const placesContainer = document.getElementById('placesContainer');

    const queryBuilder = Backendless.DataQueryBuilder.create();
    queryBuilder.setRelated(['categoryId']);

    Backendless.Data.of('Place').find(queryBuilder)
        .then(function (places) {
            fetchCategoriesForPlaces(places);
        })
        .catch(function (error) {
            console.error('Error fetching places:', error);
        });

    function fetchCategoriesForPlaces(places) {
        const placePromises = places.map(place => {
            if (place.categoryId) {
                return loadCategoriesForPlace(place);
            } else {
                return Promise.resolve(place);
            }
        });

        Promise.all(placePromises)
            .then(function (placesWithCategories) {
                renderPlaces(placesWithCategories);
            })
            .catch(function (error) {
                console.error('Error fetching categories for places:', error);
            });
    }

    function loadCategoriesForPlace(place) {
        const loadRelationsQueryBuilder = Backendless.LoadRelationsQueryBuilder.create();
        loadRelationsQueryBuilder.setRelationName('categoryId');

        return Backendless.Data.of('Place').loadRelations(place.objectId, loadRelationsQueryBuilder)
            .then(function (categories) {
                place.categories = categories.map(category => category.name).join(', ');
                return place;
            })
            .catch(function (error) {
                console.error(`Error fetching categories for place ${place.objectId}:`, error);
                place.categories = 'No categories';
                return place;
            });
    }

    function renderPlaces(places) {
        Backendless.UserService.getCurrentUser()
            .then(currentUser => {
                if (places.length === 0) {
                    const noPlacesMessage = document.createElement('p');
                    noPlacesMessage.textContent = 'No places created yet.';
                    noPlacesMessage.classList.add('no-files-message');
                    noPlacesMessage.style.color = '#9b59b6';
                    placesContainer.appendChild(noPlacesMessage);
                } else {
                    places.forEach(place => {
                        const placeCard = document.createElement('div');
                        placeCard.classList.add('place-card');

                        const imageUrl = place.imageUrl || 'https://cdn-icons-png.flaticon.com/512/2555/2555595.png';
                        const name = place.name || 'Unnamed Place';
                        const description = place.description || 'No description available';
                        const categories = place.categories || 'No categories';
                        const coordinates = place.coordinates || {getLatitude: () => 'N/A', getLongitude: () => 'N/A'};
                        const likesCount = place.likesCount || 0;

                        placeCard.innerHTML = `
                            <div class="place-image">
                                <img src="${imageUrl}" alt="Place Image">
                            </div>
                            <div class="place-details">
                                <div class="place-header">
                                    <h3 class="place-name">${name}</h3>
                                    ${place.ownerId === currentUser.objectId ?
                            `<button class="delete-button" data-place-id="${place.objectId}">x</button>`
                            : ''}
                                </div>
                                <p class="place-description">${description}</p>
                                <div class="place-meta">
                                    <span class="place-category">Categories: ${categories}</span>
                                    <span class="place-location">Location: ${coordinates.getLatitude()}, ${coordinates.getLongitude()}</span>
                                </div>
                                <div class="place-actions">
                                    ${place.ownerId !== currentUser.objectId ?
                            `<button class="like-button" data-place-id="${place.objectId}">
                                            <i class="far fa-heart heart-outline"></i>
                                            <i class="fas fa-heart heart-filled"></i>
                                        </button>`
                            : ''}
                                    <span class="likes-count">Likes: ${likesCount}</span>
                                    <button class="view-map-button" data-lat="${coordinates.getLatitude()}" data-lng="${coordinates.getLongitude()}" data-name="${encodeURIComponent(name)}" data-description="${encodeURIComponent(description)}">View on Map</button>
                                </div>
                            </div>
                        `;

                        placesContainer.appendChild(placeCard);

                        if (place.ownerId === currentUser.objectId) {
                            placeCard.querySelector('.delete-button').addEventListener('click', function () {
                                const placeId = this.getAttribute('data-place-id');
                                deletePlace(placeId);
                            });
                        } else {
                            const likeButton = placeCard.querySelector('.like-button');
                            likeButton.addEventListener('click', debounce(function () {
                                checkIfLiked(place.objectId, currentUser.objectId, likeButton);
                            }, 1000));
                        }
                    });

                    document.querySelectorAll('.view-map-button').forEach(button => {
                        button.addEventListener('click', function () {
                            const lat = this.getAttribute('data-lat');
                            const lng = this.getAttribute('data-lng');
                            const name = encodeURIComponent(this.getAttribute('data-name'));
                            const description = encodeURIComponent(this.getAttribute('data-description'));
                            const mapUrl = `map.html?lat=${lat}&lng=${lng}&name=${name}&description=${description}`;
                            window.open(mapUrl, '_blank');
                        });
                    });
                }
            })
            .catch(function (error) {
                console.error('Error fetching current user:', error);
            });

    }
});

async function checkIfLiked(placeId, userId, likeButton) {
    try {
        const likes = await Backendless.Data.of('Like').find({
            where: `placeId = '${placeId}' AND ownerId = '${userId}'`
        });
        if (likes.length > 0) {
            await removeLike(likes[0].objectId, placeId, likeButton);
            likeButton.classList.remove('liked');
        } else {
            await addLike(placeId, userId, likeButton);
            likeButton.classList.add('liked');
        }
    } catch (error) {
        console.error('Error checking if liked:', error);
    }
}

async function removeLike(likeId, placeId, likeButton) {
    try {
        await Backendless.Data.of('Like').remove(likeId);
        await updateLikesCount(placeId, likeButton, -1);
        likeButton.classList.remove('liked');
        // alert('Like removed successfully!');
    } catch (error) {
        console.error('Error removing like:', error);
    }
}

async function addLike(placeId, userId, likeButton) {
    try {
        const newLike = {
            ownerId: userId
        };
        const savedLike = await Backendless.Data.of('Like').save(newLike);
        await Backendless.Data.of('Like').setRelation({objectId: savedLike.objectId},
            'placeId', [{objectId: placeId}])

        await updateLikesCount(placeId, likeButton, 1);
        likeButton.classList.add('liked');

    } catch (error) {
        console.error('Error adding like:', error);
    }
}

async function updateLikesCount(placeId, likeButton, increment) {
    try {
        const place = await Backendless.Data.of('Place').findById(placeId);
        place.likesCount = (place.likesCount || 0) + increment;
        const updatedPlace = await Backendless.Data.of('Place').save(place);

        console.log('Likes count updated successfully');
        const placeCard = likeButton.closest('.place-card');
        const likesCountSpan = placeCard.querySelector('.likes-count');
        likesCountSpan.textContent = `Likes: ${updatedPlace.likesCount}`;
    } catch (error) {
        console.error('Error updating likes count:', error);
    }
}

function deletePlace(placeId) {
    Backendless.Data.of('Place').remove(placeId)
        .then(function () {
            showPopup('Place deleted successfully!');
            setTimeout(() => {
                window.location.href = 'places.html';
            }, 3000);
            console.log('Place deleted successfully');
        })
        .catch(function (error) {
            showPopup(error);
            console.error('Error deleting place:', error);
        });
}