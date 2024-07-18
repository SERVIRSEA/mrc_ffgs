document.addEventListener("DOMContentLoaded", function () {
    
    // GeoServer URL
    const geoserver_endpoint = 'http://119.15.81.22:8081'

    const scriptTag = document.getElementById("script-data");
    const selectedDate = scriptTag.getAttribute("data-date");
    const selectedHour = scriptTag.getAttribute("data-hour");
    const selectedCountry = scriptTag.getAttribute("data-country");

    // Function to fromat the date
    function formatDate(inputDate) {
        const options = { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' };
        const date = new Date(inputDate);
        return date.toLocaleDateString('en-US', options);
    }
    
    const formattedDate = formatDate(selectedDate);
    document.querySelector("#displayDate").innerHTML = formattedDate;

    const storms_data_path = {
        storms: '/get-storms/',
        stormsByCountry: '/get-storms-number-by-country/'
    };
    
    async function fetchStormsData(url) {
        try {
            const response = await fetch(url);
            return await response.json();
        } catch (error) {
            console.error('Error:', error);
        }
    }
    
    async function generateGraph(selectedCountry) {
        const data = await fetchStormsData(storms_data_path.storms);
        const parsedData = JSON.parse(data);

        const data_by_country = await fetchStormsData(storms_data_path.stormsByCountry);
        const stormsCountryData = JSON.parse(data_by_country);

        let totalEvents = 0;

        // Helper function to get the button for a specific country
        function getButtonByCountry(country) {
            const buttons = Array.from(document.querySelectorAll(".btn-group.stormsBtn button"));
            return buttons.find(button => button.textContent.includes(country));
        }

        const findEventsByCountry = (country) => {
            let countryData = stormsCountryData.find(item => item.country === country);
            return countryData ? countryData.events : 0;
        };

        const updateDOMForCountry = (country, events) => {
            const button = getButtonByCountry(country);
            button.querySelector(`span`).innerHTML = events;
        };

        let stormsData;

        if (selectedCountry === "All") {
            const countries = ["Cambodia", "Laos", "Thailand", "Vietnam"];
            
            countries.forEach(country => {
                const events = findEventsByCountry(country);
                totalEvents += events;
                updateDOMForCountry(country, events);
                const button = getButtonByCountry(country);
                button.style.display = 'block'; // Ensure it's displayed
            });
            stormsData = parsedData;
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

            stormsData = parsedData.filter(obj => obj.countries === selectedCountry )
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
        var chart = Highcharts.chart('stormsChart', {
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
                        enabled: true,
                        format: '{point.percentage:.1f} %',
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
                layout: 'vertical',
                align: 'bottom',
                verticalAlign: 'middle',
                itemMarginTop: 3,
                itemMarginBottom: 0   
            },
        });

        var titleText = '<p style="font-size: 5px">TOTAL STORM EVENTS</p>';
        var totalEventsText = '<tspan x="16.5em" dy="1.2em">' + totalEvents + '</tspan>';

        var chartCenterX = chart.plotWidth / 2;
        var chartCenterY = chart.plotHeight / 2;

        var textElement = chart.renderer.text(titleText + totalEventsText, chartCenterX, chartCenterY)
            .attr({
                zIndex: 999
            })
            .css({
                color: '#000',
                fontSize: '15px',
                fontWeight: 'bold',
                textAlign: 'center'
            })
            .add();

        // Now, reposition the text based on its bounding box
        var textBBox = textElement.getBBox();
        textElement.attr({
            x: chartCenterX - textBBox.width / 3,
            y: chartCenterY - textBBox.height / 6
        });
    }

    // Caches for data
    const statCache = {
        '1hrs': {},
        '3hrs': {},
        '6hrs': {},
        '12hrs': {},
        '24hrs': {}
    };

    // Fetch URLs
    const urls = {
        '1hrs': '/get-alert-stat-1hrs/',
        '3hrs': '/get-alert-stat-3hrs/',
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
                return statCache[param][selectedDate][selectedHrs];
            }

            // Construct the URL with the selectedDate parameter
            let url = urls[param];
            if (selectedDate && selectedHrs) {
                url += `?date=${selectedDate}&hrs=${selectedHrs}`;
            }

            const response = await fetch(url);
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
        // center: [15.9162, 102.9560],
        defaultCenter: [15.9162, 102.9560],
        khmCenter: [11.56, 105.2],
        // zoom: 5,
        defaultZoom: 5,
        khmZoom: 6,
        zoomControl: false,
        scrollWheelZoom: false,
        minZoom: 5,
    }

    const basemapUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}';
    const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">Esri | OpenStreetMap</a> contributors';

    var tdWmsRainLayer = L.tileLayer.wms(geoserver_endpoint+ '/geoserver/ffgs/wms?', {
        layers: 'ffgs:rainacc_gsmap_now',
        format: 'image/png',
        transparent: true,
        styles: 'rainacc',
        pane: 'droughtLayer'
    });

    //// List of all countries
    const allCountries = ['KHM', 'THA', 'VNM', 'LAO'];
    var mekongCountryLayer = L.tileLayer.wms(geoserver_endpoint + "/geoserver/adm/wms?service=WMS&request=GetMap", {
        layers: 'adm:mekong_country',
        format: 'image/png',
        version: '1.1.0',
        transparent: true,
        styles: 'mekong_country_style',
        pane: 'basinLayer',
        CQL_FILTER: `ISO IN ('${allCountries.join("', '")}')`
    });

    var mekongBasinLayer = L.tileLayer.wms(geoserver_endpoint + "/geoserver/adm/wms?service=WMS&request=GetMap", {
        layers: 'adm:mekong_river_basin',
        format: 'image/png',
        version: '1.1.0',
        transparent: true,
        styles: 'mekong_basin_style',
        pane: 'basinLayer'
    });
    
        
    const rfMapOptions = {
        center: [15.9162, 102.9560],
        zoom: 5,
        zoomControl: false,
        scrollWheelZoom: false,
        minZoom: 0,
    }
    var rfmap = L.map('rfmap', rfMapOptions);
    rfmap.createPane('basemap');
    rfmap.getPane('basemap').style.zIndex = 1;
    rfmap.createPane('droughtLayer');
    rfmap.getPane('droughtLayer').style.zIndex = 20;
    rfmap.createPane('basinLayer');
    rfmap.getPane('basinLayer').style.zIndex = 500;

    // Add the basemap layer
    var rfbasemap = L.tileLayer(basemapUrl, {
        attribution: attribution,
        pane: 'basemap'
    }).addTo(rfmap);
    rfmap.addLayer(tdWmsRainLayer);
    rfmap.addLayer(mekongCountryLayer);
    // rfmap.addLayer(mekongBasinLayer);

    async function get_storm_location() {
        const apiUrl = 'https://rainstorms-servir.adpc.net/action=get-realtime-events'; 
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({})
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            // Add circle markers to the map
            data.forEach(item => {
                L.circle([item.center_lat, item.center_lng], {
                    color: 'white',
                    fillColor: 'red',
                    fillOpacity: 0.6,
                    radius: 20000, // Adjust the radius as needed
                    weight: 1 // Stroke line weight
                }).addTo(rfmap);

                //  Add label
                L.marker([item.center_lat, item.center_lng], {
                    icon: L.divIcon({
                        className: 'label-icon',
                        html: `<div>${item.date.split(" ")[1].replace(":00", '')}</div>`,
                        iconSize: [20, 20]
                    })
                }).addTo(rfmap);

            });
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    }
    // Call the fetchData function when the page loads
    window.onload = get_storm_location;

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

    const bulletin_map_data = {};
    const bulletin_map_data_url = '/get-seaffgs-bulletin-map-data/';

    const colors = {
        yellow: '#FFFF00',
        lightGreen: '#90EE90',
        lightBlue: '#ADD8E6',
        blue: '#0000FF',
        orange: '#FFA500',
        red: '#FF0000',
        deepSkyBlue: '#00BFFF',
        green: '#008000',
        violet: '#EE82EE',
        white: '#FFFFFF'
    };

    const styles = {
        ASMT: [
            {min: 0.01, max: 0.65, color: colors.yellow},
            {min: 0.65, max: 0.9, color: colors.lightGreen},
            {min: 0.9, max: 1.0, color: colors.blue},
        ],
        MAP01: [
            {min: 0, max: 2.5, color: colors.lightBlue},
            {min: 2.5, max: 15, color: colors.blue},
            {min: 15, max: 30, color: colors.deepSkyBlue},
            {min: 30, color: colors.lightGreen}
        ],
        MAP03: [
            {min: 0, max: 5, color: colors.lightBlue},
            {min: 5, max: 25, color: colors.blue},
            {min: 25, max: 50, color: colors.deepSkyBlue},
            {min: 50, color: colors.lightGreen}
        ],
        MAP06: [
            {min: 0, max: 7.5, color: colors.lightBlue},
            {min: 7.5, max: 35, color: colors.blue},
            {min: 35, max: 70, color: colors.deepSkyBlue},
            {min: 70, color: colors.lightGreen}
        ],
        MAP24: [
            {min: 0, max: 10, color: colors.lightBlue},
            {min: 10, max: 50, color: colors.blue},
            {min: 50, max: 100, color: colors.deepSkyBlue},
            {min: 100, color: colors.lightGreen}
        ],
        FMAP01: [
            {min: 0, max: 2.5, color: colors.lightBlue},
            {min: 2.5, max: 15, color: colors.blue},
            {min: 15, max: 30, color: colors.deepSkyBlue},
            {min: 30, color: colors.lightGreen},
        ],   
        FMAP03: [
            {min: 0, max: 5, color: colors.lightBlue},
            {min: 5, max: 25, color: colors.blue},
            {min: 25, max: 50, color: colors.deepSkyBlue},
            {min: 50, color: colors.lightGreen},
        ],
        FMAP06: [
            {min: 0, max: 7.5, color: colors.lightBlue},
            {min: 7.5, max: 35, color: colors.blue},
            {min: 35, max: 70, color: colors.deepSkyBlue},
            {min: 70, color: colors.lightGreen},
        ],
        FMAP24: [
            {min: 0, max: 10, color: colors.lightBlue},
            {min: 10, max: 50, color: colors.blue},
            {min: 50, max: 100, color: colors.deepSkyBlue},
            {min: 100, max: 200, color: colors.lightGreen},
        ],
        FFG01: [
            {min: 0, max: 10, color: colors.red},
            {min: 10, max: 25, color: colors.yellow},
            {min: 25, max: 40, color: colors.lightGreen},
            // {min: 40, max: 60, color: colors.lightGreen},
        ],
        FFG03: [
            {min: 0, max: 10, color: colors.red},
            {min: 10, max: 25, color: colors.yellow},
            {min: 25, max: 40, color: colors.lightGreen},
            // {min: 40, max: 70, color: colors.lightGreen},
        ],
        FFG06: [
            {min: 0, max: 15, color: colors.red},
            {min: 15, max: 30, color: colors.yellow},
            {min: 30, max: 60, color: colors.lightGreen},
            // {min: 60, max: 100, color: colors.lightGreen},
        ],
        FFFT01: [
            {min: 0.01, max: 10, color: colors.yellow},
            {min: 10, max: 40, color: colors.orange},
            {min: 40, max: 100, color: colors.red},
        ],
        FFFT03: [
            {min: 0.01, max: 10, color: colors.yellow},
            {min: 10, max: 40, color: colors.orange},
            {min: 40, max: 100, color: colors.red},
        ],
        FFFT06: [
            {min: 0.01, max: 10, color: colors.yellow},
            {min: 10, max: 40, color: colors.orange},
            {min: 40, max: 100, color: colors.red},
        ],
        FFR12: [
            {min: 0.01, max: 0.2, color: colors.red},
            {min: 0.2, max: 0.4, color: colors.orange},
            {min: 0.4, max: 1, color: colors.yellow},
        ],
        FFR24: [
            {min: 0.01, max: 0.2, color: colors.red},
            {min: 0.2, max: 0.4, color: colors.orange},
            {min: 0.4, max: 1, color: colors.yellow},
        ],
    };

    function getStyle(param, feature, data) {
        const ffgVal = data.find(x => x && x.BASIN === feature.properties.value)?.[param];
        const defaultStyle = { color: colors.white, weight: 1, opacity: 0, fillOpacity: 0 };
        const paramStyles = styles[param];
        if (!paramStyles) return defaultStyle;
    
        for (let style of paramStyles) {
            if (ffgVal > style.min && ffgVal <= style.max) {
                return { ...defaultStyle, ...style, opacity: 1, fillOpacity: 0.8 };
            }
        }
        return defaultStyle;
    }

    // Define a function to create map instances
    function createMapInstance(id) {
        const map = L.map(id, MapOptions);
        map.createPane('basemap');
        map.getPane('basemap').style.zIndex = 1;
        map.createPane('droughtLayer');
        map.getPane('droughtLayer').style.zIndex = 20;
        map.createPane('basinLayer');
        map.getPane('basinLayer').style.zIndex = 500;
        L.tileLayer(basemapUrl, { tileSize: 256, attribution: attribution, pane: 'basemap' }).addTo(map);

         //// List of all countries
         const allCountries = ['KHM', 'THA', 'VNM', 'LAO'];
         // Construct CQL filter
         cqlFilter = `ISO IN ('${allCountries.join("', '")}')`;
 
         const mekongCountryLayer = L.tileLayer.wms(geoserver_endpoint + "/geoserver/adm/wms?service=WMS&request=GetMap", {
             layers: 'adm:mekong_country',
             format: 'image/png',
             version: '1.1.0',
             transparent: true,
             styles: 'mekong_country_style',
             pane: 'basinLayer',
             CQL_FILTER: cqlFilter
        });
    
        const mekongBasinLayer = L.tileLayer.wms(geoserver_endpoint + "/geoserver/adm/wms?service=WMS&request=GetMap", {
            layers: 'adm:mekong_river_basin',
            format: 'image/png',
            version: '1.1.0',
            transparent: true,
            styles: 'mekong_basin_style',
            pane: 'basinLayer'
        });
    
        map.addLayer(mekongCountryLayer);
        map.addLayer(mekongBasinLayer);

        return map;
    }

    // Create map instances for different parameters
    const asm6hrMap = createMapInstance('asm6hr');
    const map24hrMap = createMapInstance('map24hr');
    const ffg1hrMap = createMapInstance('ffg1hr');
    const ffg3hrMap = createMapInstance('ffg3hr');
    const ffg6hrMap = createMapInstance('ffg6hr');
    const fmap24hrMap = createMapInstance('fmap24hr');
    const ffr12hrMap = createMapInstance('ffr12hr');
    const ffr24hrMap = createMapInstance('ffr24hr');

    // Define a mapping of parameters to map instances
    const mapInstances = {
        ASMT: asm6hrMap,
        MAP24: map24hrMap,
        FFG01: ffg1hrMap,
        FFG03: ffg3hrMap,
        FFG06: ffg6hrMap,
        FMAP24: fmap24hrMap,
        FFR12: ffr12hrMap,
        FFR24: ffr24hrMap
    };

    const geoserver_url = `${geoserver_endpoint}/geoserver/ffgs/`;

    // Create a function to generate WMS URL
    function generateWMSUrl(param, selectedDate, selectedHr) {
        return `${geoserver_url}wms?`;
    }

    var wmsLayer = L.tileLayer.wms('', {
        format: 'image/png',
        version: '1.1.0',
        transparent: true
    });

    function getStyleName(param) {
        // Map parameter values to corresponding style names
        const styleMap = {
            'ASMT': 'asmt_style',
            'MAP06': 'map06_style',
            'MAP24': 'map24_style',
            'FFG01': 'ffg01_style',
            'FFG03': 'ffg03_style',
            'FFG06': 'ffg06_style',
            'FMAP01': 'fmap01_style',
            'FMAP03': 'fmap03_style',
            'FMAP06': 'fmap06_style',
            'FMAP24': 'fmap24_style',
            'FFFT01': 'ffft01_style',
            'FFFT03': 'ffft03_style',
            'FFFT06': 'ffft06_style',
            'FFR12': 'ffr12_style',
            'FFR24': 'ffr24_style'
        };
    
        // Return the corresponding style name if it exists in the map, otherwise return null
        return styleMap[param] || 'raster';
    }

    // Function to update map center based on selected country
    function updateMapCenter(mapInstance, selectedCountry) {
        if (selectedCountry === 'KHM') {
            mapInstance.setView(MapOptions.khmCenter, MapOptions.khmZoom);
            rfmap.setView(MapOptions.khmCenter, MapOptions.khmZoom);
        } else {
            mapInstance.setView(MapOptions.defaultCenter, MapOptions.defaultZoom);
            rfmap.setView(MapOptions.defaultCenter, MapOptions.defaultZoom);
        }
    }

    var wmsLayer2;
    async function createMap(param, selectedDate, selectedHr) {
        var wmsUrl = generateWMSUrl(param, selectedDate, selectedHr);
        const mapInstance = mapInstances[param];
        if (!mapInstance) {
            console.error(`Map instance for parameter ${param} not found.`);
            return;
        }
        // Initialize wmsLayer if it's not already defined for the map instance
        if (!mapInstance.wmsLayer) {
            mapInstance.wmsLayer = L.tileLayer.wms('', {
                format: 'image/png',
                version: '1.1.0',
                transparent: true,
                pane: 'droughtLayer'
            });
        }
        var wmsLayer = mapInstance.wmsLayer;
    
        if (wmsLayer && mapInstance.hasLayer(wmsLayer)) {
            mapInstance.removeLayer(wmsLayer);
        }
        wmsLayer.setUrl(wmsUrl);
        wmsLayer.setParams({
            layers: `ffgs:${param}_${selectedDate}${selectedHr}`,
            styles: getStyleName(param)
        });
        if (!mapInstance.hasLayer(wmsLayer)) {
            wmsLayer.addTo(mapInstance);
        }
        // Update map center based on selected country
        updateMapCenter(mapInstance, selectedCountry);
        
        // Construct CQL filter based on the selected country
        var cqlFilter = '';

        // Check if all countries are selected
        if (selectedCountry === 'All') {
            // Remove wmsLayer2 if it exists
            if (mapInstance.wmsLayer2 && mapInstance.hasLayer(mapInstance.wmsLayer2)) {
                mapInstance.removeLayer(mapInstance.wmsLayer2);
                mapInstance.wmsLayer2 = null; // Remove reference to wmsLayer2
            }
        } else {
            // List of all countries
            const allCountries = ['KHM', 'THA', 'VNM', 'LAO'];
            // Exclude selected country from the list
            const filteredCountries = allCountries.filter(country => country !== selectedCountry);
            // Construct CQL filter
            cqlFilter = `ISO IN ('${filteredCountries.join("', '")}')`;
            
            // Add wmsLayer2 with the constructed CQL filter
            wmsLayer2 = L.tileLayer.wms(`${geoserver_endpoint}/geoserver/adm/wms?`, {
                layers: 'adm:mekong_country',
                format: 'image/png',
                version: '1.1.0',
                transparent: true,
                CQL_FILTER: cqlFilter,
                styles: 'adm0_filter_style'
            }).addTo(mapInstance);
            mapInstance.wmsLayer2 = wmsLayer2; // Store reference to wmsLayer2
        }  
    }

    // Function to create the legend content based on parameter styles
    function createLegend(param) {
        const paramStyles = styles[param];
        let legendHTML = '<div class="legend" style="background-color: white; padding: 10px;">';
        
        for (const style of paramStyles) {
            const { color, min, max } = style;
            const label = `${min} - ${max}`;
            legendHTML += `<div><span class="legend-color p-2" style="background-color: ${color}; display: inline-block; margin-right: 5px;"></span>${label}</div>`;
        }
        
        legendHTML += '</div>';
        
        return legendHTML;
    }


    // Function to add a legend to the map
    function addLegendToMap(map, legendContent) {
        const legend = L.control({ position: 'bottomright' });

        legend.onAdd = function () {
            const div = L.DomUtil.create('div', 'info legend');
            div.innerHTML = legendContent;
            return div;
        };

        legend.addTo(map);
    }

    async function populateTable(tableElement, data, interval) {
        const existingTbody = tableElement.querySelector('tbody');
        if (existingTbody) {
            existingTbody.remove();
        }

        const tbody = document.createElement('tbody');
        tableElement.appendChild(tbody);
    
        const lowColor = 'yellow';
        const moderateColor = 'orange';
        const highColor = 'red';
    
        if (data.length === 0) {
            // const row = tbody.insertRow();
            // for (let i = 0; i < 9; i++) {
            //     const cell = row.insertCell(i);
            //     cell.innerHTML = '---';
            // }
            const row = tbody.insertRow();
            const cellProvinces = row.insertCell(0);
            const cellDistricts = row.insertCell(1);
            const cellLevel = row.insertCell(2);
            // const cellFemalePopulation = row.insertCell(3);
            // const cellMalePopulation = row.insertCell(4);
            // const cellRoad = row.insertCell(5);
            // const cellHospital = row.insertCell(6);
            // const cellGDP = row.insertCell(7);
            // const cellCropLands = row.insertCell(8);

            cellProvinces.innerHTML = 'NO RISK AREA';
            cellDistricts.innerHTML = '';
            cellLevel.innerHTML = '';
            // cellFemalePopulation.innerHTML = '';
            // cellMalePopulation.innerHTML = '';
            // cellRoad.innerHTML = '';
            // cellHospital.innerHTML = '';
            // cellGDP.innerHTML = '';
            // cellCropLands.innerHTML = '';
        } else {
            data.forEach(item => {
                const row = tbody.insertRow();
                const cellProvinces = row.insertCell(0);
                const cellDistricts = row.insertCell(1);
                const cellLevel = row.insertCell(2);
                // const cellFemalePopulation = row.insertCell(3);
                // const cellMalePopulation = row.insertCell(4);
                // const cellRoad = row.insertCell(5);
                // const cellHospital = row.insertCell(6);
                // const cellGDP = row.insertCell(7);
                // const cellCropLands = row.insertCell(8);

                cellProvinces.innerHTML = item.NAME_1 || 'NO RISK AREA';
                cellDistricts.innerHTML = item.NAME_2 || '---';
                cellLevel.innerHTML = interval === '1hrs' ? item.Alert_1Hrs : interval === '3hrs' ? item.Alert_3Hrs : interval === '6hrs' ? item.Alert_6Hrs : interval === '12hrs' ? item.Risk_12Hrs : item.Risk_24Hrs;
                // cellFemalePopulation.innerHTML = (parseFloat(item.F1) + parseFloat(item.F2) + parseFloat(item.F3)).toLocaleString() || '---';
                // cellMalePopulation.innerHTML = (parseFloat(item.M1) + parseFloat(item.M2) + parseFloat(item.M3)).toLocaleString() || '---';
                // cellRoad.innerHTML = (parseFloat(item.RTP1) + parseFloat(item.RTP2) + parseFloat(item.RTP3) + parseFloat(item.RTP4)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '---';
                // cellHospital.innerHTML = (parseFloat(item.Hospital)).toLocaleString() || '---';
                // cellGDP.innerHTML = (parseFloat(item.GDP)).toLocaleString() || '---';
                // cellCropLands.innerHTML = (parseFloat(item.crop_sqm)).toLocaleString() || '---';

                if (cellLevel.innerHTML === 'Low') {
                    cellLevel.style.backgroundColor = lowColor;
                } else if (cellLevel.innerHTML === 'Moderate') {
                    cellLevel.style.backgroundColor = moderateColor;
                } else if (cellLevel.innerHTML === 'High') {
                    cellLevel.style.backgroundColor = highColor;
                }
            });
        }
    }
    
    const displayDate = document.querySelector("#displayDate");
    const dateElements = document.querySelectorAll('.datePlaceholder');

    function formatDate(inputDate) {
        const options = { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' };
        const date = new Date(inputDate);
        return date.toLocaleDateString('en-US', options);
    }

    const tabMapping = {
        "tab6hrs": "6hrs",
        "tab12hrs": "12hrs",
        "tab24hrs": "24hrs"
    };

    async function fetchDataForInterval(iso, interval, selected_date, selected_hrs) {
        try {
            const data = await getStatsBulletin(interval, selected_date, selected_hrs);
            const parsedData = JSON.parse(data);
            return parsedData.filter(item => item.ISO === iso);
        } catch (error) {
            console.error(`Error fetching data for ${iso} - ${interval}:`, error);
            return [];
        }
    }

    const countryMappings = {
        'KHM': 'CAMBODIA',
        'LAO': 'LAOS',
        'THA': 'THAILAND',
        'VNM': 'VIETNAM'
    };

    async function createAndPopulateTablesForAllISOs(selected_date, selected_hrs, country) {
        // Define the list of all country ISOs
        const allCountryISOs = ['KHM', 'LAO', 'THA', 'VNM'];

        // Determine the ISOs to process based on the country parameter
        const countryISOs = country === 'All' ? allCountryISOs : [country];

        const intervalsGroup1 = ['1hrs', '3hrs', '6hrs'];
        const intervalsGroup2 = ['12hrs', '24hrs'];

        for (const iso of countryISOs) {
            const dataGroup1 = await fetchDataAndCombine(iso, intervalsGroup1, selected_date, selected_hrs);
            await createTableAndPopulateDataGroup1(iso, dataGroup1, intervalsGroup1);

            const dataGroup2 = await fetchDataAndCombine(iso, intervalsGroup2, selected_date, selected_hrs); 
            await createTableAndPopulateDataGroup2(iso, dataGroup2, intervalsGroup2);
        }
    }

    async function createTableAndPopulateDataGroup1(iso, data, intervalsGroup1) {
        const totalLength = Math.max(...Object.values(data).map(intervalData => intervalData.length));
    
        const numPages = Math.ceil(totalLength / 40) || 1;
        const rowsPerPage = 40;
        const body = document.body;
    
        for (let pageNum = 0; pageNum < numPages; pageNum++) {
            const sectionId = `${iso}TableSectionG1${pageNum + 1}`;
            const section = document.createElement('section');
            section.className = 'table-section';
            section.id = sectionId;
    
            const flagContainer = createFlagContainer(iso);
            section.appendChild(flagContainer);
    
            const table = createTableStructure(iso, 'FLASH FLOOD GUIDANCE', intervalsGroup1);
            section.appendChild(table);
    
            if (totalLength === 0) {
                const tableBody = document.createElement('tbody');
                const noDataRow = document.createElement('tr');
                const noDataCell = document.createElement('td');
                noDataCell.colSpan = 9;
                noDataCell.textContent = 'No Flash Flood Guidance in the next 1, 3 and 6 hours';
                noDataRow.appendChild(noDataCell);
                tableBody.appendChild(noDataRow);
                table.appendChild(tableBody);
            } else {
                const startIdx = pageNum * rowsPerPage;
                const endIdx = Math.min(startIdx + rowsPerPage, totalLength);
                populateTable(table, data, intervalsGroup1, startIdx, endIdx);
            }
    
            body.appendChild(section);
        }
    }
    
    async function createTableAndPopulateDataGroup2(iso, data, intervalsGroup2){
        const totalLength = Math.max(...Object.values(data).map(intervalData => intervalData.length));
    
        const numPages = Math.ceil(totalLength / 40) || 1;
        const rowsPerPage = 40;
        const body = document.body;
    
        for (let pageNum = 0; pageNum < numPages; pageNum++) {
            const sectionId = `${iso}TableSectionG2${pageNum + 1}`;
            const section = document.createElement('section');
            section.className = 'table-section';
            section.id = sectionId;
    
            const flagContainer = createFlagContainer(iso);
            section.appendChild(flagContainer);
    
            const table = createTableStructure(iso, 'FLASH FLOOD RISK', intervalsGroup2);
            section.appendChild(table);
    
            if (totalLength === 0) {
                const tableBody = document.createElement('tbody');
                const noDataRow = document.createElement('tr');
                const noDataCell = document.createElement('td');
                noDataCell.colSpan = 9;
                noDataCell.textContent = 'No Flash Flood Risk in the next 12, and 24 hours';
                noDataRow.appendChild(noDataCell);
                tableBody.appendChild(noDataRow);
                table.appendChild(tableBody);
            } else {
                const startIdx = pageNum * rowsPerPage;
                const endIdx = Math.min(startIdx + rowsPerPage, totalLength);
                populateTable(table, data, intervalsGroup2, startIdx, endIdx);
            }
    
            body.appendChild(section);
        }
    }

    async function fetchDataAndCombine(iso, intervals, selected_date, selected_hr){
        const combinedData = {};
        for (const interval of intervals) {
            const data = await fetchDataForInterval(iso, interval, selected_date, selected_hr);
            combinedData[interval] = data;
        }
        return combinedData;
    }

    // Helper function to apply cell color based on the level value
    function applyCellColor(cell, level) {
        const lowColor = 'yellow';
        const moderateColor = 'orange';
        const highColor = 'red';
    
        if (level === 'Low') {
            cell.style.backgroundColor = lowColor;
        } else if (level === 'Moderate') {
            cell.style.backgroundColor = moderateColor;
        } else if (level === 'High') {
            cell.style.backgroundColor = highColor;
        }
    }
    
    function createFlagContainer(iso) {
        const flagContainer = document.createElement('div');
        flagContainer.className = 'pt-0';
        flagContainer.style.display = 'flex';
        flagContainer.style.justifyContent = 'flex-start';
    
        // Create an image element for the flag
        const flagImage = document.createElement('img');
        flagImage.src = `/static/img/${iso.toLowerCase()}.png`; // Adjust the path to your local image
        flagImage.alt = 'Flag';
        flagImage.classList.add('flag-image-pdf');
        flagContainer.appendChild(flagImage);
    
        // Create and append the country-specific title
        const countryTitle = document.createElement('h1');
        countryTitle.className = 'mt-0 pt-0 ps-4';
        const titleSpan = document.createElement('span');
        titleSpan.className = 'text-primary pt-0 mt-0';
        titleSpan.textContent = 'THE DETAILED INFORMATION FOR FLASH FLOOD WARNING';
        const countryName = document.createElement('p');
        countryName.textContent = countryMappings[iso]; // Assuming countryMappings is defined
        countryTitle.appendChild(titleSpan);
        countryTitle.appendChild(countryName);
        flagContainer.appendChild(countryTitle);
    
        return flagContainer;
    }

    function populateTable(table, data, intervals, startIdx, endIdx) {
        const tableBody = document.createElement('tbody');
    
        for (let i = startIdx; i < endIdx; i++) {
            const row = document.createElement('tr');
            intervals.forEach((interval, index) => {
                const rowData = data[interval][i] || { NAME_1: '', NAME_2: '', Level: '' };
    
                const cell1 = document.createElement('td');
                cell1.textContent = rowData.NAME_1 || '';
                row.appendChild(cell1);
    
                const cell2 = document.createElement('td');
                cell2.textContent = rowData.NAME_2 || '';
                row.appendChild(cell2);
    
                const cellLevel = document.createElement('td');
                cellLevel.textContent = rowData.Level || '';
                if (rowData.Level) {
                    applyCellColor(cellLevel, rowData.Level);
                }
                if (index < intervals.length - 1) {
                    cellLevel.classList.add('border-right');
                }
                row.appendChild(cellLevel);
            });
            tableBody.appendChild(row);
        }
    
        table.appendChild(tableBody);
    }
    
    function createTableStructure(iso, title, intervals) {
        const tableId = `${iso}Table${intervals.length > 2 ? '1' : '2'}`;
        const table = document.createElement('table');
        table.className = 'table table-responsive table-hover mt-5 mb-5 text-center';
        table.id = tableId;
    
        const intervalHeaders = intervals.map(interval => `
            <th colspan="3" class="text-center fs-5 ${interval === '6hrs' || interval === '24hrs' ? '' : 'border-right'}">In the next ${interval}</th>
        `).join('');
    
        const intervalFields = intervals.map((interval, index) => `
            <th class="align-middle">Provinces</th>
            <th class="align-middle">Districts</th>
            <th class="align-middle ${index === intervals.length - 1 ? '' : 'border-right'}">Level</th>
        `).join('');
    
        table.innerHTML = `
            <thead class="table-secondary">
                <tr>
                    <th colspan="${intervals.length * 3}" class="fs-4 fw-bold text-center border-top-1">${title} IN THE LOWER MEKONG BASIN</th>
                </tr>
                <tr>
                    ${intervalHeaders}
                </tr>
                <tr>
                    ${intervalFields}
                </tr>
            </thead>
            <tbody id="${tableId}Body">
            </tbody>
        `;
    
        return table;
    }

    async function init() {
        try {
            const formattedDisplayDate = formatDate(selectedDate);
            displayDate.innerHTML = formattedDisplayDate;

            // 2023-07-01 06:00 UTC
            dateElements.forEach(function (element) {
                element.textContent = selectedDate + " " + selectedHour + ":00 (UTC+7)";
            });

            const countryMapping = {
                "All": "All",
                "KHM": "Cambodia",
                "LAO": "Laos",
                "THA": "Thailand",
                "VNM": "Vietnam"
            };

            const countryName = countryMapping[selectedCountry];

            generateGraph(countryName);

            var dateWithoutHyphens = selectedDate.replace(/-/g, '');

            // Call createMap sequentially for each parameter
            for (const param in mapInstances) {
                await createMap(param, dateWithoutHyphens, selectedHour);
                // Add legend dynamically
                const legendContent = createLegend(param);
                addLegendToMap(mapInstances[param], legendContent); 
            }
            createAndPopulateTablesForAllISOs(selectedDate, selectedHour, selectedCountry);
        } catch (error) {
            console.error('Error in init:', error);
        }
    }

    // Call the init function with await
    init();

    // http://localhost:8000/pdf-template/?selectedDate=2023-09-01&selectedHr=06&selectedCountry=All
});

