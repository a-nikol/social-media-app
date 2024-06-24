document.addEventListener("DOMContentLoaded", function () {
    const defaultLat = 50.014935;
    const defaultLng = 36.227994;
    let map, marker;

    function initializeMap(lat, lng) {
        if (map) {
            map.remove();
        }

        map = L.map('map').setView([lat, lng], 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        marker = L.marker([lat, lng]).addTo(map);

        map.on('click', function (e) {
            const { lat, lng } = e.latlng;
            latitudeInput.value = lat.toFixed(6);
            longitudeInput.value = lng.toFixed(6);
            updateMarker(lat, lng);
            trackLocationCheckbox.checked = false;
        });
    }

    function updateMarker(lat, lng) {
        if (marker) {
            map.removeLayer(marker);
        }
        marker = L.marker([lat, lng]).addTo(map);
        map.setView([lat, lng], 13);
    }

    const latitudeInput = document.getElementById('latitude');
    const longitudeInput = document.getElementById('longitude');
    const trackLocationCheckbox = document.getElementById('trackLocation');

    function geolocationSuccess(position) {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        initializeMap(lat, lng);
        latitudeInput.value = lat.toFixed(6);
        longitudeInput.value = lng.toFixed(6);
    }

    function geolocationError() {
        initializeMap(defaultLat, defaultLng);
        latitudeInput.value = defaultLat.toFixed(6);
        longitudeInput.value = defaultLng.toFixed(6);
    }

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(geolocationSuccess, geolocationError);
    } else {
        geolocationError();
    }

    latitudeInput.addEventListener('change', function () {
        const lat = parseFloat(latitudeInput.value);
        const lng = parseFloat(longitudeInput.value);
        if (!isNaN(lat) && !isNaN(lng)) {
            updateMarker(lat, lng);
            trackLocationCheckbox.checked = false;
        }
    });

    longitudeInput.addEventListener('change', function () {
        const lat = parseFloat(latitudeInput.value);
        const lng = parseFloat(longitudeInput.value);
        if (!isNaN(lat) && !isNaN(lng)) {
            updateMarker(lat, lng);
            trackLocationCheckbox.checked = false;
        }
    });

    trackLocationCheckbox.addEventListener('change', function () {
        if (trackLocationCheckbox.checked && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function (position) {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                latitudeInput.value = lat.toFixed(6);
                longitudeInput.value = lng.toFixed(6);
                updateMarker(lat, lng);
            }, geolocationError);
        }
    });

    let input = document.querySelector('#hashtags');
    let container = document.querySelector('.tag-container');
    let errorMessage = document.querySelector('.error-message');

    input.addEventListener('keyup', (event) => {
        if (event.key === 'Enter' && input.value.trim() !== '') {
            let tags = container.querySelectorAll('.tag');
            let tagText = input.value.trim().toLowerCase();
            let tagExists = false;

            tags.forEach(tag => {
                if (tag.textContent.trim().toLowerCase() === tagText) {
                    tagExists = true;
                    return;
                }
            });

            if (!tagExists && tags.length < 4) {
                let tag = document.createElement('div');
                tag.classList.add('tag');
                tag.textContent = input.value.trim();

                container.appendChild(tag);
                input.value = '';

                tag.addEventListener('click', () => {
                    container.removeChild(tag);
                });

                errorMessage.textContent = '';
            } else if (tagExists) {
                errorMessage.textContent = "Tag already exists. Please enter a different tag.";
            } else {
                errorMessage.textContent = "You can only add up to 4 tags.";
            }
        }
    });

    document.getElementById('addPlaceButton').addEventListener('click', addPlace);
    function addPlace(event) {
        event.preventDefault();

        const placeName = document.getElementById('placeName').value.trim();
        const placeDescription = document.getElementById('placeDescription').value.trim();
        const latitude = parseFloat(document.getElementById('latitude').value.trim());
        const longitude = parseFloat(document.getElementById('longitude').value.trim());
        const imageUrl = document.getElementById('placeImage').value.trim();
        const tags = Array.from(document.querySelectorAll('.tag')).map(tag => tag.textContent.trim());

        if (!placeName || !placeDescription || isNaN(latitude) || isNaN(longitude)) {
            showPopup('Please fill in all required fields.');
            return;
        }

        const currentUser = Backendless.UserService.getCurrentUser();

        const point = new Backendless.Data.Point()
            .setLatitude(latitude)
            .setLongitude(longitude);

        const place = {
            name: placeName,
            description: placeDescription,
            coordinates: point,
            created: new Date(),
            imageUrl: imageUrl,
            ownerId: currentUser.objectId,
            likesCount: 0,
        };

        Backendless.Data.of('Place').save(place)
            .then(savedPlace => {
                const handleTags = async (tagIndex) => {
                    if (tagIndex >= tags.length) {
                        showPopup('Place added successfully!');
                        setTimeout(() => {
                            window.location.href = 'places.html';
                        }, 3000);
                        console.log('Saved place:', savedPlace);
                        return;
                    }

                    // Adding existing tags, or creating new
                    const tagName = tags[tagIndex];
                    try {
                        const existingTags = await Backendless.Data.of('Category')
                            .find({ where: `name = '${tagName}'` });
                        let tagObj;
                        if (existingTags.length > 0) {
                            tagObj = existingTags[0];
                        } else {
                            tagObj = await Backendless.Data.of('Category').save({ name: tagName });
                        }
                        await Backendless.Data.of('Place').addRelation(savedPlace.objectId,
                            'categoryId', [tagObj.objectId]);
                        handleTags(tagIndex + 1);
                    } catch (error) {
                        console.error('Error handling tags:', error);
                        showPopup('An error occurred while processing tags.');
                    }
                };

                handleTags(0);
            })
            .catch(error => {
                console.error('Error adding place:', error);
                showPopup('An error occurred while adding the place.');
            });
    }
});