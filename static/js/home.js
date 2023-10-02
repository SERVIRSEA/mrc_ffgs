document.addEventListener("DOMContentLoaded", function() {
    function showBootstrapAlert(message) {
        const alertPlaceholder = document.getElementById('alert-placeholder');
        const alertHTML = `
            <div class="alert alert-danger alert-dismissible fade show" role="alert">
                <i class="fas fa-exclamation-triangle mr-2"></i> ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
        alertPlaceholder.innerHTML = alertHTML;
    }

    function clearBootstrapAlert() {
        const alertPlaceholder = document.getElementById('alert-placeholder');
        alertPlaceholder.innerHTML = '';
    }

    const storms_url = '/get-storms/';
    const storms_by_country_url = '/get-storms-number-by-country/'
    
    async function getStorms() {
        try {
            const response = await fetch(storms_url);
            if (!response.ok) {
                if (response.status === 404) {
                    showBootstrapAlert("Oops! Data is not found.");
                    throw new Error("Data is not found");
                }
                throw new Error("Network response was not ok");
            } else {
                clearBootstrapAlert();
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error:', error);
        }
    }

    async function getStormsByCountry() {
        try {
            const response = await fetch(storms_by_country_url);
            if (!response.ok) {
                if (response.status === 404) {
                    showBootstrapAlert("Oops! Data is not found.");
                    throw new Error("Data is not found");
                }
                throw new Error("Network response was not ok");
            } else {
                clearBootstrapAlert();
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error:', error);
        }
    }

    async function generateGraph(selectedCountry) {
        const data = await getStorms();
        const stormsData = JSON.parse(data);
        // console.log(stormsData)

        const data_by_country = await getStormsByCountry();
        const stormsCountryData = JSON.parse(data_by_country);

        let totalEvents = 0;

        // Helper function to get the button for a specific country
        function getButtonByCountry(country) {
            const lis = Array.from(document.querySelectorAll(".stormsList li"));
            return lis.find(li => li.textContent.includes(country));
        }

        const findEventsByCountry = (country) => {
            let countryData = stormsCountryData.find(item => item.country === country);
            return countryData ? countryData.events : 0;
        };

        const updateDOMForCountry = (country, events) => {
            const button = getButtonByCountry(country);
            button.querySelector(`span`).innerHTML = events;
        };

        if (selectedCountry === "All") {
            const countries = ["Cambodia", "Laos", "Thailand", "Vietnam"];
            
            countries.forEach(country => {
                const events = findEventsByCountry(country);
                totalEvents += events;
                updateDOMForCountry(country, events);
                const button = getButtonByCountry(country);
                button.style.display = 'block'; // Ensure it's displayed
            });

        } else {
            // Hide all country buttons first
            const allCountries = ["Cambodia", "Laos", "Thailand", "Vietnam"];
            allCountries.forEach(country => {
                const button = getButtonByCountry(country);
                button.style.display = 'none';
            });

            // Display only the selected country button
            const countryEvent = findEventsByCountry(selectedCountry);
            totalEvents += countryEvent;
            updateDOMForCountry(selectedCountry, countryEvent);
            const button = getButtonByCountry(selectedCountry);
            button.style.display = 'block';
        }
        
        // Count the number of occurrences for each category
        let categories = {};
        stormsData.forEach(function(item) {
            if (categories[item.Category]) {
                categories[item.Category]++;
            } else {
                categories[item.Category] = 1;
            }
        });

        // Convert the categories object to an array of series data
        let seriesData = [];
        for (var category in categories) {
            seriesData.push({
                name: category,
                y: categories[category]
            });
        }

        // Create the chart
        var chart = Highcharts.chart('stormsChartHome', {
            chart: {
                type: 'pie'
            },
            title: {
                text: null
            },
            plotOptions: {
                pie: {
                    innerSize: '50%',
                    dataLabels: {
                        enabled: false,
                        format: '<b>{point.name}</b>: {point.percentage:.1f} %',
                        style: {
                            color: (Highcharts.theme && Highcharts.theme.contrastTextColor) || 'black'
                        }
                    },
                    showInLegend: true
                }
            },
            tooltip: {
                pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b>'
            },
            colors: ['#abdda4', '#fdae61', '#b30000', '#7b3294'],
            series: [{
                name: 'Category',
                data: seriesData
            }],
            legend: {
                layout: 'horizontal',
                align: 'center',
                verticalAlign: 'bottom',
                itemMarginTop: 0,
                itemMarginBottom: 0
            }
        });

        var pieCenter = chart.series[0].center;

        var textElement = chart.renderer.text('' + totalEvents, pieCenter[0], pieCenter[1])
            .attr({
                zIndex: 999
            })
            .css({
                color: '#000',
                fontSize: '50px',
                fontWeight: 'bold'
            })
            .add();

        // Now, reposition the text based on its bounding box
        var textBBox = textElement.getBBox();
        textElement.attr({
            x: pieCenter[0] - textBBox.width / 2,
            y: pieCenter[1] + textBBox.height / 2 
        });
    }

    // Caches for data
    const statCache = {
        '6hrs': {},
        '12hrs': {},
        '24hrs': {}
    };

    // Fetch URLs
    const urls = {
        '6hrs': '/get-alert-stat-6hrs/',
        '12hrs': '/get-risk-stat-12hrs/',
        '24hrs': '/get-risk-stat-24hrs/',
    };

    // Generic function to fetch data based on the provided param and selectedDate
    async function getStatsBulletin(param, selectedDate = null, selectedHrs=null) {
        try {
            // Initialize the cache for the specified param if it doesn't exist
            if (!statCache[param]) {
                statCache[param] = {};
            }
            // Check if data is already in the cache for the specified param, date and hours
            if (selectedDate && statCache[param][selectedDate] && statCache[param][selectedDate][selectedHrs]) {
                clearBootstrapAlert();
                return statCache[param][selectedDate][selectedHrs];
            }

            // Construct the URL with the selectedDate parameter
            let url = urls[param];
            if (selectedDate && selectedHrs) {
                url += `?date=${selectedDate}&hrs=${selectedHrs}`;
            }

            const response = await fetch(url);
            if (!response.ok) {
                if (response.status === 404) {
                    showBootstrapAlert("Data is not found for the selected date and hours. Please try changing the date and hours again.");
                    throw new Error("Data is not found for the selected date and hours");
                }
                throw new Error("Network response was not ok");
            } else {
                clearBootstrapAlert();
            }
            const data = await response.json();

            // Cache the data based on both param, date and hrs
            if (selectedDate && selectedHrs) {
                if (!statCache[param]) {
                    statCache[param] = {};
                }
                if (!statCache[param][selectedDate]) {
                    statCache[param][selectedDate] = {};
                }
                statCache[param][selectedDate][selectedHrs] = data;
            } else {
                statCache[param] = data;
            }
            return data;
        } catch (error) {
            console.error('Error:', error);
        }
    }

    const MapOptions = {
        center: [15.9162, 102.9560],
        zoom: 5,
        zoomControl: true,
        scrollWheelZoom: false,
        minZoom: 5,
    }

    const basemapUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}';
    const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">Esri | OpenStreetMap</a> contributors';

    const bulletincache = {};

    async function fetchData(url) {
        if (bulletincache[url]) {
            return bulletincache[url];
        }
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const data = await response.json();
            bulletincache[url] = data;
            return data;
        } catch (error) {
            console.error('Error:', error);
        }
    }

    // Subprovince map
    const hmap = L.map('homemap', MapOptions);
    L.tileLayer(basemapUrl, { tileSize: 256, attribution: attribution }).addTo(hmap);
    
    var subProvinceLayer = L.geoJSON().addTo(hmap);
    const subProvinceCache = {};
    const subprovince_url  = '/static/data/subprovincesFFGS_MK.geojson';

    async function getsubProvinceData() {
        try {
            if (subProvinceCache[subprovince_url]) {
                return subProvinceCache[subprovince_url];
            }
            const response = await fetch(subprovince_url);
            const data = await response.json();
            subProvinceCache[subprovince_url] = data;
            return data;
        } catch (error) {
            console.error('Error:', error);
        }
    }
 
    function determineStatsParam(param) {
        switch (param) {
            case "FFG06":
                return '6hrs';
            case "FFR12":
                return '12hrs';
            case "FFR24":
                return '24hrs';
            default:
                return null;  
        }
    }

    async function updateSubProvinceMap(param, parsedData){
        const subProvinceData = await getsubProvinceData();
    
        function getAlertValueById(param, fid) {
            const filtered = parsedData.find(item => item.ID_2 === fid);
            switch (param) {
                case "FFG06":
                    return filtered ? filtered.Alert_6Hrs : null;
                case "FFR12":
                    return filtered ? filtered.Risk_12Hrs : null;
                case "FFR24":
                    return filtered ? filtered.Risk_24Hrs : null;
                default:
                    return null;  
            }
        }
    
        function getColorbyCategory(cat) {
            switch(cat) {
                case 'Low':
                    return 'yellow';
                case 'Moderate':
                    return 'orange';
                case 'High':
                    return 'red';
                default:
                    return 'none';
            }
        }
    
        function defineStyle(param, feature){
            const fid = feature.properties.ID_2;
            const cat = getAlertValueById(param, fid);
            const color = getColorbyCategory(cat);
            let defaultStyle = { color: "#000", weight: 1, opacity: 1, fillOpacity: 1 };

            if (color === 'none') {
                defaultStyle = { ...defaultStyle, fillOpacity: 0, opacity: 0 }; // this will make the feature invisible
            }

            // const defaultStyle = { color: colors.white, weight: 1, opacity: 1, fillOpacity: 0.5 };
            return color ? {...defaultStyle, color} : defaultStyle; 
        }  

        // Add this in your updateSubProvinceMap function
        subProvinceLayer.on('layeradd', function (e) {
            onEachFeature(e.layer.feature, e.layer);
        });

        function onEachFeature(feature, layer) {
            layer.bindTooltip('<h6 class="fw-bold p-2">'+feature.properties.NAME_2+', '+feature.properties.NAME_1+',<br>'+feature.properties.NAME_0+'</h6>');
        }
    
        subProvinceLayer.clearLayers(); 
        subProvinceLayer.addData(subProvinceData, {
            onEachFeature: onEachFeature
        });
        subProvinceLayer.setStyle(feature => defineStyle(param, feature)); 
    }

    async function getDate() {
        const date_url = '/get-datelist/';
        try {
            const response = await fetch(date_url);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error:', error);
        }
    }

    function formatDate(inputDate) {
        const options = { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' };
        const date = new Date(inputDate);
        return date.toLocaleDateString('en-US', options);
    }

    const countRecordsPerISO = (dataArray, hrs) => {
        const counts = {};
      
        dataArray.forEach(item => {
            if (!counts[item.ISO]) {
                counts[item.ISO] = 0;
            }
            counts[item.ISO]++;
        });
      
        // Convert the counts object to the desired array format
        const results = [];
        for (let iso in counts) {
            results.push({
                iso: iso,
                hours: hrs,
                total_events: counts[iso]
            });
        }
        return results;
    }

    const combineData = (data6hrs, data12hrs, data24hrs) => {
        const combined = {};
    
        // Helper function to insert or update the combined data
        const insertOrUpdate = (data, hours) => {
            data.forEach(item => {
                if (!combined[item.iso]) {
                    combined[item.iso] = {};
                }
                combined[item.iso][hours] = item.total_events;
            });
        };
    
        insertOrUpdate(data6hrs, '6hrs');
        insertOrUpdate(data12hrs, '12hrs');
        insertOrUpdate(data24hrs, '24hrs');
    
        return combined;
    };

    function isoToFlagEmoji(iso) {
        const codePoints = iso
            .toUpperCase()
            .split('')
            .map(char => 127397 + char.charCodeAt())
            .join('-');
    
        return String.fromCodePoint(...codePoints.split('-'));
    }
    
      
    async function init() {
        try {
            // loader.style.display = 'block';
            let dateList = await getDate();
            const parsedDateList = JSON.parse(dateList);
            const selected_date = parsedDateList[0][0];
            const selected_hrs = '06'; 
            const selected_country = 'All';

            const formattedDate =  formatDate(selected_date);

            document.querySelector('#ffgsDate').innerHTML = formattedDate;
            document.querySelector('.datePlaceholder').innerHTML = selected_date + " 06:00 UTC"
            
            generateGraph("All");
            
            const data_6hrs = await getStatsBulletin('6hrs', selected_date, selected_hrs);
            const parsed_data_6hrs = JSON.parse(data_6hrs);
            const events6hrs = countRecordsPerISO(parsed_data_6hrs, '6hrs');

            updateSubProvinceMap("FFG06", parsed_data_6hrs)

            const data_12hrs = await getStatsBulletin('12hrs', selected_date, selected_hrs);
            const parsed_data_12hrs = JSON.parse(data_12hrs);
            const events12hrs = countRecordsPerISO(parsed_data_12hrs, '12hrs');

            const data_24hrs = await getStatsBulletin('24hrs', selected_date, selected_hrs);
            const parsed_data_24hrs = JSON.parse(data_24hrs);
            const events24hrs = countRecordsPerISO(parsed_data_24hrs, '24hrs');
            
            const organizedData = combineData(events6hrs, events12hrs, events24hrs);

            // Populate the table
            const tableBody = document.querySelector('.eventsTable tbody');
            const isos = ['KHM', 'LAO', 'THA', 'VNM'];

            const iso3ToIso2 = {
                'VNM': 'VN',
                'KHM': 'KH',
                'THA': 'TH',
                'LAO': 'LA'
            };

            isos.forEach(iso => {
                const row = tableBody.insertRow();
                const iso2 = iso3ToIso2[iso]
            
                const isoCell = row.insertCell(0);
                isoCell.classList.add('fs-3');
                isoCell.textContent = isoToFlagEmoji(iso2);
            
                const hoursList = ['6hrs', '12hrs', '24hrs'];
                hoursList.forEach(hour => {
                    const cell = row.insertCell();
                    cell.textContent = organizedData[iso] && organizedData[iso][hour] ? organizedData[iso][hour] : 0;
                });
            });
            // loader.style.display = 'none';
        } catch (error) {
            console.error('Error in init:', error);
            // loader.style.display = 'none';
        }
    }

    // Call the init function with await
    init();

    let adm0;
    let mainlakes;
    let river;
    let mekong_basin;

    const staticCache = {};

    async function fetchData(url) {
        try {
            if (staticCache[url]) {
                return staticCache[url]; 
            }

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const data = await response.json();
            staticCache[url] = data; 
            return data;
        } catch (error) {
            console.error('Fetch error:', error);
            throw error;
        }
    }

    async function loadLayers() {
        try {
            // Load adm0 data
            const adm0Data = await fetchData('/static/data/adm0.geojson');
            adm0 = L.geoJSON(adm0Data, {
                style: {
                    fillColor: '#9999ff',
                    weight: 1,
                    opacity: 0.5,
                    color: 'gray',
                    fillOpacity: 0.0,
                },
            }).addTo(hmap);

            // Load main lakes data
            const mainLakesData = await fetchData('/static/data/mainlakes_FFGS.geojson');
            mainlakes = L.geoJSON(mainLakesData, {
                style: {
                    fillColor: 'darkgray',
                    weight: 0,
                    opacity: 0.1,
                    color: 'white',
                    dashArray: '3',
                    fillOpacity: 1,
                },
            }).addTo(hmap);

            // Load river data
            const riverData = await fetchData('/static/data/riverMK_FFGS.geojson');
            river = L.geoJSON(riverData, {
                style: {
                    fillColor: '#9999ff',
                    weight: 2,
                    opacity: 1,
                    color: 'blue',
                    fillOpacity: 0.8,
                },
            }).addTo(hmap);

            // Load mekong basin data
            const mekongBasinData = await fetchData('/static/data/mekong_basin_area.geojson');
            mekong_basin = L.geoJSON(mekongBasinData, {
                style: {
                    fillColor: '#2E86C1',
                    weight: 3,
                    opacity: 0.5,
                    color: '#000',
                    fillOpacity: 0.0,
                },
            }).addTo(hmap);
        } catch (error) {
            console.error('Layer loading error:', error);
        }
    }

    // Call the loadLayers function to load the layers asynchronously.
    loadLayers();
});