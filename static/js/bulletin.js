
document.addEventListener("DOMContentLoaded", function () {


    // GeoServer URL
    // http://203.146.112.243:8080/geoserver/
    const geoserver_endpoint = 'http://119.15.81.22:8081'

    const dateInput = document.getElementById("dateInput");
    let hourInput = document.getElementById("hrSelection");
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
                text: null,
                // width: '400px'
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

        // var titleText = '<h6 class="h6 fw-bold text-start">TOTAL STORM EVENTS</h6>';
        // var totalEventsText = '<tspan x="5.7em" dy="1.2em">' + totalEvents + '</tspan>';

        // var chartCenterX = chart.plotWidth / 2;
        // var chartCenterY = chart.plotHeight / 2;

        // var textElement = chart.renderer.text(titleText + totalEventsText, chartCenterX, chartCenterY)
        //     .attr({
        //         zIndex: 999
        //     })
        //     .css({
        //         color: '#000',
        //         fontSize: '50px',
        //         fontWeight: 'bold',
        //         textAlign: 'center'
        //     })
        //     .add();

        // // Now, reposition the text based on its bounding box
        // var textBBox = textElement.getBBox();
        // textElement.attr({
        //     x: chartCenterX - textBBox.width / 2,
        //     y: chartCenterY - textBBox.height / 2
        // });
        
        // Calculate the center of the chart dynamically
        var chartCenterX = chart.plotWidth / 2;
        var chartCenterY = chart.plotHeight / 2;

        // Define the title and total events text
        var titleText = '<h6 class="h6 fw-bold text-start">TOTAL STORM EVENTS</h6>';
        var totalEventsText = '<tspan x="50%" dy="1.2em">' + totalEvents + '</tspan>'; // Use x="50%" to center text

        // Create the text element for the title
        var titleElement = chart.renderer.text(titleText, 0, 0)
            .attr({
                zIndex: 999
            })
            .css({
                color: '#000',
                fontSize: '20px',
                fontWeight: 'bold',
                textAlign: 'center'
            })
            .add();

        // Create the text element for the total events
        var totalEventsElement = chart.renderer.text(totalEventsText, 0, 0)
            .attr({
                zIndex: 999
            })
            .css({
                color: '#000',
                fontSize: '20px',
                fontWeight: 'bold',
                textAlign: 'center'
            })
            .add();

        // Get the bounding boxes of the title and total events text
        var titleBBox = titleElement.getBBox();
        var totalEventsBBox = totalEventsElement.getBBox();

        // Calculate the position to center the title text
        var titleX = chartCenterX - titleBBox.width / 2;
        var titleY = chartCenterY - (titleBBox.height + totalEventsBBox.height) / 2;

        // Calculate the position to center the total events text
        var totalEventsX = chartCenterX - totalEventsBBox.width / 2;
        var totalEventsY = titleY + titleBBox.height;

        // Update the positions of the title and total events text elements
        titleElement.attr({
            x: titleX,
            y: titleY
        });

        totalEventsElement.attr({
            x: totalEventsX,
            y: totalEventsY
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
        // const total_pop = document.querySelector("#total_pop");
        // const total_female_pop = document.querySelector("#total_female_pop");
        // const female_pop_f1 = document.querySelector("#female_pop_f1");
        // const female_pop_f2 = document.querySelector("#female_pop_f2");
        // const female_pop_f3 = document.querySelector("#female_pop_f3");
        // const total_male_pop = document.querySelector("#total_male_pop");
        // const male_pop_m1 = document.querySelector("#male_pop_m1");
        // const male_pop_m2 = document.querySelector("#male_pop_m2");
        // const male_pop_m3 = document.querySelector("#male_pop_m3");
        
        // const highway_road =  document.querySelector("#highwayRoad");
        // const primary_road =  document.querySelector("#primaryRoad");
        // const secondary_road =  document.querySelector("#secondaryRoad");
        // const tertiary_road =  document.querySelector("#tertiaryRoad");
        // const hospital =  document.querySelector("#hospital");
        // const gdp =  document.querySelector("#gdp");
        // const croplands =  document.querySelector("#cropLands");
        
        // // Initialize all elements to '---' as default
        // [total_pop, total_female_pop, female_pop_f1, female_pop_f2, female_pop_f3, 
        // total_male_pop, male_pop_m1, male_pop_m2, male_pop_m3, highway_road, primary_road,
        // secondary_road, tertiary_road, hospital, gdp, croplands].forEach(el => el.innerHTML = '---');
    
        // if (!dataToProcess || Object.keys(dataToProcess).length === 0) {
        //     return;
        // }
    
        // let parsed_data = dataToProcess; //JSON.parse(dataToProcess);
    
        // // Population calculations
        // let totalPopulation = 0;
        // let totalFemalePopulation = 0;
        // let femalePopulationF1 = 0;
        // let femalePopulationF2 = 0;
        // let femalePopulationF3 = 0;
        // let totalMalePopulation = 0;
        // let malePopulationM1 = 0;
        // let malePopulationM2 = 0;
        // let malePopulationM3 = 0;
    
        // // Road Infrastructures
        // let highwayRoad = 0;
        // let primaryRoad = 0;
        // let secondaryRoad = 0;
        // let tertiaryRoad = 0;

        // // Hospital
        // let hospitalNumber = 0;

        // // Economic vulnerability
        // let totalGDP = 0;
        // let totalCroplands = 0;
    
        // parsed_data.forEach(item => {
        //     // console.log(item)
        //     totalPopulation += parseFloat(item.M1) + parseFloat(item.M2) + parseFloat(item.M3) + parseFloat(item.F1) + parseFloat(item.F2) + parseFloat(item.F3);
        //     totalFemalePopulation += parseFloat(item.F1) + parseFloat(item.F2) + parseFloat(item.F3);
        //     femalePopulationF1 += parseFloat(item.F1);
        //     femalePopulationF2 += parseFloat(item.F2);
        //     femalePopulationF3 += parseFloat(item.F3);
        //     totalMalePopulation += parseFloat(item.M1) + parseFloat(item.M2) + parseFloat(item.M3);
        //     malePopulationM1 += parseFloat(item.M1);
        //     malePopulationM2 += parseFloat(item.M2);
        //     malePopulationM3 += parseFloat(item.M3);
            
        //     highwayRoad += parseFloat(item.RTP1);
        //     primaryRoad += parseFloat(item.RTP2);
        //     secondaryRoad += parseFloat(item.RTP3);
        //     tertiaryRoad += parseFloat(item.RTP4);
        //     hospitalNumber += parseFloat(item.Hospital);
        //     totalGDP += parseFloat(item.GDP);
        //     totalCroplands += parseFloat(item.crop_sqm);
        // });
     
        // total_pop.innerHTML = totalPopulation > 0 ? totalPopulation.toLocaleString() : "---";
        // total_female_pop.innerHTML = totalFemalePopulation > 0 ? totalFemalePopulation.toLocaleString() : "---";
        // female_pop_f1.innerHTML = femalePopulationF1 > 0 ? femalePopulationF1.toLocaleString() : "---";
        // female_pop_f2.innerHTML = femalePopulationF2 > 0 ? femalePopulationF2.toLocaleString() : "---";
        // female_pop_f3.innerHTML = femalePopulationF3 > 0 ? femalePopulationF3.toLocaleString() : "---";
        // total_male_pop.innerHTML = totalMalePopulation > 0 ? totalMalePopulation.toLocaleString() : "---";
        // male_pop_m1.innerHTML = malePopulationM1 > 0 ? malePopulationM1.toLocaleString() : "---";
        // male_pop_m2.innerHTML = malePopulationM2 > 0 ? malePopulationM2.toLocaleString() : "---";
        // male_pop_m3.innerHTML = malePopulationM3 > 0 ? malePopulationM3.toLocaleString() : "---";
        // highway_road.innerHTML = highwayRoad > 0 ? Math.floor(highwayRoad).toLocaleString() : "---";
        // primary_road.innerHTML = primaryRoad > 0 ? Math.floor(primaryRoad).toLocaleString() : "---";
        // secondary_road.innerHTML = secondaryRoad > 0 ? Math.floor(secondaryRoad).toLocaleString() : "---";
        // tertiary_road.innerHTML = tertiaryRoad > 0 ? Math.floor(tertiaryRoad).toLocaleString() : "---";
        // hospital.innerHTML = hospitalNumber > 0 ? Math.floor(hospitalNumber).toLocaleString() : "---";
        // gdp.innerHTML = totalGDP > 0 ? Math.floor(totalGDP).toLocaleString() : "---";
        // croplands.innerHTML = totalCroplands > 0 ? Math.floor(totalCroplands).toLocaleString() : "---";
    }

    // document.getElementById("tab6hrs").addEventListener("click", async function() {
    //     let selected_date = paramCache.date;
    //     let selected_hrs = paramCache.hour;
    //     let selected_country = paramCache.country;
    //     // console.log(selected_country)
    //     const data = await getStatsBulletin('6hrs', selected_date, selected_hrs);
    //     const parsedData = JSON.parse(data);
    //     if (selected_country === "All") {
    //         updateTable(parsedData);
    //     } else {
    //         const filteredData = parsedData.filter(item => item.ISO === selected_country);
    //         updateTable(filteredData);
    //     }
    //     // updateTable(data);
    // });

    // document.getElementById("tab12hrs").addEventListener("click", async function() {
    //     let selected_date = paramCache.date;
    //     let selected_hrs = paramCache.hour;
    //     let selected_country = paramCache.country;
    //     const data = await getStatsBulletin('12hrs', selected_date, selected_hrs);
    //     const parsedData = JSON.parse(data);
    //     if (selected_country === "All") {
    //         updateTable(parsedData);
    //     } else {
    //         const filteredData = parsedData.filter(item => item.ISO === selected_country);
    //         updateTable(filteredData);
    //     }
    //     // updateTable(data);
    // });

    // document.getElementById("tab24hrs").addEventListener("click", async function() {
    //     let selected_date = paramCache.date;
    //     let selected_hrs = paramCache.hour;
    //     let selected_country = paramCache.country;
    //     const data = await getStatsBulletin('24hrs', selected_date, selected_hrs);
    //     const parsedData = JSON.parse(data);
    //     if (selected_country === "All") {
    //         updateTable(parsedData);
    //     } else {
    //         const filteredData = parsedData.filter(item => item.ISO === selected_country);
    //         updateTable(filteredData);
    //     }
    //     // updateTable(data);
    // });
    
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
    rfmap.getPane('basinLayer').style.zIndex = 21;


    var tdWmsRainLayer = L.tileLayer.wms(geoserver_endpoint+ '/geoserver/ffgs/wms?', {
        layers: 'ffgs:rainacc_gsmap_now',
        format: 'image/png',
        transparent: true,
        styles: 'rainacc',
        pane: 'droughtLayer'
    });
    tdWmsRainLayer.setOpacity(1);

    const MapOptions = {
        // center: [15.9162, 102.9560],
        defaultCenter: [15.9162, 102.9560],
        khmCenter: [12.56, 104.2],
        defaultZoom: 5,
        khmZoom: 6,
        zoomControl: false,
        scrollWheelZoom: false,
        minZoom: 5,
    }

    const basemapUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}';
    const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">Esri | OpenStreetMap</a> contributors';
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
            // add marker on rfMap
            // Add circle markers to the map
            data.forEach(item => {
                L.circle([item.center_lat, item.center_lng], {
                    color: 'white',
                    fillColor: 'red',
                    fillOpacity: 0.6,
                    radius: 20000, // Adjust the radius as needed
                    weight: 1 // Stroke line weight
                }).addTo(rfmap)
                    .bindPopup(`<b>ID:</b> ${item.id}<br><b>Date:</b> ${item.date}<br><b>Speed:</b> ${item.speed}`);
                
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

    let adm0Layer;
    let adm2Layer
    let mainlakesLayer;
    let riverLayer;
    let mekong_basinLayer;
    let mekong_basinLayerRf;
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

    async function loadLayersRf() {
        try {
            // Load mekong basin data
            const mekongBasinData = await fetchData('/static/data/mekong_basin_area.geojson');
            mekong_basinLayerRf = L.geoJSON(mekongBasinData, {
                style: {
                    fillColor: '#2E86C1',
                    weight: 3,
                    opacity: 0.5,
                    color: '#fefefe',
                    fillOpacity: 0.0,
                },
            });
        } catch (error) {
            console.error('Layer loading error:', error);
        }
    }
    
    
    async function loadLayers() {
        try {
            // Load adm0 data
            const adm0Data = await fetchData('/static/data/adm0.geojson');
            adm0Layer = L.geoJSON(adm0Data, {
                style: {
                    fillColor: '#9999ff',
                    weight: 0,
                    opacity: 0.5,
                    color: 'gray',
                    fillOpacity: 0.0,
                },
                pane: 'droughtLayer',
            });
        
            const adm2Data = await fetchData('/static/data/adm2.geojson');
            adm2Layer = L.geoJSON(adm2Data, {
                style: {
                    fillColor: '#eee',
                    weight: 0.3,
                    opacity: 0.5,
                    color: '#1e3a8a',
                    fillOpacity: 0.0,
                },
                onEachFeature: function onEachFeature(feature, layer) {
                    if (feature.properties) {
                        layer.bindPopup(feature.properties.iso);
                    }
                }
        ,
                
            });
    
            // Load main lakes data
            const mainLakesData = await fetchData('/static/data/mainlakes_FFGS.geojson');
            mainlakesLayer = L.geoJSON(mainLakesData, {
                style: {
                    fillColor: 'darkgray',
                    weight: 0,
                    opacity: 0.1,
                    color: 'white',
                    dashArray: '3',
                    fillOpacity: 1,
                },
            });
    
            // Load river data
            const riverData = await fetchData('/static/data/riverMK_FFGS.geojson');
            riverLayer = L.geoJSON(riverData, {
                style: {
                    fillColor: '#9999ff',
                    weight: 2,
                    opacity: 1,
                    color: 'blue',
                    fillOpacity: 0.8,
                },
            });
    
            // Load mekong basin data
            const mekongBasinData = await fetchData('/static/data/mekong_basin_area.geojson');
            mekong_basinLayer = L.geoJSON(mekongBasinData, {
                style: {
                    fillColor: '#2E86C1',
                    weight: 3,
                    opacity: 0.5,
                    color: '#000',
                    fillOpacity: 0.0,
                },
            });
        } catch (error) {
            console.error('Layer loading error:', error);
        }
    }

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

    // async function getMRCBasin() {
    //     const basin_url = '/static/data/mrc_basin_simplified2.geojson';
    //     return await fetchData(basin_url);
    // }

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
    const bulletin_map_data_url = '/get-seaffgs-bulletin-map-data/';

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
            {min: 100, max: 200, color: colors.lightGreen}
        ],
        FMAP01: [
            {min: 0, max: 2.5, color: colors.lightBlue},
            {min: 2.5, max: 15, color: colors.blue},
            {min: 15, max: 30, color: colors.deepSkyBlue},
            {min: 30, max: 100, color: colors.lightGreen},
        ],   
        FMAP03: [
            {min: 0, max: 5, color: colors.lightBlue},
            {min: 5, max: 25, color: colors.blue},
            {min: 25, max: 50, color: colors.deepSkyBlue},
            {min: 50, max: 200, color: colors.lightGreen},
        ],
        FMAP06: [
            {min: 0, max: 7.5, color: colors.lightBlue},
            {min: 7.5, max: 35, color: colors.blue},
            {min: 35, max: 70, color: colors.deepSkyBlue},
            {min: 70, max: 200, color: colors.lightGreen},
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
            {min: 0.01, max: 0.3, color: colors.yellow},
            {min: 0.3, max: 0.6, color: colors.orange},
            {min: 0.6, max: 1, color: colors.red},
        ],
        FFR24: [
            {min: 0.01, max: 0.3, color: colors.yellow},
            {min: 0.3, max: 0.6, color: colors.orange},
            {min: 0.6, max: 1, color: colors.red},
        ],
    };

    function getStyle(param, feature, data) {
        const ffgVal = data.find(x => x && x.BASIN === feature.properties.value)?.[param];
        const defaultStyle = { color: colors.white, weight: 0, opacity: 0, fillOpacity: 0 };
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
        // basemap
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
            pane: 'basinLayer',
            CQL_FILTER: cqlFilter
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

    // // Define an object to store ffgsLayer variables for each parameter
    // const ffgsLayers = {};

    // // Initialize and add ffgsLayer variables for each parameter
    // for (const param in mapInstances) {
    //     ffgsLayers[param] = L.geoJSON().addTo(mapInstances[param]);
    // }

    // async function createMap(param, selected_date, selected_hrs, selectedCountry) {
    //     const ffgData = await getBulletinMapData(selected_date, selected_hrs);
    //     let dataArray = JSON.parse(ffgData);
    //     let basinData = await getMRCBasin();

    //     // Get the corresponding ffgsLayer variable based on the parameter
    //     const ffgsLayer = ffgsLayers[param];

    //     if (selectedCountry === "All") {
    //         basinData = basinData; // This line is redundant, as basinData remains unchanged. You can remove it.
    //     } else if (["KHM", "VNM", "THA", "LAO"].includes(selectedCountry)) {
    //         basinData = {
    //             ...basinData,
    //             features: basinData.features.filter(feature => feature.properties.iso === selectedCountry)
    //         };
    //     }
        
    //     // Clear the layer before adding new data
    //     ffgsLayer.clearLayers();
    //     ffgsLayer.addData(basinData);
    //     ffgsLayer.setStyle(feature => getStyle(param, feature, dataArray));
        
    //     // Add the layer to the corresponding map instance
    //     mapInstances[param].addLayer(ffgsLayer);

    //     const bounds = ffgsLayer.getBounds();
    //     mapInstances[param].fitBounds(bounds);
    //     // Add legend dynamically
    //     const legendContent = createLegend(param);
    //     addLegendToMap(mapInstances[param], legendContent);
    // }
    const geoserver_url = geoserver_endpoint+ '/geoserver/ffgs/';

    // Create a function to generate WMS URL
    function generateWMSUrl(param, selectedDate, selectedHr) {
        return `${geoserver_url}wms?`;
    }

    // var wmsLayer = L.tileLayer.wms('', {
    //     format: 'image/png',
    //     version: '1.1.0',
    //     transparent: true
    // });

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

    // Basin boundary layer
    var wmsBasinUrl = `${geoserver_endpoint}/geoserver/adm/wms?`;
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
        // console.log(`ffgs:${param}_${selectedDate}${selectedHr}`)
        wmsLayer.setUrl(wmsUrl);
        wmsLayer.setParams({
            layers: `ffgs:${param}_${selectedDate}${selectedHr}`,
            // layers: `${param}:${param}_${selectedDate}${selectedHr}`,
            styles: getStyleName(param)
        });
        if (!mapInstance.hasLayer(wmsLayer)) {
            wmsLayer.addTo(mapInstance);
        }

        // Initialize wmsBasinLayer if it's not already defined for the map instance
        if (!mapInstance.wmsBasinLayer) {
            mapInstance.wmsBasinLayer = L.tileLayer.wms('', {
                format: 'image/png',
                version: '1.1.0',
                transparent: true
            });
        }

        // var wmsBasinLayer = mapInstance.wmsBasinLayer;
    
        // if (wmsBasinLayer && mapInstance.hasLayer(wmsBasinLayer)) {
        //     mapInstance.removeLayer(wmsBasinLayer);
        // }
        // wmsBasinLayer.setUrl(wmsBasinUrl);
        
        // if (!mapInstance.hasLayer(wmsBasinLayer)) {
        //     wmsBasinLayer.addTo(mapInstance);
        // }
        
        const selectedCountry = countryInput.value;
        
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
            // wmsBasinLayer.setParams({
            //     layers:'adm:basins_mekong'
            // })
        } else {
            // List of all countries
            const allCountries = ['KHM', 'THA', 'VNM', 'LAO'];
            // Exclude selected country from the list
            const filteredCountries = allCountries.filter(country => country !== selectedCountry);
            // Construct CQL filter
            cqlFilter = `ISO IN ('${filteredCountries.join("', '")}')`;
            // Add wmsLayer2 with the constructed CQL filter
            if (mapInstance.wmsLayer2) {
                mapInstance.removeLayer(mapInstance.wmsLayer2);
            }
           
            wmsLayer2 = L.tileLayer.wms(`${geoserver_endpoint}/geoserver/adm/wms?`, {
                layers: 'adm:mekong_country',
                format: 'image/png',
                version: '1.1.0',
                transparent: true,
                CQL_FILTER: cqlFilter,
                styles: 'adm0_filter_style'
            }).addTo(mapInstance);
            mapInstance.wmsLayer2 = wmsLayer2; // Store reference to wmsLayer2

            // if (selectedCountry === 'KHM') {
            //     wmsBasinLayer.setParams({layers:'adm:basins_cambodia'})
            // } else if (selectedCountry === 'LAO') {
            //     wmsBasinLayer.setParams({layers:'adm:basins_laos'});
            // } else if (selectedCountry === 'VNM') {
            //     wmsBasinLayer.setParams({layers:'adm:basins_vietnam'});
            // } else if (selectedCountry === 'THA') {
            //     wmsBasinLayer.setParams({layers:'adm:basins_thailand'});
            // } else {
            //     // Handle other cases or provide a default behavior
            //     console.log("Selected country not supported or no country selected.");
            // }
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

                cellProvinces.innerHTML = item.NAME_1 || '---';
                cellDistricts.innerHTML = item.NAME_2 || '---';
                cellLevel.innerHTML = interval === '1hrs' ? item.Alert_1Hrs : interval === '3hrs' ? item.Alert_3Hrs : interval === '6hrs' ? item.Alert_6Hrs : interval === '12hrs' ? item.Risk_12Hrs : item.Risk_24Hrs;
                // cellFemalePopulation.innerHTML = (parseFloat(item.F1) + parseFloat(item.F2) + parseFloat(item.F3)).toLocaleString() || '---';
                // cellMalePopulation.innerHTML = (parseFloat(item.M1) + parseFloat(item.M2) + parseFloat(item.M3)).toLocaleString() || '---';
                // cellRoad.innerHTML = (parseFloat(item.RTP1) + parseFloat(item.RTP2) + parseFloat(item.RTP3) + parseFloat(item.RTP4)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '---';
                // cellHospital.innerHTML = (parseFloat(item.Hospital)).toLocaleString() || '---';
                // cellGDP.innerHTML = Math.floor((parseFloat(item.GDP))).toLocaleString() || '---';
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
                element.textContent = selected_date + " " + selectedHrs +":00 (UTC+7)";
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
            // const insTab = document.getElementById('insTab'); // Critical infrastructure tab
            // const activeButton = insTab.querySelector('.nav-link.active');

            // Get the 'id' attribute of the active button
            // const activeButtonId = activeButton.getAttribute('id');
            // const selectedTabParam = tabMapping[activeButtonId];

            // const data = await getStatsBulletin(selectedTabParam, selected_date, selectedHrs);
            // const parsedData = JSON.parse(data);

            // const tableContainers = {
            //     "KHM": document.getElementById("KHMTableContainer"),
            //     "LAO": document.getElementById("LAOTableContainer"),
            //     "THA": document.getElementById("THATableContainer"),
            //     "VNM": document.getElementById("VNMTableContainer")
            // };
            
            // function hideAllExcept(exceptISO) {
            //     for (let countryISO of countryISOs) {
            //         if (tableContainers[countryISO]) { 
            //             if (countryISO === exceptISO) {
            //                 tableContainers[countryISO].style.display = "block";
            //             } else {
            //                 tableContainers[countryISO].style.display = "none";
            //             }
            //         } else {
            //             console.error(`Container for ${countryISO} is not defined in tableContainers.`);
            //         }
            //     }
            // }
            
            // if (selectedCountry === "All") {
            //     for (let countryISO in tableContainers) {
            //         tableContainers[countryISO].style.display = "block";
            //     }
            //     updateTable(parsedData);
            // } else {
            //     hideAllExcept(selectedCountry); 
            //     const filteredData = parsedData.filter(item => item.ISO === selectedCountry); 
            //     updateTable(filteredData);
            // }

            var dateWithoutHyphens = selected_date.replace(/-/g, '');
            for (const param in mapInstances) {
                await createMap(param, dateWithoutHyphens, selectedHrs);
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

            // // Loop through countries and intervals
            // for (const iso of countriesToProcess) {
            //     for (const interval of ['1hrs', '3hrs', '6hrs', '12hrs', '24hrs']) {
            //         const tableElement = document.getElementById(`${iso}Table${interval}`);
            //         await populateTableForInterval(tableElement, iso, interval, selected_date, selectedHrs);
            //     }
            // }
            if (selectedCountry === "All") {
                createAndPopulateTablesForAllISOs(selected_date, selectedHrs);
            } else {
                createAndPopulateTablesForISO(selectedCountry, selected_date, selectedHrs)
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
    async function getHour(date) {
        const date_url = `/get-hourlist?date=${date}`; 
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
    
    async function populateTableBody(iso, intervals, tableBodyId, selected_date, selected_hrs) {
        const combinedData = {};
        const tableBody = document.getElementById(`${tableBodyId}Body`);
        tableBody.innerHTML = '';  
        
        for (const interval of intervals) {
            const data = await fetchDataForInterval(iso, interval, selected_date, selected_hrs);
            combinedData[interval] = data;
        }

        if (intervals.includes('1hrs') || intervals.includes('3hrs') || intervals.includes('6hrs')) {
            // Check for group 1 (1, 3, and 6 hours)
            const group1Data = [combinedData['1hrs'], combinedData['3hrs'], combinedData['6hrs']];
            const hasDataGroup1 = group1Data.some(data => data.length > 0);
            if (!hasDataGroup1) {
                // If no data exists for group 1, create a single row with "No risk" spanning all columns
                const noRiskRow = document.createElement('tr');
                const noRiskCell = document.createElement('td');
                noRiskCell.colSpan = 9; // Span across all columns
                noRiskCell.textContent = 'No Flash Flood Guidance in the next 1, 3 and 6 hours';
                noRiskRow.appendChild(noRiskCell);
                tableBody.appendChild(noRiskRow);
                return;
            }
        }
        
        if (intervals.includes('12hrs') || intervals.includes('24hrs')) {
            // Check for group 2 (12 and 24 hours)
            const group2Data = [combinedData['12hrs'], combinedData['24hrs']];
            const hasDataGroup2 = group2Data.some(data => data.length > 0);
            if (!hasDataGroup2) {
                // If no data exists for group 2, create a single row with "No risk" spanning all columns
                const noRiskRow = document.createElement('tr');
                const noRiskCell = document.createElement('td');
                noRiskCell.colSpan = 6; // Span across all columns
                noRiskCell.textContent = 'No Flash Flood Risk in the next 12, and 24 hours';
                noRiskRow.appendChild(noRiskCell);
                tableBody.appendChild(noRiskRow);
                return;
            }
        }

        const maxRows = Math.max(...Object.values(combinedData).map(intervalData => intervalData.length));
        
        for (let i = 0; i < maxRows; i++) {
            const row = document.createElement('tr');
            
            intervals.forEach((interval, index) => {
                const data = combinedData[interval][i] || { NAME_1: '', NAME_2: '', Level: '' };
    
                const cell1 = document.createElement('td');
                cell1.textContent = data.NAME_1 || '';
                row.appendChild(cell1);
    
                const cell2 = document.createElement('td');
                cell2.textContent = data.NAME_2 || '';
                row.appendChild(cell2);
    
                const cellLevel = document.createElement('td');
                cellLevel.textContent = data.Level || '';
                if (data.Level) {
                    applyCellColor(cellLevel, data.Level);
                }
                if (index < intervals.length - 1) {
                    cellLevel.classList.add('border-right');
                }
                row.appendChild(cellLevel);
            });

            tableBody.appendChild(row);
        }
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
    
    const countryMappings = {
        'KHM': 'CAMBODIA',
        'LAO': 'LAOS',
        'THA': 'THAILAND',
        'VNM': 'VIETNAM'
    };

    async function createAndPopulateTablesForAllISOs(selected_date, selected_hrs) {
        const countryISOs = ['KHM', 'LAO', 'THA', 'VNM']; // Add other ISOs as needed
        const intervalsGroup1 = ['1hrs', '3hrs', '6hrs'];
        const intervalsGroup2 = ['12hrs', '24hrs'];
        const tablesContainer = document.getElementById('tablesContainer');
        tablesContainer.innerHTML = '';
    
        for (const iso of countryISOs) {
            const flagContainer = document.createElement('div');
            flagContainer.className = 'pt-5';
            flagContainer.style.display = 'flex';
            flagContainer.style.justifyContent = 'flex-start';

            // Append the flag container to the tables container
            tablesContainer.appendChild(flagContainer);

            // Create an image element for the flag
            const flagImage = document.createElement('img');
            flagImage.src = `/static/img/${iso.toLowerCase()}.png`; // Adjust the path to your local image
            // flagImage.width = '160px';
            flagImage.alt = 'Flag';

            // Set the width of the flag image using CSS
            flagImage.classList.add('flag-image');

            // Append the flag image to the flag container
            flagContainer.appendChild(flagImage);

            // Create and append the country-specific title
            const countryTitle = document.createElement('h1');
            countryTitle.className = 'pt-3 ps-4';
            const titleSpan = document.createElement('span');
            titleSpan.className = 'text-primary';
            titleSpan.textContent = 'THE DETAILED INFORMATION FOR FLASH FLOOD WARNING';
            const countryName = document.createElement('p');
            countryName.textContent = countryMappings[iso];
            countryTitle.appendChild(titleSpan);
            countryTitle.appendChild(countryName);
            flagContainer.appendChild(countryTitle);

            // Append the flag container before each table
            tablesContainer.appendChild(flagContainer);

            // Create the first table (1, 3, 6 hours)
            const table1 = createTableStructure(iso, 'FLASH FLOOD GUIDANCE', intervalsGroup1);
            tablesContainer.appendChild(table1);
    
            // Create the second table (12 and 24 hours)
            const table2 = createTableStructure(iso, 'FLASH FLOOD RISK', intervalsGroup2);
            tablesContainer.appendChild(table2);
    
            await populateTableBody(iso, intervalsGroup1, `${iso}Table1`, selected_date, selected_hrs);
            await populateTableBody(iso, intervalsGroup2, `${iso}Table2`, selected_date, selected_hrs);
        }
    }
    
    async function createAndPopulateTablesForISO(iso, selected_date, selected_hrs) {
        const intervalsGroup1 = ['1hrs', '3hrs', '6hrs'];
        const intervalsGroup2 = ['12hrs', '24hrs'];
        const tablesContainer = document.getElementById('tablesContainer');
        tablesContainer.innerHTML = '';

        const flagContainer = document.createElement('div');
        flagContainer.className = 'pt-5';
        flagContainer.style.display = 'flex';
        flagContainer.style.justifyContent = 'flex-start';

        // Append the flag container to the tables container
        tablesContainer.appendChild(flagContainer);

        // Create an image element for the flag
        const flagImage = document.createElement('img');
        flagImage.src = `/static/img/${iso.toLowerCase()}.png`; // Adjust the path to your local image
        // flagImage.width = '160px';
        flagImage.alt = 'Flag';

        // Set the width of the flag image using CSS
        flagImage.classList.add('flag-image');

        // Append the flag image to the flag container
        flagContainer.appendChild(flagImage);

        // Create and append the country-specific title
        const countryTitle = document.createElement('h1');
        countryTitle.className = 'pt-3 ps-4';
        const titleSpan = document.createElement('span');
        titleSpan.className = 'text-primary';
        titleSpan.textContent = 'THE DETAILED INFORMATION FOR FLASH FLOOD WARNING';
        const countryName = document.createElement('p');
        countryName.textContent = countryMappings[iso];
        countryTitle.appendChild(titleSpan);
        countryTitle.appendChild(countryName);
        flagContainer.appendChild(countryTitle);

        // Append the flag container before each table
        tablesContainer.appendChild(flagContainer);

        // Create the first table (1, 3, 6 hours)
        const table1 = createTableStructure(iso, 'FLASH FLOOD GUIDANCE', intervalsGroup1);
        tablesContainer.appendChild(table1);
    
        // Create the second table (12 and 24 hours)
        const table2 = createTableStructure(iso, 'FLASH FLOOD RISK', intervalsGroup2);
        tablesContainer.appendChild(table2);
    
        await populateTableBody(iso, intervalsGroup1, `${iso}Table1`, selected_date, selected_hrs);
        await populateTableBody(iso, intervalsGroup2, `${iso}Table2`, selected_date, selected_hrs);
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

    const allMapInstances = [asm6hrMap, map24hrMap, ffg1hrMap, ffg3hrMap, ffg6hrMap, fmap24hrMap, ffr12hrMap, ffr24hrMap];
    // Add layers to each map instance

    // // Load the layers
    // loadLayers().then(() => {
    //     // Add layers to each map instance
    //     allMapInstances.forEach(map => {
    //         // adm0Layer.addTo(map);
    //         // adm2Layer.addTo(map);
    //         // mainlakesLayer.addTo(map);
    //         // riverLayer.addTo(map);
    //         // mekong_basinLayer.addTo(map);
    //     });
    // }).catch(error => {
    //     console.error('Error adding layers to maps:', error);
    // });

    const allMapInstancesRf = [rfmap];
    // Load the layers
    loadLayersRf().then(() => {
        // Add layers to each map instance
        // allMapInstancesRf.forEach(map => {
            // adm0Layer.addTo(map);
            // mainlakesLayer.addTo(map);
            // riverLayer.addTo(map);
            // mekong_basinLayerRf.addTo(map);
        // });
    }).catch(error => {
        console.error('Error adding layers to maps:', error);
    });

    async function init() {
        try {
            loader.style.display = 'block';
            let dateList = await getDate();
            dateList = JSON.parse(dateList);
            clickableDates = dateList.map(innerArray => innerArray[0]);
            createCustomCalender(clickableDates);

            var selected_date = dateInput.value; 
            let hours = await getHour(selected_date);
            
            let latestHour;
            if (hours.length > 0) {
                // Sort the hours in descending order
                hours.sort(function(a, b) {
                    return b.localeCompare(a);
                });
                latestHour = hours[0];
            } else {
                console.log("No data available.");
            }
            hourInput.value = latestHour;
            var selected_hrs = latestHour;
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
                element.textContent = selected_date + " " + selected_hrs + ":00 (UTC+7)";
            });

            var dateWithoutHyphens = selected_date.replace(/-/g, '');

            // Call createMap sequentially for each parameter
            for (const param in mapInstances) {
                await createMap(param, dateWithoutHyphens, selected_hrs);
                // Add legend dynamically
                const legendContent = createLegend(param);
                addLegendToMap(mapInstances[param], legendContent); 
            }

            // // Loop through countries and intervals
            // for (const iso of countryISOs) {
            //     for (const interval of ['1hrs', '3hrs', '6hrs', '12hrs', '24hrs']) {
            //         const tableElement = document.getElementById(`${iso}Table${interval}`);
            //         await populateTableForInterval(tableElement, iso, interval, selected_date, selected_hrs);
            //     }
            // }

            createAndPopulateTablesForAllISOs(selected_date, selected_hrs);
            
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

        const modalHeader = document.querySelector("#modalHeader");

        try {
            const selected_date = dateInput.value;
            const selected_hour = hourInput.value;
            const selected_country = countryInput.value;

            const countryMapping = {
                "KHM": "Cambodia",
                "LAO": "Laos",
                "THA": "Thailand",
                "VNM": "Vietnam"
            };

            const sc = "<span class='fw-bold'>"+countryMapping[selected_country]+"</span>"
            const sd = "<span class='fw-bold'>"+selected_date+"</span>"
            
            if (selected_country == 'All') {
                modalHeader.innerHTML = " All Countries, with the date set to " + sd;
            } else {
                modalHeader.innerHTML = " " + sc +" , with the date set to " + sd;
            }

            // const response = await fetch(`http://127.0.0.1:8081/generate-pdf/?selectedDate=${selected_date}&selectedHr=${selected_hour}&selectedCountry=${selected_country}`);
            const response = await fetch(`http://119.15.81.22:8000/generate-pdf/?selectedDate=${selected_date}&selectedHr=${selected_hour}&selectedCountry=${selected_country}`);

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