document.addEventListener("DOMContentLoaded", function() {
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

        var textElement = chart.renderer.text('' + totalEvents, chart.chartWidth / 2, chart.chartHeight / 2)
            .attr({
                zIndex: 999
            })
            .css({
                color: '#000',
                fontSize: '15px',
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

    async function updateTable(dataToProcess, timeInterval) {
        
        const tablePrefix = `_${timeInterval}`; // Create a prefix based on the time interval

        const total_pop = document.querySelector(`#total_pop${tablePrefix}`);
        const total_female_pop = document.querySelector(`#total_female_pop${tablePrefix}`);
        const female_pop_f1 = document.querySelector(`#female_pop_f1${tablePrefix}`);
        const female_pop_f2 = document.querySelector(`#female_pop_f2${tablePrefix}`);
        const female_pop_f3 = document.querySelector(`#female_pop_f3${tablePrefix}`);
        const total_male_pop = document.querySelector(`#total_male_pop${tablePrefix}`);
        const male_pop_m1 = document.querySelector(`#male_pop_m1${tablePrefix}`);
        const male_pop_m2 = document.querySelector(`#male_pop_m2${tablePrefix}`);
        const male_pop_m3 = document.querySelector(`#male_pop_m3${tablePrefix}`);

        const highway_road = document.querySelector(`#highwayRoad${tablePrefix}`);
        const primary_road = document.querySelector(`#primaryRoad${tablePrefix}`);
        const secondary_road = document.querySelector(`#secondaryRoad${tablePrefix}`);
        const tertiary_road = document.querySelector(`#tertiaryRoad${tablePrefix}`);
        const hospital = document.querySelector(`#hospital${tablePrefix}`);
        const gdp = document.querySelector(`#gdp${tablePrefix}`);
        const croplands = document.querySelector(`#cropLands${tablePrefix}`);

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

    const MapOptions = {
        center: [15.9162, 102.9560],
        zoom: 6,
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

    const bulletin_map_data = {};
    const bulletin_map_data_url = '/get-mrcffg-bulletin-map-data/';

    async function getBulletinMapData(date, hrs) {
        try {
            const fullUrl = `${bulletin_map_data_url}?date=${date}&hrs=${hrs}`;
            if (bulletin_map_data[fullUrl]) {
                return bulletin_map_data[fullUrl];
            }
            const response = await fetch(fullUrl);
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
            const row = tbody.insertRow();
            for (let i = 0; i < 9; i++) {
                const cell = row.insertCell(i);
                cell.innerHTML = '---';
            }
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

    async function populateTableForInterval(tableElement, iso, interval, selected_date, selected_hrs) {
        const data = await getStatsBulletin(interval, selected_date, selected_hrs);
        const parsedData = JSON.parse(data);
        const filteredData = parsedData.filter(item => item.ISO === iso);
        populateTable(tableElement, filteredData, interval);
    }

    async function init() {
        try {
            const data_6hrs = await getStatsBulletin('6hrs', selectedDate, selectedHour);
            const parsed_data_6hrs = JSON.parse(data_6hrs);
            
            if (selectedCountry == "All"){
                updateTable(parsed_data_6hrs, '06hrs');
            } else {
                const filteredData6Hrs = parsed_data_6hrs.filter(item => item.ISO === selectedCountry); 
                updateTable(filteredData6Hrs, '06hrs');
            }
            
            const data_12hrs = await getStatsBulletin('12hrs', selectedDate, selectedHour);
            const parsed_data_12hrs = JSON.parse(data_12hrs);
            
            if (selectedCountry == "All"){
                updateTable(parsed_data_12hrs, '12hrs');
            } else {
                const filteredData12Hrs = parsed_data_12hrs.filter(item => item.ISO === selectedCountry); 
                updateTable(filteredData12Hrs, '12hrs');
            }

            const data_24hrs = await getStatsBulletin('24hrs', selectedDate, selectedHour);
            const parsed_data_24hrs = JSON.parse(data_24hrs);

            if (selectedCountry == "All"){
                updateTable(parsed_data_24hrs, '24hrs');
            } else {
                const filteredData24Hrs = parsed_data_24hrs.filter(item => item.ISO === selectedCountry); 
                updateTable(filteredData24Hrs, '24hrs');
            }

            const formattedDisplayDate = formatDate(selectedDate);
            displayDate.innerHTML = formattedDisplayDate;

            // 2023-07-01 06:00 UTC
            dateElements.forEach(function (element) {
                element.textContent = selectedDate + " " + selectedHour + ":00 UTC";
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

            // Call createMap sequentially for each parameter
            for (const param in mapInstances) {
                await createMap(param, selectedDate, selectedHour, selectedCountry);
            }

            const tableContainers = {
                "KHM": document.getElementById("KHMTableSection"),
                "LAO": document.getElementById("LAOTableSection"),
                "THA": document.getElementById("THATableSection"),
                "VNM": document.getElementById("VNMTableSection")
            };
            
            let removedElements = [];
            
            function hideAllExcept(exceptISO) {
                for (let countryISO in tableContainers) {
                    const container = tableContainers[countryISO];
                    if (container) {
                        if (countryISO === exceptISO) {
                            // If the container was previously removed, re-insert it back
                            if (removedElements[countryISO]) {
                                document.body.appendChild(removedElements[countryISO]);
                                delete removedElements[countryISO];
                            }
                            container.style.display = "block";
                        } else {
                            if (container.parentNode) {
                                container.parentNode.removeChild(container);
                                removedElements[countryISO] = container;
                            }
                        }
                    } else {
                        console.error(`Container for ${countryISO} is not defined in tableContainers.`);
                    }
                }
            }
            
            function restoreAllContainers() {
                for (let countryISO in removedElements) {
                    if (removedElements[countryISO]) {
                        document.body.appendChild(removedElements[countryISO]);
                    }
                }
                removedElements = [];
            }
            
            if (selectedCountry === "All") {
                for (let countryISO in tableContainers) {
                    tableContainers[countryISO].style.display = "block";
                }
                restoreAllContainers();
            } else {
                hideAllExcept(selectedCountry);
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
                    await populateTableForInterval(tableElement, iso, interval, selectedDate, selectedHour);
                }
            }   
        } catch (error) {
            console.error('Error in init:', error);
        }
    }

    // Call the init function with await
    init();

        // http://localhost:8000/pdf-template/?selectedDate=2023-09-01&selectedHr=06&selectedCountry=All
});