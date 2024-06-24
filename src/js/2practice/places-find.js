document.addEventListener('DOMContentLoaded', function () {
    const placesContainer = document.getElementById('placesContainer');
    const placeNameInput = document.getElementById('placeName');
    const categoryNameInput = document.getElementById('categoryName');
    const searchByNameButton = document.getElementById('searchByNameButton');
    const searchByCategoryButton = document.getElementById('searchByCategoryButton');
    const customLocationButton = document.getElementById('customLocationButton');
    const latitudeInput = document.getElementById('latitude');
    const longitudeInput = document.getElementById('longitude');
    const searchRadiusInput = document.getElementById('searchRadius');
    const trackLocationCheckbox = document.getElementById('trackLocation');

    searchByNameButton.addEventListener('click', function () {
        const placeName = placeNameInput.value.trim();
        if (placeName) {
            searchPlacesByName();
        } else {
            showPopup('Please enter a place name to search.');
        }
    });

    searchByCategoryButton.addEventListener('click', function () {
        const categoryName = categoryNameInput.value.trim();
        if (categoryName) {
            searchPlacesByCategory();
        } else {
            showPopup('Please enter a category name to search.');
        }
    });

    customLocationButton.addEventListener('click', function () {
        const radius = parseFloat(searchRadiusInput.value);
        const lat = parseFloat(latitudeInput.value);
        const lng = parseFloat(longitudeInput.value);

        if (isNaN(radius) || isNaN(lat) || isNaN(lng)) {
            showPopup('Please enter valid radius, latitude, and longitude.');
        } else {
            searchPlacesByRadius(lat, lng, radius);
        }
    });

    function searchPlacesByName() {
        const placeName = placeNameInput.value.trim();
        const whereClause = `name LIKE '%${placeName}%'`;

        const queryBuilder = Backendless.DataQueryBuilder.create();
        queryBuilder.setRelated(['categoryId']);
        queryBuilder.setWhereClause(whereClause);

        Backendless.Data.of('Place').find(queryBuilder)
            .then(function (places) {
                fetchCategoriesForPlaces(places);
            })
            .catch(function (error) {
                console.error('Error fetching places:', error);
            });
    }

    function searchPlacesByCategory() {
        const categoryName = categoryNameInput.value.trim();
        const categoryWhereClause = `name LIKE '%${categoryName}%'`;

        const categoryQueryBuilder = Backendless.DataQueryBuilder.create();
        categoryQueryBuilder.setWhereClause(categoryWhereClause);

        Backendless.Data.of('Category').find(categoryQueryBuilder)
            .then(function (categories) {
                if (categories.length > 0) {
                    const categoryIds = categories.map(category => category.objectId);
                    searchPlacesByCategoryIds(categoryIds);
                } else {
                    renderPlaces([]);
                }
            })
            .catch(function (error) {
                console.error('Error fetching categories:', error);
            });
    }

    function searchPlacesByCategoryIds(categoryIds) {
        const whereClause = `categoryId in ('${categoryIds.join("','")}')`;

        const queryBuilder = Backendless.DataQueryBuilder.create();
        queryBuilder.setRelated(['categoryId']);
        queryBuilder.setWhereClause(whereClause);

        Backendless.Data.of('Place').find(queryBuilder)
            .then(function (places) {
                fetchCategoriesForPlaces(places);
            })
            .catch(function (error) {
                console.error('Error fetching places:', error);
            });
    }

    function searchPlacesByRadius(lat, lng, radius) {
        const whereClause = `distanceOnSphere(coordinates, 'POINT(${lng} ${lat})') <= ${radius}`;

        const queryBuilder = Backendless.DataQueryBuilder.create();
        queryBuilder.setRelated(['categoryId']);
        queryBuilder.setWhereClause(whereClause);

        Backendless.Data.of('Place').find(queryBuilder)
            .then(function (places) {
                fetchCategoriesForPlaces(places);
            })
            .catch(function (error) {
                console.error('Error fetching places:', error);
            });
    }

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
        placesContainer.innerHTML = '';

        Backendless.UserService.getCurrentUser()
            .then(currentUser => {
                if (places.length === 0) {
                    const noPlacesMessage = document.createElement('p');
                    noPlacesMessage.textContent = 'No places found.';
                    noPlacesMessage.classList.add('no-files-message');
                    noPlacesMessage.style.color = '#9b59b6';
                    placesContainer.appendChild(noPlacesMessage);
                } else {
                    places.forEach(place => {
                        const placeCard = document.createElement('div');
                        placeCard.classList.add('place-card');

                        const imageUrl = place.imageUrl || 'default-image-url.jpg';
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
                            likeButton.addEventListener('click', function () {
                                checkIfLiked(place.objectId, currentUser.objectId, likeButton);
                            });
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