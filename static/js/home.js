document.addEventListener("DOMContentLoaded", function() {
    // const dateInput = document.getElementById("dateInput");
    // const hourInput = document.getElementById("hrSelection");
    
    // let paramCache = {
    //     date: null,
    //     hour: null,
    // };

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

    // Fetch URLs
    const urls = {
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
        FFR24: [
            {min: 0.01, max: 0.2, color: colors.red},
            {min: 0.2, max: 0.4, color: colors.orange},
            {min: 0.4, max: 1, color: colors.yellow},
        ]
    }

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
    const ffr24hrMap = createMapInstance('homemap');

    // Define a mapping of parameters to map instances
    const mapInstances = {
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

    function formatDate(inputDate) {
        const options = { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' };
        const date = new Date(inputDate);
        return date.toLocaleDateString('en-US', options);
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
            // Call createMap sequentially for each parameter
            for (const param in mapInstances) {
                await createMap(param, selected_date, selected_hrs, selected_country);
            }

            generateGraph("All");
            
            // const data_6hrs = await getStatsBulletin('6hrs', selected_date, selected_hrs);
            // const parsed_data = JSON.parse(data_6hrs);
            // updateTable(parsed_data);

            // const formattedDisplayDate = formatDate(selected_date);
            // displayDate.innerHTML = formattedDisplayDate;

            // // 2023-07-01 06:00 UTC
            // dateElements.forEach(function (element) {
            //     element.textContent = selected_date + " " + selected_hrs + ":00 UTC";
            // });

            // // Call createMap sequentially for each parameter
            // for (const param in mapInstances) {
            //     await createMap(param, selected_date, selected_hrs, selected_country);
            // }

            // // Loop through countries and intervals
            // for (const iso of countryISOs) {
            //     for (const interval of ['6hrs', '12hrs', '24hrs']) {
            //         const tableElement = document.getElementById(`${iso}Table${interval}`);
            //         await populateTableForInterval(tableElement, iso, interval, selected_date, selected_hrs);
            //     }
            // }
            // loader.style.display = 'none';
        } catch (error) {
            console.error('Error in init:', error);
            // loader.style.display = 'none';
        }
    }

    // Call the init function with await
    init();
});