mapboxgl.accessToken =
    'pk.eyJ1Ijoicml0YWFhYWEiLCJhIjoiY2t2MzNsNjJ6MXF0ajJ2dGNtbDNpMnZvcyJ9.LpoVXd_IP_Pay3r0rsiWEg';

const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/ritaaaaa/ckwfk0vw90cr714pkgu6ljify',
    center: [-99, 40],
    zoom: 3.5,
    scrollZoom: false
});

async function geojsonFetch() {
    let response, schools;
    response = await fetch('assets/private-school17-18.geojson');
    schools = await response.json()

    schools.features.forEach((school, i) => {
        school.properties.id = i;
    });

    map.on('load', () => {

        map.loadImage(
            './img/marker.png',
            (error, image) => {
                if (error) throw error;

                map.addImage('marker', image);

                map.addSource('place', {
                    'type': 'geojson',
                    'data': schools
                });

                map.addLayer({
                    'id': 'places',
                    'type': 'symbol',
                    'source': 'place',
                    'layout': {
                        'icon-image': 'marker',
                        'icon-size': 0.05,
                    }
                });
            }
        );

        const geocoder = new MapboxGeocoder({
            accessToken: mapboxgl.accessToken,
            mapboxgl: mapboxgl,
            marker: true,
            bbox: [-77.210763, 38.803367, -76.853675, 39.052643]
        });

        buildLocationList(schools);
        map.addControl(geocoder, 'top-right');
        addMarkers();

        geocoder.on('result', (event) => {
            const searchResult = event.result.geometry;

            const options = {
                units: 'miles'
            };
            for (const school of schools.features) {
                school.properties.distance = turf.distance(
                    searchResult,
                    school.geometry,
                    options
                );
            }

            schools.features.sort((a, b) => {
                if (a.properties.distance > b.properties.distance) {
                    return 1;
                }
                if (a.properties.distance < b.properties.distance) {
                    return -1;
                }
                return 0;
            });

            const listings = document.getElementById('listings');
            while (listings.firstChild) {
                listings.removeChild(listings.firstChild);
            }
            buildLocationList(schools);

            createPopUp(schools.features[0]);

            const activeListing = document.getElementById(
                `listing-${schools.features[0].properties.id}`
            );
            activeListing.classList.add('active');

            const bbox = getBbox(schools, 0, searchResult);
            map.fitBounds(bbox, {
                padding: 100
            });
        });
    });

    function getBbox(sortedSchools, schoolIdentifier, searchResult) {
        const lats = [
            sortedSchools.features[schoolIdentifier].geometry.coordinates[1],
            searchResult.coordinates[1]
        ];
        const lons = [
            sortedSchools.features[schoolIdentifier].geometry.coordinates[0],
            searchResult.coordinates[0]
        ];
        const sortedLons = lons.sort((a, b) => {
            if (a > b) {
                return 1;
            }
            if (a.distance < b.distance) {
                return -1;
            }
            return 0;
        });
        const sortedLats = lats.sort((a, b) => {
            if (a > b) {
                return 1;
            }
            if (a.distance < b.distance) {
                return -1;
            }
            return 0;
        });
        return [
            [sortedLons[0], sortedLats[0]],
            [sortedLons[1], sortedLats[1]]
        ];
    }

    function addMarkers() {
        for (const marker of schools.features) {
            const el = document.createElement('div');
            el.id = `marker-${marker.properties.id}`;
            el.className = 'marker';

            new mapboxgl.Marker(el, {
                offset: [0, -23]
            })
                .setLngLat(marker.geometry.coordinates)
                .addTo(map);

            el.addEventListener('click', (e) => {
                flyToSchool(marker);
                createPopUp(marker);
                const activeItem = document.getElementsByClassName('active');
                e.stopPropagation();
                if (activeItem[0]) {
                    activeItem[0].classList.remove('active');
                }
                const listing = document.getElementById(
                    `listing-${marker.properties.id}`
                );
                listing.classList.add('active');
            });
        }
    }

    function buildLocationList(schools) {
        for (const school of schools.features) {
            const listings = document.getElementById('listings');
            const listing = listings.appendChild(document.createElement('div'));
            listing.id = `listing-${school.properties.id}`;
            listing.className = 'item';

            const link = listing.appendChild(document.createElement('a'));
            link.href = '#';
            link.className = 'title';
            link.id = `link-${school.properties.id}`;
            link.innerHTML = `${school.properties.NAME}`;

            const details = listing.appendChild(document.createElement('div'));
            details.innerHTML = `${school.properties.STREET}, ${school.properties.CITY}, ${school.properties.STATE} ${school.properties.ZIP}`;
            if (school.properties.distance) {
                const roundedDistance =
                    Math.round(school.properties.distance * 100) / 100;
                details.innerHTML += `<div><strong>${roundedDistance} miles away</strong></div>`;
            }

            link.addEventListener('click', function () {
                for (const feature of schools.features) {
                    if (this.id === `link-${feature.properties.id}`) {
                        flyToSchool(feature);
                        createPopUp(feature);
                    }
                }
                const activeItem = document.getElementsByClassName('active');
                if (activeItem[0]) {
                    activeItem[0].classList.remove('active');
                }
                this.parentNode.classList.add('active');
            });
        }
    }

    function flyToSchool(currentFeature) {
        map.flyTo({
            center: currentFeature.geometry.coordinates,
            zoom: 15
        });
    }

    function createPopUp(currentFeature) {
        const popUps = document.getElementsByClassName('mapboxgl-popup');
        if (popUps[0]) popUps[0].remove();

        const popup = new mapboxgl.Popup({
            closeOnClick: false
        })
            .setLngLat(currentFeature.geometry.coordinates)
            .setHTML(
                `<h3>${currentFeature.properties.NAME}</h3><h4>${currentFeature.properties.STREET}, ${currentFeature.properties.CITY}, ${currentFeature.properties.STATE} ${currentFeature.properties.ZIP}</h4>`
            )
            .addTo(map);
    }
}
geojsonFetch();