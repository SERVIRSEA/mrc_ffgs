document.addEventListener("DOMContentLoaded", function() {
    const dateInput = document.getElementById("dateInput");
    const hourInput = document.getElementById("hrSelection");
    const countryInput = document.getElementById("countryBulletin");
    const updateBulletinBtn = document.getElementById("updateBulletin");

    let paramCache = {
        date: null,
        hour: null,
        country: null
    };

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
        const parsedData = JSON.parse(data);

        const data_by_country = await getStormsByCountry();
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

        const updateDOMForCountry = (countryName, events) => {
            const id = countryName.charAt(0).toLowerCase() + countryName.slice(1) + "Storms";
    
            // Fetch the span using the constructed ID
            const spanElement = document.getElementById(id);
            
            if (spanElement) {
                // Update the innerHTML of the span with the provided events
                spanElement.innerHTML = events;
            } else {
                console.error(`Element with ID ${id} not found.`);
            }
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
        
        
        // console.log(totalEvents)
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
                layout: 'vertical',
                align: 'bottom',
                verticalAlign: 'middle',
                itemMarginTop: 10,
                itemMarginBottom: 10
            }
        });

        var textElement = chart.renderer.text('' + totalEvents, chart.chartWidth / 2, chart.chartHeight / 2)
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
            x: chart.chartWidth / 2 - textBBox.width / 2,
            y: chart.chartHeight / 2 + textBBox.height / 2
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

    async function updateTable(dataToProcess) {
        const total_pop = document.querySelector("#total_pop");
        const total_female_pop = document.querySelector("#total_female_pop");
        const female_pop_f1 = document.querySelector("#female_pop_f1");
        const female_pop_f2 = document.querySelector("#female_pop_f2");
        const female_pop_f3 = document.querySelector("#female_pop_f3");
        const total_male_pop = document.querySelector("#total_male_pop");
        const male_pop_m1 = document.querySelector("#male_pop_m1");
        const male_pop_m2 = document.querySelector("#male_pop_m2");
        const male_pop_m3 = document.querySelector("#male_pop_m3");
        
        const highway_road =  document.querySelector("#highwayRoad");
        const primary_road =  document.querySelector("#primaryRoad");
        const secondary_road =  document.querySelector("#secondaryRoad");
        const tertiary_road =  document.querySelector("#tertiaryRoad");
        const hospital =  document.querySelector("#hospital");
        const gdp =  document.querySelector("#gdp");
        const croplands =  document.querySelector("#cropLands");
        
        // Initialize all elements to '---' as default
        [total_pop, total_female_pop, female_pop_f1, female_pop_f2, female_pop_f3, 
        total_male_pop, male_pop_m1, male_pop_m2, male_pop_m3, highway_road, primary_road,
        secondary_road, tertiary_road, hospital, gdp, croplands].forEach(el => el.innerHTML = '---');
    
        if (!dataToProcess || Object.keys(dataToProcess).length === 0) {
            return;
        }
    
        let parsed_data = dataToProcess; //JSON.parse(dataToProcess);
    
        // Population calculations
        let totalPopulation = 0;
        let totalFemalePopulation = 0;
        let femalePopulationF1 = 0;
        let femalePopulationF2 = 0;
        let femalePopulationF3 = 0;
        let totalMalePopulation = 0;
        let malePopulationM1 = 0;
        let malePopulationM2 = 0;
        let malePopulationM3 = 0;
    
        // Road Infrastructures
        let highwayRoad = 0;
        let primaryRoad = 0;
        let secondaryRoad = 0;
        let tertiaryRoad = 0;

        // Hospital
        let hospitalNumber = 0;

        // Economic vulnerability
        let totalGDP = 0;
        let totalCroplands = 0;
    
        parsed_data.forEach(item => {
            totalPopulation += parseFloat(item.M1) + parseFloat(item.M2) + parseFloat(item.M3) + parseFloat(item.F1) + parseFloat(item.F2) + parseFloat(item.F3);
            totalFemalePopulation += parseFloat(item.F1) + parseFloat(item.F2) + parseFloat(item.F3);
            femalePopulationF1 += parseFloat(item.F1);
            femalePopulationF2 += parseFloat(item.F2);
            femalePopulationF3 += parseFloat(item.F3);
            totalMalePopulation += parseFloat(item.M1) + parseFloat(item.M2) + parseFloat(item.M3);
            malePopulationM1 += parseFloat(item.M1);
            malePopulationM2 += parseFloat(item.M2);
            malePopulationM3 += parseFloat(item.M3);
            
            highwayRoad += parseFloat(item.RTP1);
            primaryRoad += parseFloat(item.RTP2);
            secondaryRoad += parseFloat(item.RTP3);
            tertiaryRoad += parseFloat(item.RTP4);
            hospitalNumber += parseFloat(item.Hospital);
            totalGDP += parseFloat(item.GDP);
            totalCroplands += parseFloat(item.crop_sqm);
        });
     
        total_pop.innerHTML = totalPopulation > 0 ? totalPopulation : "---";
        total_female_pop.innerHTML = totalFemalePopulation > 0 ? totalFemalePopulation : "---";
        female_pop_f1.innerHTML = femalePopulationF1 > 0 ? femalePopulationF1 : "---";
        female_pop_f2.innerHTML = femalePopulationF2 > 0 ? femalePopulationF2 : "---";
        female_pop_f3.innerHTML = femalePopulationF3 > 0 ? femalePopulationF3 : "---";
        total_male_pop.innerHTML = totalMalePopulation > 0 ? totalMalePopulation : "---";
        male_pop_m1.innerHTML = malePopulationM1 > 0 ? malePopulationM1 : "---";
        male_pop_m2.innerHTML = malePopulationM2 > 0 ? malePopulationM2 : "---";
        male_pop_m3.innerHTML = malePopulationM3 > 0 ? malePopulationM3 : "---";
        highway_road.innerHTML = highwayRoad > 0 ? highwayRoad.toFixed(2) : "---";
        primary_road.innerHTML = primaryRoad > 0 ? primaryRoad.toFixed(2) : "---";
        secondary_road.innerHTML = secondaryRoad > 0 ? secondaryRoad.toFixed(2) : "---";
        tertiary_road.innerHTML = tertiaryRoad > 0 ? tertiaryRoad.toFixed(2) : "---";
        hospital.innerHTML = hospitalNumber > 0 ? hospitalNumber.toFixed(0) : "---";
        gdp.innerHTML = totalGDP > 0 ? totalGDP.toFixed(0) : "---";
        croplands.innerHTML = totalCroplands > 0 ? totalCroplands.toFixed(0) : "---";
    }

    document.getElementById("tab6hrs").addEventListener("click", async function() {
        let selected_date = paramCache.date;
        let selected_hrs = paramCache.hour;
        let selected_country = paramCache.country;
        // console.log(selected_country)
        const data = await getStatsBulletin('6hrs', selected_date, selected_hrs);
        const parsedData = JSON.parse(data);
        if (selected_country === "All") {
            updateTable(parsedData);
        } else {
            const filteredData = parsedData.filter(item => item.ISO === selected_country); 
            updateTable(filteredData);
        }
        // updateTable(data);
    });

    document.getElementById("tab12hrs").addEventListener("click", async function() {
        let selected_date = paramCache.date;
        let selected_hrs = paramCache.hour;
        let selected_country = paramCache.country;
        const data = await getStatsBulletin('12hrs', selected_date, selected_hrs);
        const parsedData = JSON.parse(data);
        if (selected_country === "All") {
            updateTable(parsedData);
        } else {
            const filteredData = parsedData.filter(item => item.ISO === selected_country); 
            updateTable(filteredData);
        }
        // updateTable(data);
    });

    document.getElementById("tab24hrs").addEventListener("click", async function() {
        let selected_date = paramCache.date;
        let selected_hrs = paramCache.hour;
        let selected_country = paramCache.country;
        const data = await getStatsBulletin('24hrs', selected_date, selected_hrs);
        const parsedData = JSON.parse(data);
        if (selected_country === "All") {
            updateTable(parsedData);
        } else {
            const filteredData = parsedData.filter(item => item.ISO === selected_country); 
            updateTable(filteredData);
        }
        // updateTable(data);
    });

    const MapOptions = {
        center: [15.9162, 102.9560],
        zoom: 5,
        zoomControl: false,
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

    async function getMRCBasin() {
        const basin_url = '/static/data/mekong_mrcffg_basins.geojson';
        return await fetchData(basin_url);
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

    const bulletin_map_data = {};
    const bulletin_map_data_url = '/get-mrcffg-bulletin-map-data/';

    async function getBulletinMapData(date, hrs) {
        try {
            const fullUrl = `${bulletin_map_data_url}?date=${date}&hrs=${hrs}`;
            if (bulletin_map_data[fullUrl]) {
                return bulletin_map_data[fullUrl];
            }
            const response = await fetch(fullUrl);
            if (!response.ok) {
                if (response.status === 404) {
                    showBootstrapAlert("Oops! No data found for the selected date and hours. Please select a different date and try again.");
                    throw new Error("Data not found for the selected date and hours");
                }
                throw new Error("Network response was not ok");
            } else {
                clearBootstrapAlert();
            }
            const data = await response.json();
            bulletin_map_data[fullUrl] = data;
            return data;
        } catch (error) {
            console.error('Error:', error);
        }
    }

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
        MAP24: [
            {min: 0, max: 10, color: colors.lightBlue},
            {min: 10, max: 50, color: colors.blue},
            {min: 50, max: 100, color: colors.deepSkyBlue},
            {min: 100, color: colors.lightGreen}
        ],
        FMAP06: [
            {min: 0, max: 7.5, color: colors.lightBlue},
            {min: 7.5, max: 35, color: colors.blue},
            {min: 35, max: 70, color: colors.deepSkyBlue},
            {min: 70, color: colors.lightGreen},
        ],
        FFG06: [
            {min: 0, max: 15, color: colors.violet},
            {min: 15, max: 30, color: colors.red},
            {min: 30, max: 60, color: colors.yellow},
            {min: 60, max: 100, color: colors.lightGreen},
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
        const defaultStyle = { color: colors.white, weight: 1, opacity: 1, fillOpacity: 0.8 };
        const paramStyles = styles[param];
        if (!paramStyles) return defaultStyle;
    
        for (let style of paramStyles) {
            if (ffgVal > style.min && ffgVal <= style.max) {
                return { ...defaultStyle, ...style };
            }
        }
        return defaultStyle;
    }

    // Define a function to create map instances
    function createMapInstance(id) {
        const map = L.map(id, MapOptions);
        L.tileLayer(basemapUrl, { tileSize: 256, attribution: attribution }).addTo(map);
        return map;
    }

    // Create map instances for different parameters
    const asm6hrMap = createMapInstance('asm6hr');
    const map24hrMap = createMapInstance('map24hr');
    const fmap6hrMap = createMapInstance('fmap6hr');
    const ffg6hrMap = createMapInstance('ffg6hr');
    const ffft6hrMap = createMapInstance('ffft6hr');
    const ffr12hrMap = createMapInstance('ffr12hr');
    const ffr24hrMap = createMapInstance('ffr24hr');

    // Define a mapping of parameters to map instances
    const mapInstances = {
        ASMT: asm6hrMap,
        MAP24: map24hrMap,
        FMAP06: fmap6hrMap,
        FFG06: ffg6hrMap,
        FFFT06: ffft6hrMap,
        FFR12: ffr12hrMap,
        FFR24: ffr24hrMap
    };

    // Define an object to store ffgsLayer variables for each parameter
    const ffgsLayers = {};

    // Initialize and add ffgsLayer variables for each parameter
    for (const param in mapInstances) {
        ffgsLayers[param] = L.geoJSON().addTo(mapInstances[param]);
    }

    async function createMap(param, selected_date, selected_hrs, selectedCountry) {
        const ffgData = await getBulletinMapData(selected_date, selected_hrs);
        let dataArray = JSON.parse(ffgData);
        let basinData = await getMRCBasin();

        // Get the corresponding ffgsLayer variable based on the parameter
        const ffgsLayer = ffgsLayers[param];

        if (selectedCountry === "All") {
            basinData = basinData; // This line is redundant, as basinData remains unchanged. You can remove it.
        } else if (["KHM", "VNM", "THA", "LAO"].includes(selectedCountry)) {
            basinData = {
                ...basinData,
                features: basinData.features.filter(feature => feature.properties.iso === selectedCountry)
            };
        }
        
        // Clear the layer before adding new data
        ffgsLayer.clearLayers();
        ffgsLayer.addData(basinData);
        ffgsLayer.setStyle(feature => getStyle(param, feature, dataArray)); 
        
        // Add the layer to the corresponding map instance
        mapInstances[param].addLayer(ffgsLayer);

        const bounds = ffgsLayer.getBounds();
        mapInstances[param].fitBounds(bounds);
        // Add legend dynamically
        const legendContent = createLegend(param);
        addLegendToMap(mapInstances[param], legendContent);
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
            const cellFemalePopulation = row.insertCell(3);
            const cellMalePopulation = row.insertCell(4);
            const cellRoad = row.insertCell(5);
            const cellHospital = row.insertCell(6);
            const cellGDP = row.insertCell(7);
            const cellCropLands = row.insertCell(8);

            cellProvinces.innerHTML = 'NO SUSPECT AREA';
            cellDistricts.innerHTML = '';
            cellLevel.innerHTML = '';
            cellFemalePopulation.innerHTML = '';
            cellMalePopulation.innerHTML = '';
            cellRoad.innerHTML = '';
            cellHospital.innerHTML = '';
            cellGDP.innerHTML = '';
            cellCropLands.innerHTML = '';
        } else {
            data.forEach(item => {
                const row = tbody.insertRow();
                const cellProvinces = row.insertCell(0);
                const cellDistricts = row.insertCell(1);
                const cellLevel = row.insertCell(2);
                const cellFemalePopulation = row.insertCell(3);
                const cellMalePopulation = row.insertCell(4);
                const cellRoad = row.insertCell(5);
                const cellHospital = row.insertCell(6);
                const cellGDP = row.insertCell(7);
                const cellCropLands = row.insertCell(8);

                cellProvinces.innerHTML = item.NAME_1 || '---';
                cellDistricts.innerHTML = item.NAME_2 || '---';
                cellLevel.innerHTML = interval === '6hrs' ? item.Alert_6Hrs : interval === '12hrs' ? item.Risk_12Hrs : item.Risk_24Hrs;
                cellFemalePopulation.innerHTML = parseFloat(item.F1) + parseFloat(item.F2) + parseFloat(item.F3) || '---';
                cellMalePopulation.innerHTML = parseFloat(item.M1) + parseFloat(item.M2) + parseFloat(item.M3) || '---';
                cellRoad.innerHTML = (parseFloat(item.RTP1) + parseFloat(item.RTP2) + parseFloat(item.RTP3) + parseFloat(item.RTP4)).toFixed(2) || '---';
                cellHospital.innerHTML = parseFloat(item.Hospital) || '---';
                cellGDP.innerHTML = parseFloat(item.GDP) || '---';
                cellCropLands.innerHTML = parseFloat(item.crop_sqm) || '---';

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

    // Define ISO codes for countries
    const countryISOs = ['KHM', 'LAO', 'THA', 'VNM'];

    const loader = document.getElementById('loader');

    updateBulletinBtn.addEventListener('click', async function () {
        try {
            loader.style.display = 'block';
            await new Promise(resolve => setTimeout(resolve, 0));
            var selected_date = dateInput.value; 
            const formattedDate = formatDate(selected_date);
            const selectedHrs = hourInput.value;
            displayDate.innerHTML = formattedDate;

            dateElements.forEach(function (element) {
                element.textContent = selected_date + " " + selectedHrs +":00 UTC";
            });

            const selectedCountry = countryInput.value;

            paramCache.date = selected_date;
            paramCache.hour = selectedHrs;
            paramCache.country = selectedCountry;

            const countryMapping = {
                "KHM": "Cambodia",
                "LAO": "Laos",
                "THA": "Thailand",
                "VNM": "Vietnam"
            };
            if (selectedCountry == "All"){
                generateGraph(selectedCountry);
            } else {
                const countryName = countryMapping[selectedCountry];
                generateGraph(countryName);
            }

            const insTab = document.getElementById('insTab'); // Critical infrastructure tab
            const activeButton = insTab.querySelector('.nav-link.active');

            // Get the 'id' attribute of the active button
            const activeButtonId = activeButton.getAttribute('id');
            const selectedTabParam = tabMapping[activeButtonId];

            const data = await getStatsBulletin(selectedTabParam, selected_date, selectedHrs);
            const parsedData = JSON.parse(data);

            const tableContainers = {
                "KHM": document.getElementById("KHMTableContainer"),
                "LAO": document.getElementById("LAOTableContainer"),
                "THA": document.getElementById("THATableContainer"),
                "VNM": document.getElementById("VNMTableContainer")
            };
            
            function hideAllExcept(exceptISO) {
                for (let countryISO of countryISOs) {
                    if (tableContainers[countryISO]) { 
                        if (countryISO === exceptISO) {
                            tableContainers[countryISO].style.display = "block";
                        } else {
                            tableContainers[countryISO].style.display = "none";
                        }
                    } else {
                        console.error(`Container for ${countryISO} is not defined in tableContainers.`);
                    }
                }
            }
            
            if (selectedCountry === "All") {
                for (let countryISO in tableContainers) {
                    tableContainers[countryISO].style.display = "block";
                }
                updateTable(parsedData);
            } else {
                hideAllExcept(selectedCountry); 
                const filteredData = parsedData.filter(item => item.ISO === selectedCountry); 
                updateTable(filteredData);
            }

            // Clear all ffgsLayer layers for all parameters
            for (const param in mapInstances) {
                const ffgsLayer = ffgsLayers[param];
                ffgsLayer.clearLayers();
            }
            for (const param in mapInstances) {
                await createMap(param, selected_date, selectedHrs, selectedCountry);
            } 

            let countriesToProcess = [];

            if (selectedCountry === "All") {
                countriesToProcess = countryISOs;
            } else if (countryISOs.includes(selectedCountry)) {
                countriesToProcess = [selectedCountry];
            } else {
                console.error(`Invalid selectedCountry value: ${selectedCountry}`);
                return; // Exit the function or handle this case differently
            }

            // Loop through countries and intervals
            for (const iso of countriesToProcess) {
                for (const interval of ['6hrs', '12hrs', '24hrs']) {
                    const tableElement = document.getElementById(`${iso}Table${interval}`);
                    await populateTableForInterval(tableElement, iso, interval, selected_date, selectedHrs);
                }
            }

            // // Loop through countries and intervals
            // for (const iso of countryISOs) {
            //     for (const interval of ['6hrs', '12hrs', '24hrs']) {
            //         const tableElement = document.getElementById(`${iso}Table${interval}`);
            //         await populateTableForInterval(tableElement, iso, interval, selected_date);
            //     }
            // }
            loader.style.display = 'none';
        } catch (error) {
            console.error("Failed to update data:", error);
        } finally {
            loader.style.display = 'none';
        }
    });

    async function populateTableForInterval(tableElement, iso, interval, selected_date, selected_hrs) {
        const data = await getStatsBulletin(interval, selected_date, selected_hrs);
        const parsedData = JSON.parse(data);
        const filteredData = parsedData.filter(item => item.ISO === iso);
        populateTable(tableElement, filteredData, interval);
    }

    // ============== Date Panel ==================>

    const dateCard = document.querySelector(".dateCard");

    // Initially hide the calendar
    dateCard.style.display = 'none';

    dateInput.addEventListener("click", function() {
        if (dateCard.style.display === 'none' || dateCard.style.display === '') {
            dateCard.style.display = 'block';  // Show calendar
        } else {
            dateCard.style.display = 'none';   // Hide calendar
        }
    });

    // Add a click event listener to the year selector dropdown
    document.getElementById("monthSelector").addEventListener("click", function (event) {
        // Prevent event propagation to the body
        event.stopPropagation();
    });

    // Add a click event listener to the year selector dropdown
    document.getElementById("yearSelector").addEventListener("click", function (event) {
        // Prevent event propagation to the body
        event.stopPropagation();
    });

    // Add a click event listener to the document body
    document.body.addEventListener('click', (event) => {
        // Check if the click target is not the input field or the date panel
        if (event.target !== dateInput && event.target !== dateCard) {
        // Close the date panel (hide it)
            dateCard.style.display = 'none';
        }
    });
  
    function handleDateItemClick(dateItem, currentDate) {
        dateItem.addEventListener('click', function() {
            const prevActive = document.querySelector('.date-item.active');
            if (prevActive) {
                prevActive.classList.remove('active');
            }
    
            // Set the current date as active and update the input
            this.classList.add('active');
            dateInput.value = currentDate;
            dateCard.style.display = 'none';
        });
    }

    function createCustomCalender(clickableDates){
        //let clickableDates = ["2023-01-01", "2023-01-20", "2023-09-10", "2023-09-11"];
        const yearSelector = document.getElementById("yearSelector");
        const monthSelector = document.getElementById("monthSelector");
        const calendar = document.getElementById("calendar");

        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;  // JavaScript months are 0-indexed

        function isDateClickable(date) {
            return clickableDates.includes(date);
        }

        function daysInMonth(month, year) {
            return new Date(year, month, 0).getDate();
        }

        function getLatestClickableDate() {
            if (!clickableDates.length) return null;  // Check if the array is empty
            return clickableDates.sort((a, b) => new Date(b) - new Date(a))[0];
        }

        const latestEventDate = getLatestClickableDate();
        dateInput.value = latestEventDate;

        function generateCalendar(month, year) {
            calendar.innerHTML = ''; // Clear previous dates

            let activeDate = dateInput.value || getLatestClickableDate(); // Use the value in the input or get the latest clickable date

            for (let day = 1; day <= daysInMonth(month, year); day++) {
                const dateItem = document.createElement('div');
                dateItem.classList.add('date-item');
                dateItem.textContent = day;

                const currentDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

                if (isDateClickable(currentDate)) {
                    dateItem.classList.add('clickable');
                    if (currentDate === activeDate) {
                        dateItem.classList.add('active');
                    }
                    handleDateItemClick(dateItem, currentDate); // use the separate function here
                }
                calendar.appendChild(dateItem);
            }
        }

        // Populate the year selector
        for (let i = currentYear - 3; i <= currentYear + 3; i++) {
            let option = new Option(i, i);
            yearSelector.appendChild(option);
        }

        // Set the default value of year selector to current year
        yearSelector.value = currentYear;

        // Populate the month selector
        for (let i = 1; i <= 12; i++) {
            let monthName = new Date(currentYear, i - 1, 1).toLocaleString('default', { month: 'long' });
            let option = new Option(monthName, i);
            monthSelector.appendChild(option);
        }

        // Set the default value of month selector to current month
        monthSelector.value = currentMonth;

        yearSelector.addEventListener("change", () => {
            generateCalendar(Number(monthSelector.value), Number(yearSelector.value));
        });

        monthSelector.addEventListener("change", () => {
            generateCalendar(Number(monthSelector.value), Number(yearSelector.value));
        });

        // Initial load with the current year and month
        generateCalendar(currentMonth, currentYear);
    }
    // ============== End Date Panel ==================!

    async function init() {
        try {
            loader.style.display = 'block';
            let dateList = await getDate();
            dateList = JSON.parse(dateList);
            clickableDates = dateList.map(innerArray => innerArray[0]);
            createCustomCalender(clickableDates);

            var selected_date = dateInput.value; 
            var selected_hrs = hourInput.value;
            var selected_country = countryInput.value;

            paramCache.date = selected_date;
            paramCache.hour = selected_hrs;
            paramCache.country = selected_country;

            // console.log(paramCache)

            generateGraph("All");

            const data_6hrs = await getStatsBulletin('6hrs', selected_date, selected_hrs);
            const parsed_data = JSON.parse(data_6hrs);
            updateTable(parsed_data);

            const formattedDisplayDate = formatDate(selected_date);
            displayDate.innerHTML = formattedDisplayDate;

            // 2023-07-01 06:00 UTC
            dateElements.forEach(function (element) {
                element.textContent = selected_date + " " + selected_hrs + ":00 UTC";
            });

            // Call createMap sequentially for each parameter
            for (const param in mapInstances) {
                await createMap(param, selected_date, selected_hrs, selected_country);
            }

            // Loop through countries and intervals
            for (const iso of countryISOs) {
                for (const interval of ['6hrs', '12hrs', '24hrs']) {
                    const tableElement = document.getElementById(`${iso}Table${interval}`);
                    await populateTableForInterval(tableElement, iso, interval, selected_date, selected_hrs);
                }
            }
            loader.style.display = 'none';
        } catch (error) {
            console.error('Error in init:', error);
            loader.style.display = 'none';
        }
    }

    // Call the init function with await
    init();

    // Reference to the loader and finished content elements
    var loadingContent = document.getElementById('loadingContent');
    var finishedContent = document.getElementById('finishedContent');

    // Reference to the export button
    const exportBtn = document.querySelector("#exportPdf");

    // Function to create a new Bootstrap modal instance
    function createNewModal() {
        return new bootstrap.Modal(document.getElementById('pdfModal'), {
            backdrop: 'static', // Prevent closing by clicking outside
            keyboard: false // Prevent closing by pressing ESC key
        });
    }

    exportBtn.addEventListener('click', async function() {
        // Create a new modal instance
        var pdfModal = createNewModal();

        // Function to reset the modal content and loading icon
        function resetModal() {
            loadingContent.classList.remove('d-none');
            finishedContent.classList.add('d-none');
        }

        // Reset the modal content when it is hidden
        pdfModal._element.addEventListener('hidden.bs.modal', resetModal, { once: true });

        // Show the modal with the loading content
        pdfModal.show();

        try {
            const selected_date = dateInput.value;
            const selected_hour = hourInput.value;
            const selected_country = countryInput.value;

            const response = await fetch(`http://203.146.112.243/generate-pdf/?selectedDate=${selected_date}&selectedHr=${selected_hour}&selectedCountry=${selected_country}`);

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();
            const pdfPath = data.pdfURL;
            const dwnldPath = data.pdfDwnld;

            // Hide loading content and show finished content
            loadingContent.classList.add('d-none');
            finishedContent.classList.remove('d-none');

            // Open PDF in a new tab when "View PDF" button is clicked
            finishedContent.querySelector('.btn-primary').addEventListener('click', function() {
                window.open(pdfPath, '_blank');
            });

            // Set the download link for "Download PDF" button
            var downloadButton = finishedContent.querySelector('.btn-success');
            downloadButton.href = dwnldPath;

        } catch (error) {
            console.error('There was a problem with the fetch operation:', error);
        }
    });
});