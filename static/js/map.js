document.addEventListener("DOMContentLoaded", function() {
    let dateInput = document.getElementById("dateInput");
    let hourInput = document.getElementById("hrSelectionMap");
    let countryDropdown = document.getElementById("countrySelection");
    var openContentPanel = document.querySelector("#home");
    var closeContentPanel = document.querySelector("#close-home-content" );
    var sidebarContent = document.querySelector('#sidebar-content');
    let bcAll = document.querySelector('#allCountries');
    let bcCountry = document.querySelector('#bcCountry');
    let breadcrumb = document.querySelector('#breadcrumb');

    // Onlick expand home sidebar content area
    openContentPanel.onclick = function(){
        if (getComputedStyle(sidebarContent).display === "none"){
            sidebarContent.style.display ="block";
            sidebarContent.style.width = "350px";
            document.querySelector('.leaflet-left').style.marginLeft = '300px';
        } else if (sidebarContent.style.display === "block"){
            sidebarContent.style.width = "350px";
            document.querySelector('.leaflet-left').style.marginLeft = '300px';
        }else {
            sidebarContent.style.display = "none";
            document.querySelector('.leaflet-left').style.marginLeft = '0px';
        }
    };

    closeContentPanel.onclick = function(){
        sidebarContent.style.display = "none";
        document.querySelector('.leaflet-left').style.marginLeft = '0px';
    }

    // Define map center
    var MapOtions = {
        center: [16.9162, 102.9560],
        zoom: 6,
        zoomControl: false,
        minZoom: 5,
        // maxZoom: 14
    }

    // Create a map
    var map = L.map('map', MapOtions);

    // Set default basemap
    var basemap_layer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
        tileSize: 256,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">Mapbox| OpenStreetMap</a> contributors'
    }).addTo(map);

    // Change zoom control postion to right
    L.control.zoom({
        position: 'topleft'
    }).addTo(map);

    // Add scale control to map
    var scale = L.control.scale({
        position:'bottomright'
    }).addTo(map);

    var rightSidebarBtn = document.querySelector('#rightSidebar');
    var rightSidebarContent = document.querySelector('#rightSidebarContent');
    var rightSidebarCloseBtn  = document.querySelector('#close-sidebar-content-right');
    var popContent = document.querySelector("#popContent");
    var collapsePop = document.querySelector('#collapsePop');
    var expandPop = document.querySelector('#expandPop');
    var closePop = document.querySelector('#closePop');
    // var risk = document.querySelector('#riskList');

    rightSidebarBtn.onclick = function(){
        if (getComputedStyle(rightSidebarContent).display === "none"){
            rightSidebarContent.style.display = "block";
            rightSidebarBtn.style.display = "none";
        } else {
            rightSidebarContent.style.display = "none";
            rightSidebarBtn.style.display = "block";
        }
    }
    rightSidebarCloseBtn.onclick = function(){
        rightSidebarContent.style.display = "none";
        rightSidebarBtn.style.display = "block";
    }

    collapsePop.onclick = function(){
        document.getElementById('riskInfo').style.display = 'none';
        popContent.style.height = '50px';
        collapsePop.style.display = 'none';
        expandPop.style.display = 'block';
    }
    expandPop.onclick = function(){
        popContent.style.height = 'calc(100% - 105px)';
        collapsePop.style.display = 'block';
        expandPop.style.display = 'none';
        document.getElementById('riskInfo').style.display = 'block';
    }
    closePop.onclick = function(){
        popContent.style.display = 'none';
    }

    // risk.onclick = function(){
    //     popContent.style.display = 'block';
    // }

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

    var riskLayer = L.geoJSON().addTo(map);

    // Fetch URLs
    const urls = {
        '6hrs': '/get-alert-stat-6hrs/',
        '12hrs': '/get-risk-stat-12hrs/',
        '24hrs': '/get-risk-stat-24hrs/',
        'dates': '/get-datelist/'
    };

    // Generic function to fetch data based on the provided param and selectedDate
    async function getStats(param, selectedDate = null, selectedHrs = null) {
        try {
            // Initialize the cache for the specified param if it doesn't exist
            if (!caches[param]) {
                caches[param] = {};
            }
            // Check if data is already in the cache for the specified param and date
            if (selectedDate && caches[param][selectedDate] && caches[param][selectedDate][selectedHrs]) {
                clearBootstrapAlert();
                return caches[param][selectedDate][selectedHrs];
            }

            // Construct the URL with the selectedDate parameter
            let url = urls[param];
            if (selectedDate && selectedHrs) {
                url += `?date=${selectedDate}&hrs=${selectedHrs}`;
            }

            const response = await fetch(url);
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

            // Cache the data based on both param and date
            if (selectedDate && selectedHrs) {
                if (!caches[param]) {
                    caches[param] = {};
                }
                if (!caches[param][selectedDate]) {
                    caches[param][selectedDate] = {};
                }
                caches[param][selectedDate][selectedHrs] = data;
            } else {
                caches[param] = data;
            }

            return data;
        } catch (error) {
            console.error('Error:', error);
        }
    }

    let caches = {};
    
    const countProvincesByCountryAndLevel = (data) => {
        const countryLevelCounts = {};
    
        data.forEach(item => {
            const { country, level, province } = item;
    
            if (!countryLevelCounts[country]) {
                countryLevelCounts[country] = {
                    Low: new Set(),
                    Moderate: new Set(),
                    High: new Set()
                };
            }
    
            countryLevelCounts[country][level].add(province);
        });
    
        const result = {};
    
        for (const [country, levels] of Object.entries(countryLevelCounts)) {
            result[country] = {};
            for (const [level, provinces] of Object.entries(levels)) {
                result[country][level] = provinces.size;
            }
        }
    
        return result;
    };

    const countDistrictsByProvinceAndLevel = (data) => {
        const provinceLevelCounts = {};

        data.forEach(item => {
            const { province, level, district } = item;

            if (!provinceLevelCounts[province]) {
                provinceLevelCounts[province] = {
                    Low: new Set(),
                    Moderate: new Set(),
                    High: new Set()
                };
            }

            provinceLevelCounts[province][level].add(district);
        });

        const result = {};

        for (const [province, levels] of Object.entries(provinceLevelCounts)) {
            result[province] = {};
            for (const [level, districts] of Object.entries(levels)) {
                result[province][level] = districts.size;
            }
        }

        return result;
    };

    const percentOfDistrictsByProvince = (data) =>{
        // Initialize counters
        const riskLevels = { Low: 0, Moderate: 0, High: 0 };

        // Count occurrences of each risk level
        data.forEach(item => {
        if (item.level in riskLevels) {
            riskLevels[item.level]++;
        }
        });

        // Calculate percentages
        const totalDistricts = data.length;
        const riskPercentages = {
            Low: (riskLevels.Low / totalDistricts) * 100,
            Moderate: (riskLevels.Moderate / totalDistricts) * 100,
            High: (riskLevels.High / totalDistricts) * 100
        };
        return riskPercentages
    }

    // Function to process data based on area type and name
    function processDataByAreaType(data, areaType, areaName) {
        // console.log(areaType, areaName)
        if (areaType === 'country') {
            if (areaName === 'all') {
                // const countryData = getUniqueCountriesByLevel(data)
                const countryData = countProvincesByCountryAndLevel(data);
                return countryData;
            } else {
                const filteredData = data.filter(item => item.country === areaName);
                
            }
        }

        if (areaType === 'adm1') {
            const filteredData = data.filter(item => item.country === areaName);
            return countDistrictsByProvinceAndLevel(filteredData);
        }

        if (areaType === 'adm2') {
            const filteredData = data.filter(item => item.province === areaName);
            return percentOfDistrictsByProvince(filteredData);
        }
    }

    async function processData(geojsonData, areaType, areaName) {
         
        // Process the data based on the area type and name
        const processedData = [];
        
        geojsonData.features.forEach(feature => {
            const level = feature.properties.level;
            const district = feature.properties.district;
            const province = feature.properties.province;
            const country = feature.properties.country;
    
            processedData.push({ level, district, province, country });
        });
        
        const result = processDataByAreaType(processedData, areaType, areaName);
        
        return result;
    }

    async function createChart(data){
        // const table = document.getElementById('riskTable');
        // table.style.display = 'None';
        const container = document.getElementById('riskTable');
        container.innerHTML = ''; // Clear previous content
        container.style.marginTop = '10px';
        
        // Create the Highcharts pie chart
        Highcharts.chart(container, {
            chart: {
                type: 'pie',
                backgroundColor: 'transparent',
                // marginTop: 20
            },
            title: {
                text: 'Risk Levels ( % of District)',
                style: {
                    fontSize: '14px' 
                }
            },
            tooltip: {
                pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b>'
            },
            accessibility: {
                point: {
                    valueSuffix: '%'
                }
            },
            plotOptions: {
                pie: {
                    allowPointSelect: true,
                    cursor: 'pointer',
                    dataLabels: {
                        enabled: false,
                        format: '{point.percentage:.1f} %'
                    },
                    showInLegend: true,
                }
            },
            legend: {
                layout: 'horizontal',
                align: 'left',
                verticalAlign: 'bottom',
                itemMarginTop: 3,
                itemMarginBottom: 3,
                itemStyle: {
                    color: '#666666',
                    fontWeight: 'normal',
                    fontSize: '12px',
                    align: 'center',  
                    verticalAlign: 'middle',
                    layout: 'vertical'     
                },
                labelFormatter: function() {
                    return this.name + " (" + this.percentage.toFixed(2) + "%)";
                }
            },
            series: [{
                name: 'Risk Levels',
                colorByPoint: true,
                data: [{
                    name: 'Low',
                    y: data.Low,
                    color: 'yellow'
                }, {
                    name: 'Moderate',
                    y: data.Moderate,
                    color: 'orange'
                }, {
                    name: 'High',
                    y: data.High,
                    color: 'red'
                }]
            }]
        });
    }

    // Function to create the table
    async function createTable(data, admin) {
        // console.log(admin)
        var riskTitle;
        if (admin == 'country'){
            riskTitle = "Provinces";
        } else if (admin == 'adm1') {
            riskTitle = "Districts";
        }
        
        // Create a new table element with Bootstrap table classes
        const table = document.createElement('table');
        table.style.marginTop = '20px';
        table.style.paddingRight = '20px';
        table.style.width = '100%';
        table.style.borderTop = '1px solid #000';
        table.style.borderBottom = '1px solid #000';

        // Create a wrapper div for the table
        const tableWrapper = document.createElement('div');
        tableWrapper.style.overflowY = 'scroll';
        tableWrapper.style.maxHeight = '520px';
        tableWrapper.style.marginTop = '20px';
        tableWrapper.style.marginRight = '20px';
        tableWrapper.style.width = '100%';

        // Append the table to the wrapper
        tableWrapper.appendChild(table);

        // Create table header
        const thead = document.createElement('thead');
        
        // First header row
        const headerRow1 = document.createElement('tr');
        
        // Empty cell for the 'Country' column that spans two rows
        const countryHeader = document.createElement('th');
        countryHeader.textContent = 'Country';
        countryHeader.rowSpan = 2; 
        countryHeader.style.textAlign = 'center'; // Center text horizontally
        countryHeader.style.verticalAlign = 'middle'; // Center text vertically
        headerRow1.appendChild(countryHeader);

        // Header cell for the 'Risk Levels' column that spans three columns
        const riskHeader = document.createElement('th');
        riskHeader.textContent = `Risk Levels ( No. of ${riskTitle} )`;
        riskHeader.colSpan = 3; // Span three columns
        riskHeader.style.textAlign = 'center'; // Center text horizontally
        riskHeader.style.verticalAlign = 'middle'; // Center text vertically
        riskHeader.style.borderBottom = '1px solid #000';
        riskHeader.style.paddingTop = '5px';
        riskHeader.style.paddingBottom = '5px';
        headerRow1.appendChild(riskHeader);
        
        thead.appendChild(headerRow1);

        // Second header row for risk levels
        const headerRow2 = document.createElement('tr');
        headerRow2.style.borderBottom = '1px solid #000';
        // Headers for 'Low', 'Moderate', and 'High' risk levels
        ['Low', 'Moderate', 'High'].forEach(level => {
            const th = document.createElement('th');
            th.textContent = level;
            th.style.textAlign = 'center';
            th.style.paddingTop = '5px';
            th.style.paddingBottom = '5px';
            headerRow2.appendChild(th);
        });

        thead.appendChild(headerRow2);
        table.appendChild(thead);

        // Create table body
        const tbody = document.createElement('tbody');
        Object.entries(data).forEach(([country, levels]) => {
            const row = document.createElement('tr');

            // Country cell
            const countryCell = document.createElement('td');
            countryCell.textContent = country;
            countryCell.style.paddingTop = '5px';
            countryCell.style.paddingBottom = '5px';
            row.appendChild(countryCell);

            // Cells for 'Low', 'Moderate', and 'High' risk levels with numbers
            ['Low', 'Moderate', 'High'].forEach(level => {
                const levelCell = document.createElement('td');
                levelCell.textContent = levels[level]; // Display the number directly
                levelCell.style.textAlign = 'center';
                levelCell.style.paddingTop = '5px';
                levelCell.style.paddingBottom = '5px';
                row.appendChild(levelCell);
            });

            tbody.appendChild(row);
        });

        table.appendChild(tbody);

        // Append the table to the container with id 'riskTable'
        const container = document.getElementById('riskTable');
        container.innerHTML = ''; // Clear previous content
        // container.appendChild(table);
        container.appendChild(tableWrapper);
    }

    async function generateMap(data){
        // Define function to get color by category
        function getColorbyCategory(cat) {
            switch (cat) {
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

        // Define function to set style based on feature properties
        function defineStyle(feature) {
            const level = feature.properties.level;
            const color = getColorbyCategory(level);
            let defaultStyle = { color: "#000", weight: 1, opacity: 1, fillOpacity: 1 };

            if (color === 'none') {
                defaultStyle = { ...defaultStyle, fillOpacity: 0, opacity: 0 }; // Invisible style
            }

            return color ? { ...defaultStyle, color } : defaultStyle;
        }

        // Define function to create tooltip content
        function createTooltipTable(feature) {
            return (
                '<div class="table-responsive">' +
                '<table class="table">' +
                '<thead>' +
                '<tr>' +
                '<th class="fw-bold">Basin ID</th>' +
                '<th class="fw-bold">' + feature.properties.BASIN + '</th>' +
                '</tr>' +
                '</thead>' +
                '<tbody>' +
                '<tr>' +
                '<td class="fw-bold">Risk Level</td>' +
                '<td>' + feature.properties.level + ' (' + feature.properties.value + ')'+'</td>' +
                '</tr>' +
                '<tr>' +
                '<td class="fw-bold">District</td>' +
                '<td>' + feature.properties.district + '</td>' +
                '</tr>' +
                '<tr>' +
                '<td class="fw-bold">Province</td>' +
                '<td>' + feature.properties.province + '</td>' +
                '</tr>' +
                '<tr>' +
                '<td class="fw-bold">Country</td>' +
                '<td>' + feature.properties.country + '</td>' +
                '</tr>' +
                '</tbody>' +
                '</table>' +
                '</div>'
            );
        }

        // Function to handle layer addition and tooltips
        riskLayer.on('layeradd', function (e) {
            onEachFeature(e.layer.feature, e.layer);
        });

        // Function to bind tooltip to each feature
        function onEachFeature(feature, layer) {
            layer.bindTooltip(createTooltipTable(feature));
            layer.on({
                click: getFeatureDetails,
            });
        }

        async function useBasinData(feature) {
            try {
                const basin_id = feature.properties.BASIN;
                const country = feature.properties.country;
                const district = feature.properties.district;
                const province = feature.properties.province;
                const level = feature.properties.level;
        
                // Fetch data and handle potential errors
                const data = await getBasinData(basin_id);
                const parsedData = JSON.parse(data);
                
                const jsonData = {
                    ...parsedData[0],
                    level: level,
                    country: country,
                    province: province,
                    district: district
                };
                displayDetail(jsonData); 
            } catch (error) {
                console.error('Error:', error);
                // Handle the error appropriately, such as displaying an error message
            }
        }        

        function getFeatureDetails(e) {
            const layer = e.target;
            const clickedFeature = layer.feature;
            // const basin_id = clickedFeature.properties.BASIN;
            useBasinData(clickedFeature);
            popContent.style.display = 'block'; 
        }
        // Clear existing map layers and add new data with updated styles
        riskLayer.clearLayers();
        riskLayer.addData(data, {
            onEachFeature: onEachFeature
        });
        riskLayer.setStyle(feature => defineStyle(feature));
    }

    async function getBasinData(basin_id) {
        const response = await fetch(`/get-basin-details?basin=${basin_id}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    }

    async function createOrUpdateRiskMap(param, date, hr, areaType = 'country', areaName = 'all') {
        try {
            // Show loading indicator
            document.getElementById('loader').style.display = 'block';
    
            // Initialize the cache for the specified param, date, and hr if it doesn't exist
            if (!caches[param]) caches[param] = {};
            if (!caches[param][date]) caches[param][date] = {};
            if (!caches[param][date][hr]) caches[param][date][hr] = {};
    
            let data; // Declare data variable
    
            // Check if data is already in the cache for the specified param, date, and hr
            if (Object.keys(caches[param][date][hr]).length !== 0) {
                clearBootstrapAlert();
                data = caches[param][date][hr]; // Assign cached data
            } else {
                // Construct the URL with the specified parameters
                let url = '/get-risk-map';
                if (param && date && hr) {
                    url += `?param=${param}&date=${date}&hr=${hr}`;
                }
    
                // Fetch the data from the server
                const response = await fetch(url);
    
                // Handle different response statuses
                if (!response.ok) {
                    if (response.status === 404) {
                        showBootstrapAlert("Oops! No data found for the selected date and hours. Please select a different date and try again.");
                        throw new Error("Data not found for the selected date and hours");
                    }
                    throw new Error("Network response was not ok");
                }
    
                // Clear any previous error alerts
                clearBootstrapAlert();
    
                // Parse the response data
                data = await response.json();
    
                // Cache the data based on param, date, and hr
                caches[param][date][hr] = data;
            }
    
            // Generate the map using the fetched data
            await generateMap(data);
            
            // Process the fetched data for table creation or other purposes
            const processedData = await processData(data, areaType, areaName);
            // await createTable(processedData, areaType);
            
            if (areaType == 'adm2') {
                await createChart(processedData);
            } else {
                await createTable(processedData, areaType);
            }

            // Hide loading indicator
            document.getElementById('loader').style.display = 'none';
    
            // Return the fetched data
            return data;
        } catch (error) {
            console.error('Error:', error);
            // Hide loading indicator on error
            document.getElementById('loader').style.display = 'none';
            // Handle error further if needed
            throw error; // Rethrow the error or handle as appropriate
        }
    }    
    
    document.getElementById("btnradio06").addEventListener("click", async function() {
        var selectedDate = dateInput.value;
        var selectedHr = hourInput.value;
        var selectedCountry = countryDropdown.value;
        createOrUpdateRiskMap('FFG06', selectedDate, selectedHr, selectedCountry);
    });

    document.getElementById("btnradio12").addEventListener("click", async function() {
        var selectedDate = dateInput.value;
        var selectedHr = hourInput.value;
        var selectedCountry = countryDropdown.value;
        createOrUpdateRiskMap('FFR12', selectedDate, selectedHr);
    });

    document.getElementById("btnradio24").addEventListener("click", async function() {
        var selectedDate = dateInput.value;
        var selectedHr = hourInput.value;
        var selectedCountry = countryDropdown.value;
        createOrUpdateRiskMap('FFR24', selectedDate, selectedHr);
    });
    
    
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
            {min: 100, color: colors.lightGreen},
        ],
        FFG01: [
            {min: 0, max: 10, color: colors.violet},
            {min: 10, max: 25, color: colors.red},
            {min: 25, max: 40, color: colors.yellow},
            {min: 40, max: 60, color: colors.lightGreen},
        ],
        FFG03: [
            {min: 0, max: 10, color: colors.violet},
            {min: 10, max: 25, color: colors.red},
            {min: 25, max: 40, color: colors.yellow},
            {min: 40, max: 70, color: colors.lightGreen},
        ],
        FFG06: [
            {min: 0, max: 15, color: colors.violet},
            {min: 15, max: 30, color: colors.red},
            {min: 30, max: 60, color: colors.yellow},
            {min: 60, max: 100, color: colors.lightGreen},
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

    function populateLegend(key) {
        // Reference to the legend element
        const legendElement = document.getElementById("ffpLegend");
    
        // Clear existing legend items
        legendElement.innerHTML = '<p class="pt-2 pb-0">Flash Flood Parameter <br>(Basin)</p>';
    
        // Iterate over each style in the specified key
        styles[key].forEach(item => {
            // Create a new legend item
            const div = document.createElement("div");
            div.classList.add("legend-item");
    
            // If max is not present, assume "above min"
            const label = item.max ? `${item.min} - ${item.max}` : `above ${item.min}`;
    
            div.innerHTML = `
                <span class="legend-color" style="background-color: ${item.color};"></span> ${label}
            `;
    
            // Append to the legend
            legendElement.appendChild(div);
        });
    }

    function changeIcon(isShown) {
        const iconElement = document.getElementById('toggleIcon');

        if (isShown) {
            iconElement.classList.remove('fa-chevron-down');
            iconElement.classList.add('fa-chevron-up');
        } else {
            iconElement.classList.remove('fa-chevron-up');
            iconElement.classList.add('fa-chevron-down');
        }
    }

    document.getElementById('collapseExample').addEventListener('show.bs.collapse', function() {
        changeIcon(true);
    });

    document.getElementById('collapseExample').addEventListener('hide.bs.collapse', function() {
        changeIcon(false);
    });

    // GeoServer URL
    const geoserver_url = 'http://119.15.81.22:8081/geoserver/';

    // Create a function to generate WMS URL
    function generateWMSUrl(param, selectedDate, selectedHr) {
        return `${geoserver_url}wms?`;
    }

    // Define an empty WMS layer
    var wmsLayer = L.tileLayer.wms('', {
        format: 'image/png',
        version: '1.1.0',
        transparent: true
    }).addTo(map);

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

    // Basin boundary layer
    var wmsBasinUrl = 'http://119.15.81.22:8081/geoserver/adm/wms?';

    // Replace 'workspace:layername' with the name of your workspace and layer
    var wmsBasinLayer = L.tileLayer.wms(wmsBasinUrl, {
        layers: 'adm:basins_mekong',
        format: 'image/png',
        transparent: true,
        minZoom: 7,
        style: { weight: 0.1 } 
    });

    // Add wmsLayer2 with the constructed CQL filter
    var wmsLayer2 = L.tileLayer.wms('http://119.15.81.22:8081/geoserver/adm/wms?', {
        layers: 'adm:adm0',
        format: 'image/png',
        version: '1.1.0',
        transparent: true
    });

    // Function to create or update WMS layer
    async function createOrUpdateBasinWMSLayer(param, selectedDate, selectedHr) {
        var wmsUrl = generateWMSUrl(param, selectedDate, selectedHr);
        if (wmsLayer && map.hasLayer(wmsLayer)) {
            // Remove existing WMS layer
            map.removeLayer(wmsLayer);
        }
        wmsLayer.setUrl(wmsUrl);
        wmsLayer.setParams({
            layers: `ffgs:${param}_${selectedDate}${selectedHr}`,
            styles: getStyleName(param)
        });
        if (!map.hasLayer(wmsLayer)) {
            wmsLayer.addTo(map);
        }
        // if (!map.hasLayer(wmsLayer2)) {
        //     wmsLayer2.addTo(map);
        // }
        // Bring wmsLayer to the back
        // wmsLayer.bringToBack();
        wmsBasinLayer.bringToFront();
        wmsLayer2.bringToFront();
    }

    // Function to update layers dynamically
    function updateBasinBoundaryWMSLayer(newLayerName){
        wmsBasinLayer.setParams({ layers: newLayerName });
    }

    document.querySelectorAll('input[name="ffpRadio"]').forEach((elem) => {
        elem.addEventListener("change", function() {
            var selectedDate = dateInput.value;
            var selectedHr = hourInput.value;
            // var selectedDate = '2024-02-10';
            // var selectedHr = '10';
            var dateWithoutHyphens = selectedDate.replace(/-/g, '');
            var selectedParam = this.id; 
            createOrUpdateBasinWMSLayer(selectedParam, dateWithoutHyphens, selectedHr)
            populateLegend(this.id);
        });
    });

    const radioButtonsBasin = document.querySelectorAll('input[name="ffpRadio"]');
    
    //================ Date panel =======================>

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

    async function updateDataForSelectedDate(selectedDate) {
        const radioButtons = document.getElementsByName("btnradio");
        let selectedRadioButton;
    
        for(let radioButton of radioButtons) {
            if (radioButton.checked) {
                selectedRadioButton = radioButton;
                break;
            }
        }
    
        const radioMapping = {
            "btnradio06": "FFG06",
            "btnradio12": "FFR12",
            "btnradio24": "FFR24"
        };
    
        const param = radioMapping[selectedRadioButton.id];
        // let selectedDate = dateInput.value; 
        const selectedHr = hourInput.value;
        const selectedCountry = countryDropdown.value;

        createOrUpdateRiskMap(param, selectedDate, selectedHr);
    }

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
    
            let selectedDate = currentDate;
            updateDataForSelectedDate(selectedDate);
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

    countryDropdown.addEventListener("change", async function () {
        const radioButtons = document.getElementsByName("btnradio");
        let selectedRadioButton;
    
        for(let radioButton of radioButtons) {
            if (radioButton.checked) {
                selectedRadioButton = radioButton;
                break;
            }
        }
    
        const radioMapping = {
            "btnradio06": "FFG06",
            "btnradio12": "FFR12",
            "btnradio24": "FFR24"
        };
    
        const param = radioMapping[selectedRadioButton.id];
        const selectedDate = dateInput.value; 
        const selectedHr = hourInput.value;
        const selectedCountry = countryDropdown.value;
        
        createOrUpdateRiskMap(param, selectedDate, selectedHr, selectedCountry);

        // Construct CQL filter based on the selected country
        var cqlFilter = '';

        if (selectedCountry === "All"){
            updateBasinBoundaryWMSLayer('adm:basins_mekong')
            map.removeLayer(wmsLayer2);
        } else {
            if (selectedCountry === 'KHM') {
                updateBasinBoundaryWMSLayer('adm:basins_cambodia');
            } else if (selectedCountry === 'LAO') {
                updateBasinBoundaryWMSLayer('adm:basins_laos');
            } else if (selectedCountry === 'VNM') {
                updateBasinBoundaryWMSLayer('adm:basins_vietnam');
            } else if (selectedCountry === 'THA') {
                updateBasinBoundaryWMSLayer('adm:basins_thailand');
            } else {
                // Handle other cases or provide a default behavior
                console.log("Selected country not supported or no country selected.");
            }

            // List of all countries
            const allCountries = ['KHM', 'THA', 'VNM', 'LAO'];
            // Exclude selected country from the list
            const filteredCountries = allCountries.filter(country => country !== selectedCountry);
            // Construct CQL filter
            cqlFilter = `ISO IN ('${filteredCountries.join("', '")}')`;
            
            // // Add wmsLayer2 with the constructed CQL filter
            // var wmsLayer2 = L.tileLayer.wms('http://119.15.81.22:8081/geoserver/adm/wms?', {
            //     layers: 'adm:adm0',
            //     format: 'image/png',
            //     version: '1.1.0',
            //     transparent: true,
            //     CQL_FILTER: cqlFilter
            // }).addTo(map);
            wmsLayer2.setParams({CQL_FILTER: cqlFilter});
            if (!map.hasLayer(wmsLayer2)) {
                wmsLayer2.addTo(map);
            }
        }
    });

    hourInput.addEventListener("change", async function () {
        const radioButtons = document.getElementsByName("btnradio");
        let selectedRadioButton;
    
        for(let radioButton of radioButtons) {
            if (radioButton.checked) {
                selectedRadioButton = radioButton;
                break;
            }
        }
    
        const radioMapping = {
            "btnradio06": "FFG06",
            "btnradio12": "FFR12",
            "btnradio24": "FFR24"
        };
    
        const param = radioMapping[selectedRadioButton.id];
        const selectedDate = dateInput.value; 
        const selectedHr = hourInput.value;
        const selectedCountry = countryDropdown.value;

        createOrUpdateRiskMap(param, selectedDate, selectedHr);
    });

    //////////////////////////

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

    // Fetch and display initial 6-hour data on page load
    (async function init() {
        let dateList = await getStats('dates');
        dateList = JSON.parse(dateList);
        clickableDates = dateList.map(innerArray => innerArray[0]);
        createCustomCalender(clickableDates);

        let selectedDate = dateInput.value; 
        let hours = await getHour(selectedDate);
            
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
        let selectedHrs = latestHour;
        let selectedCountry = countryDropdown.value;
        createOrUpdateRiskMap('FFR12', selectedDate, selectedHrs);
    })();

    // Function to create Highcharts bar chart
    function createHighchartsColumnChart(containerId, categories, data) {
        // Define a color mapping for specific categories
        const colorMapping = {
            "low": "yellow",
            "moderate": "orange",
            "high": "red"
        };
    
        Highcharts.chart(containerId, {
            chart: {
                type: 'column',
                backgroundColor: 'transparent',
                height: '250px'
            },
            title: {
                text: 'Number of Districts Exposed',
                style: {
                    fontSize: '12px'
                }
            },
            xAxis: {
                categories: categories,
                title: {
                    text: 'Level'
                }
            },
            yAxis: {
                min: 0,
                title: {
                    text: 'Number of Districts',
                    align: 'high'
                },
                labels: {
                    overflow: 'justify'
                }
            },
            tooltip: {
                enabled: false
            },
            legend: {
                enabled: false
            },
            plotOptions: {
                column: {
                    dataLabels: {
                        enabled: true
                    }
                }
            },
            credits: {
                enabled: false
            },
            series: [{
                name: 'Level',
                data: data.map((value, index) => ({
                    y: value,
                    color: colorMapping[categories[index].toLowerCase()] || Highcharts.getOptions().colors[index]
                })),
                colorByPoint: true
            }]
        });
    }

    // // Keep this layer always on bottom
    // map.on('layeradd', function() {
    //     subProvinceLayer.bringToBack();
    // });

    const subp_check = document.querySelector("#ffwSubp");
    subp_check.addEventListener("click", ()=> {
        if(subp_check.checked){
            map.addLayer(riskLayer);
            document.getElementById("ffwLegend").style.display = "block";
        } else {
            map.removeLayer(riskLayer);
            document.getElementById("ffwLegend").style.display = "none";
        }
    });

    const ffpBasin = document.querySelector('#ffpBasin');
    ffpBasin.addEventListener("click", ()=> {
        if(ffpBasin.checked){
            // map.addLayer(ffgsLayer);
            map.addLayer(wmsLayer);
            map.addLayer(wmsBasinLayer);
            document.getElementById("ffpLegend").style.display = "block";
        } else {
            map.removeLayer(wmsLayer);
            map.removeLayer(wmsBasinLayer);
            document.getElementById("ffpLegend").style.display = "none";
        }
    });

    wmsBasinLayer.bringToFront();

    let adm0;
    let subprovince_map;
    let mainlakes;
    let river;
    // let mekong_basin;

    const staticCache = {};

    async function fetchData(url, params = {}) {
        try {
            // Construct query string from params object
            const queryString = new URLSearchParams(params).toString();
            const fullUrl = queryString ? `${url}?${queryString}` : url;
    
            if (staticCache[fullUrl]) {
                return staticCache[fullUrl]; // Return cached data if available
            }
    
            const response = await fetch(fullUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const data = await response.json();
            staticCache[fullUrl] = data; 
            return data;
        } catch (error) {
            console.error('Fetch error:', error);
            throw error;
        }
    }


    // Function to set the default style
    function style(feature) {
        return {
            fillColor: '#9999ff',
            weight: 1,
            opacity: 1,
            color: '#000', //'white',
            fillOpacity: 0.0,
            dashArray: '4, 2'
        };
    }

    // Function to handle mouseover event
    function highlightFeature(e) {
        const layer = e.target;

        layer.setStyle({
            fillColor: 'orange', //'#fde047',
            weight: 2,
            color: '#000', // '#fde047',
            fillOpacity: 0.5,
        });

        if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
            layer.bringToBack();
        }

        // Show the name of the feature in a popup or tooltip
        layer.bindTooltip(layer.feature.properties.NAME_0 || layer.feature.properties.province || layer.feature.properties.District).openTooltip();
    }

    // Function to handle mouseout event
    function resetHighlight(e) {
        adm0.resetStyle(e.target);
    }

    // Function to attach event listeners to each feature
    function onEachFeature(feature, layer) {
        layer.on({
            mouseover: highlightFeature,
            mouseout: resetHighlight,
            click: zoomToFeature,
        });
    }

    // Function to handle click event
    async function zoomToFeature(e) {
        const layer = e.target;
        const clickedFeature = layer.feature;

        let admType = 'adm1'; // Default value
        let name = clickedFeature.properties.NAME_0;
        updateBreadcrumb('country', name);
        
        // Check if clickedFeature has the property 'Name_1'
        if (clickedFeature.properties && clickedFeature.properties.province) {
            admType = 'adm2';
            name = clickedFeature.properties.province;
            let selectedCountry = clickedFeature.properties.country;
            updateBreadcrumb('province', name, selectedCountry);
        }

        // Prepare parameters based on the condition
        const params = { name: name, adm_type: admType };

        // Check if clickedFeature has the property 'District'
        if (clickedFeature.properties && clickedFeature.properties.District) {
            name = clickedFeature.properties.District;
            let selectedCountry = clickedFeature.properties.Country;
            let selectedProvince = clickedFeature.properties.Province;
            // console.log(clickedFeature.properties)
            updateBreadcrumb('district', name, selectedCountry, selectedProvince);
            // If it has District property, just zoom to the feature
            map.fitBounds(layer.getBounds(), { minZoom: 7 });
        } else {
            await updateMapData(params);
        }
    }

    async function updateMapData(params) {
         
        // Fetch Thailand province data
        const data = await fetchData('/get-admin-boundary/', params);
    
        // Clear existing layers (if needed) and add new data
        adm0.clearLayers();
        adm0.addData(data);
        map.fitBounds(adm0.getBounds(), { minZoom: 7 });
        
        const radioButtons = document.getElementsByName("btnradio");
        let selectedRadioButton;
    
        for(let radioButton of radioButtons) {
            if (radioButton.checked) {
                selectedRadioButton = radioButton;
                break;
            }
        }
    
        const radioMapping = {
            "btnradio06": "FFG06",
            "btnradio12": "FFR12",
            "btnradio24": "FFR24"
        };
    
        const selectedParam = radioMapping[selectedRadioButton.id];
    
        const selectedDate = dateInput.value;
        const selectedHr = hourInput.value;
        // const selectedParam = 'FFG06';
        // console.log(params)
        createOrUpdateRiskMap(selectedParam, selectedDate, selectedHr, params.adm_type, params.name);
    }

    async function loadLayers() {
        try {
            // Load adm0 data
            const adm0Data = await fetchData('/static/data/adm0.geojson');
            adm0 = L.geoJSON(adm0Data, {
                style: style,
                onEachFeature: onEachFeature
            }).addTo(map);

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
            }).addTo(map);
            
            map.fitBounds(adm0.getBounds(), { minZoom: 7 });
            
        } catch (error) {
            console.error('Layer loading error:', error);
        }
    }

    // Call the loadLayers function to load the layers asynchronously.
    loadLayers();

    var mekong_basin  = L.tileLayer.wms('http://119.15.81.22:8081/geoserver/wms?', {
        layers: 'ffgs:lmb_basin',
        format: 'image/png',
        version: '1.1.0',
        transparent: true
    }).addTo(map);

    bcAll.onclick = function(){
        loadLayers();
        updateBreadcrumb('All', null);
        const radioButtons = document.getElementsByName("btnradio");
        let selectedRadioButton;
    
        for(let radioButton of radioButtons) {
            if (radioButton.checked) {
                selectedRadioButton = radioButton;
                break;
            }
        }
    
        const radioMapping = {
            "btnradio06": "FFG06",
            "btnradio12": "FFR12",
            "btnradio24": "FFR24"
        };
    
        const selectedParam = radioMapping[selectedRadioButton.id];
        const selectedDate = dateInput.value;
        const selectedHr = hourInput.value;
        createOrUpdateRiskMap(selectedParam, selectedDate, selectedHr);
        
    }
    
    // Function to update breadcrumb based on selected country
    function updateBreadcrumb(areaType, areaName, country='All', province='All') {
        if (areaType == 'All'){
            bcCountry.innerHTML = 'All';
            removeBreadcrumbItem('bcProvince');
            removeBreadcrumbItem('bcDistrict');
        } else if (areaType == 'country'){
            bcCountry.innerHTML = areaName;
        } else if (areaType == 'province'){
            bcCountry.innerHTML = '';
            bcCountry.textContent = country;
            bcCountry.href = '#';
            
            const newList = document.createElement('li');
            newList.classList.add('breadcrumb-item');
            
            const bcProvince = document.createElement('a');
            bcProvince.textContent = areaName;
            bcProvince.id = 'bcProvince';
            newList.appendChild(bcProvince);
            breadcrumb.appendChild(newList);

            bcCountry.onclick = async function() {
                const params = { name: country, adm_type: 'adm1' };
                await updateMapData(params);
                if (newList.parentNode) {
                    breadcrumb.removeChild(newList); 
                }
            };

            // Remove the district breadcrumb if it exists
            const bcDistrict = document.getElementById('bcDistrict');
            if (bcDistrict) {
                const districtListItem = bcDistrict.parentNode;
                if (districtListItem && districtListItem.parentNode) {
                    districtListItem.parentNode.removeChild(districtListItem);
                }
            }

        } else if (areaType == 'district'){
            let bcProvince = document.querySelector('#bcProvince');
            bcCountry.innerHTML = '';
            bcCountry.textContent = country;
            bcCountry.href = '#';
            bcProvince.textContent = province;
            bcProvince.href = '#';

            // Create a new list item
            const newList2 = document.createElement('li');
            newList2.classList.add('breadcrumb-item');

            // Create a new list item
            let bcDistrict = document.getElementById('bcDistrict');
            
            if (bcDistrict) {
                // bcDistrict.textContent = '';
                bcDistrict.textContent = areaName;
            } else {
                bcDistrict = document.createElement('a');
                bcDistrict.textContent = areaName;
                bcDistrict.id = 'bcDistrict';
                newList2.appendChild(bcDistrict);
                breadcrumb.appendChild(newList2);
            }

            bcProvince.onclick = async function() {
                const params = { name: province, adm_type: 'adm2' };
                await updateMapData(params);
                if (newList2.parentNode) {
                    breadcrumb.removeChild(newList2);
                }
            };
        }
    }

    // Helper function to remove a breadcrumb item by ID
    function removeBreadcrumbItem(itemId) {
        const item = document.getElementById(itemId);
        if (item) {
            const listItem = item.parentNode;
            if (listItem && listItem.parentNode) {
                listItem.parentNode.removeChild(listItem);
            }
        }
    }

    function displayDetail(entry){
        // console.log(entry);
        const riskLavel = document.querySelector("#risk_level");
        if (entry.length==0){
            return;
        } else {
            riskLavel.innerHTML = entry.level;
        }

        const dataKeyToElementIdMap = {
            "province": "province_name",
            "district": "subprovince_name",
            "M1": "male_pop_m1_subprvnc",
            "M2": "male_pop_m2_subprvnc",
            "M3": "male_pop_m3_subprvnc",
            "F1": "female_pop_f1_subprvnc",
            "F2": "female_pop_f2_subprvnc",
            "F3": "female_pop_f3_subprvnc",
            "RTP1": "highwayRoad_subprvnc", 
            "RTP2": "primaryRoad_subprvnc", 
            "RTP3": "secondaryRoad_subprvnc", 
            "RTP4": "tertiaryRoad_subprvnc", 
            "Hospital": "hospital_subprvnc", 
            "GDP": "gdp_subprvnc", 
            "crop_sqm": "cropLands_subprvnc"
        };
        // console.log(entry)

        const elements = ["province_name", "subprovince_name", "female_pop_f1_subprvnc", "female_pop_f2_subprvnc", 
            "female_pop_f3_subprvnc", "male_pop_m1_subprvnc", "male_pop_m2_subprvnc", 
            "male_pop_m3_subprvnc", "highwayRoad_subprvnc", "primaryRoad_subprvnc", "secondaryRoad_subprvnc", 
            "tertiaryRoad_subprvnc", "hospital_subprvnc", "gdp_subprvnc", "cropLands_subprvnc"].map(id => document.querySelector(`#${id}`));

        elements.forEach(el => el.innerHTML = '---');

        if (!entry || Object.keys(entry).length === 0) {
            return;
        }

        const totalMale = entry.M1 + entry.M2 + entry.M3;
        const totalFemale = entry.F1 + entry.F2 + entry.F3;
        const totalPop = totalMale + totalFemale;

        document.querySelector('#total_male_pop_subprvnc').innerHTML = totalMale === 0 ? '---' : totalMale;
        document.querySelector('#total_female_pop_subprvnc').innerHTML = totalFemale === 0 ? '---' : totalFemale;
        document.querySelector('#total_pop_subprvnc').innerHTML = totalPop === 0 ? '---' : totalPop;
        
        elements.forEach(el => {
            // Find corresponding data key from the mapping using the element's ID
            const dataKey = Object.keys(dataKeyToElementIdMap).find(key => dataKeyToElementIdMap[key] === el.id);
        
            const value = entry[dataKey];
        
            if (value === undefined || value <= 0 || el.id.includes('total_')) {
                el.innerHTML = '---';
                return;
            }
        
            el.innerHTML = value;
        });

        const country = entry.country;
        if (country) {
            document.querySelector("#country_name").innerHTML = country;
        } else {
            document.querySelector("#country_name").innerHTML = "---";
        }
    }

    riskLayer.bringToFront();

    var rainfall_cb = document.querySelector('#rainfallCB');
    var mlakes_cb = document.querySelector('#lakesCB');
    var river_cb = document.querySelector('#riverCB');
    var mba_cb = document.querySelector('#mbaCB');
    var subprov_cb = document.querySelector('#subprovinceCB');
    var country_cb = document.querySelector('#countryCB');

    var rainacc = document.querySelector('#rainacc-control-panel')
    
    var tdWmsLayer;
    rainfall_cb.onclick = function() {
        if(this.checked) {
            rainacc.style.display = "block";
            var btnPlay = document.querySelector("#btn-play");
            var btnPrev = document.querySelector("#btn-prev");
            var btnNext = document.querySelector("#btn-next");
            var btnPause = document.querySelector("#btn-pause");

            // Initialize the start date to null
            var startDate = null;
            
            var tdWmsRainLayer = L.tileLayer.wms("https://thredds-servir.adpc.net/thredds/wms/RAINSTORM/rainacc/Rain_accumulation_GSMAP_NOW.nc", {
                layers: 'rain',
                format: 'image/png',
                transparent: true,
                styles: 'boxfill/rainbow',
                opacity:1,
                version:'1.3.0',
                zIndex:100,
                colorscalerange:'0,300',
                bounds: [[0, 90], [22, 120]],
                logscale: false,
                abovemaxcolor:'extend',
                belowmincolor:'extend',
                numcolorbands: 300,
            });

            var timeDimension = new L.TimeDimension();
            map.timeDimension = timeDimension;

            tdWmsLayer = L.timeDimension.layer.wms(tdWmsRainLayer, {
                updateTimeDimension: true,
                setDefaultTime: true,
                cache: 365,
                zIndex: 100,
            });
            
            var firstLoad = 0;

            map.timeDimension.on('timeload', function(data) {
                var date = new Date(map.timeDimension.getCurrentTime());
                if (firstLoad === 0) {
                    // Set the startDate only on the first load
                    startDate = new Date(date); // Clone the date
                    startDate.setDate(startDate.getDate() - 2); // Subtract two days
                    firstLoad = 1;
                }

                // var utc_dt = date.toUTCString();
                // var utcDate = new Date(utc_dt).toISOString().split('T')[0];
                // var utcTime = new Date(utc_dt).getUTCHours();
                // document.querySelector("#date-text").innerHTML = utcDate;
                // document.querySelector("#time-text").innerHTML = utcTime + ":00";

                // Adjust the date to UTC+7 (420 minutes ahead of UTC)
                date.setMinutes(date.getMinutes()); // +420

                // Format the date and time in the UTC+7 time zone
                var options = {
                    timeZone: 'Asia/Bangkok', // UTC+7 (Bangkok)
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                };
                var formattedDateTime = date.toLocaleString('en-US', options);
                document.querySelector("#date-text").innerHTML = formattedDateTime.split(',')[0]; // Display date
                document.querySelector("#time-text").innerHTML = formattedDateTime.split(',')[1]; // Display time
            });

            var player = new L.TimeDimension.Player({
                loop: true,
                startOver: true,
                buffer: 2
            }, timeDimension);

            btnPrev.onclick = (function() {
                map.timeDimension.previousTime(1);
            });

            btnNext.onclick=(function() {
                map.timeDimension.nextTime(1);
            });

            btnPause.style.display = "none";
            btnPlay.style.display = "block";

            btnPlay.onclick=(function() {
                btnPause.style.display = "block";
                btnPlay.style.display = "none";
                if (startDate) {
                    // Start the animation from the dynamically determined startDate
                    map.timeDimension.setCurrentTime(startDate);
                    player.start();
                }
            });

            btnPause.onclick =  (function() {
                btnPause.style.display = "none";
                btnPlay.style.display = "block";
                player.stop();
            });

            map.addLayer(tdWmsLayer);
        } else {
            map.removeLayer(tdWmsLayer);
            rainacc.style.display = "none";
        }
    }
    mlakes_cb.onclick = function(){
        if(this.checked) {
            map.addLayer(mainlakes);
        } else {
            map.removeLayer(mainlakes);
        }
    }
    river_cb.onclick = function() {
        if(this.checked) {
            map.addLayer(river);
        } else {
            map.removeLayer(river);
        }
    }
    mba_cb.onclick = function() {
        if(this.checked) {
            map.addLayer(mekong_basin);
        } else {
            map.removeLayer(mekong_basin);
        }
    }
    subprov_cb.onclick = function() {
        if(this.checked) {
            map.addLayer(subprovince_map);
        } else {
            map.removeLayer(subprovince_map);
        }
    }
    country_cb.onclick = function() {
        if(this.checked) {
            map.addLayer(adm0);
        } else {
            map.removeLayer(adm0);
        }
    }

    /* 
        Basemap Panel
    */

    // Onclick switch basemap 
    var basemap_list = document.querySelectorAll(".basemap-card");

    for (var i = 0; i < basemap_list.length; i++) {
        basemap_list[i].addEventListener("click", function(){
            var elems = document.querySelector(".nav-basemap .active").classList.remove("active");
            let selected_basemap = this.getAttribute('data-layer');
            // console.log(selected_basemap);
            if(selected_basemap === "dark-v10"){
                basemap_layer.setUrl('https://api.mapbox.com/styles/v1/mapbox/dark-v10/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1Ijoia2FtYWxoMjciLCJhIjoiY2t3b2Roc2M3MDF2bDJ2cDY0ZmppdXl0MCJ9.Gn5rUJgaap_KDcnhyROMzQ'); 
                this.className += " active";
            }else if (selected_basemap === "streets-v11"){
                basemap_layer.setUrl('https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1Ijoia2FtYWxoMjciLCJhIjoiY2t3b2Roc2M3MDF2bDJ2cDY0ZmppdXl0MCJ9.Gn5rUJgaap_KDcnhyROMzQ');
                this.className += " active";
            }else if (selected_basemap === "satellite-streets-v12"){
                basemap_layer.setUrl('https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1Ijoia2FtYWxoMjciLCJhIjoiY2t3b2Roc2M3MDF2bDJ2cDY0ZmppdXl0MCJ9.Gn5rUJgaap_KDcnhyROMzQ');
                this.className += " active";
            }else if(selected_basemap === "satellite-v9"){
                basemap_layer.setUrl('https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/512/{z}/{x}/{y}?access_token=pk.eyJ1Ijoia2FtYWxoMjciLCJhIjoiY2t3b2Roc2M3MDF2bDJ2cDY0ZmppdXl0MCJ9.Gn5rUJgaap_KDcnhyROMzQ');
                this.className += " active";
            }else if(selected_basemap === "light-v10"){
                basemap_layer.setUrl('https://api.mapbox.com/styles/v1/mapbox/light-v10/tiles/512/{z}/{x}/{y}?access_token=pk.eyJ1Ijoia2FtYWxoMjciLCJhIjoiY2t3b2Roc2M3MDF2bDJ2cDY0ZmppdXl0MCJ9.Gn5rUJgaap_KDcnhyROMzQ');
                this.className += " active";
            }else if(selected_basemap === "outdoors-v11"){
                basemap_layer.setUrl('https://api.mapbox.com/styles/v1/mapbox/outdoors-v11/tiles/512/{z}/{x}/{y}?access_token=pk.eyJ1Ijoia2FtYWxoMjciLCJhIjoiY2t3b2Roc2M3MDF2bDJ2cDY0ZmppdXl0MCJ9.Gn5rUJgaap_KDcnhyROMzQ');
                this.className += " active";
            }else if(selected_basemap === "mb-galaxy"){
                basemap_layer.setUrl('https://api.mapbox.com/styles/v1/kamalh27/cl6d9l03u004o14paq58pbjmc/tiles/512/{z}/{x}/{y}?access_token=pk.eyJ1Ijoia2FtYWxoMjciLCJhIjoiY2t3b2Roc2M3MDF2bDJ2cDY0ZmppdXl0MCJ9.Gn5rUJgaap_KDcnhyROMzQ');
                this.className += " active";
            }else if(selected_basemap === "osm"){
                basemap_layer.setUrl('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'); 
                this.className += " active";
            }else if((selected_basemap === "street")){
                this.className += " active";
                basemap_layer.setUrl('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}');
            }else if(selected_basemap === "satellite"){
                this.className += " active";
                basemap_layer.setUrl('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}');
            }else if(selected_basemap === "terrain"){
                this.className += " active";
                basemap_layer.setUrl('https://server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}');
            }
            else if(selected_basemap === "topo"){
                this.className += " active";
                basemap_layer.setUrl('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png');
            }
            else if(selected_basemap === "dark"){
                this.className += " active";
                basemap_layer.setUrl('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png');
            }
            else if(selected_basemap === "gray"){
                this.className += " active";
                basemap_layer.setUrl('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}');
            }   
        })
    }

    var btmClose = document.querySelector('.bottomClose');
    var bottombarContent = document.querySelector('#bottom-tabContent');
    btmClose.onclick = function(){
        // alert('click')
        if (getComputedStyle(bottombarContent).display === "none"){
            bottombarContent.style.display ="block";
        } else {
            bottombarContent.style.display ="none";
        }
    }

    var bottom_filter = document.querySelector('#bottomFilter');
    bottom_filter.onclick = function(){
        // alert('click')
        if (getComputedStyle(bottombarContent).display === "none"){
            bottombarContent.style.display ="block";
        }
    }

    var bottom_layer = document.querySelector('#bottomLayer');
    bottom_layer.onclick = function(){
        // alert('click')
        if (getComputedStyle(bottombarContent).display === "none"){
            bottombarContent.style.display ="block";
        }
    }
    var bottom_basemap = document.querySelector('#bottomBasemap');
    bottom_basemap.onclick = function(){
        // alert('click')
        if (getComputedStyle(bottombarContent).display === "none"){
            bottombarContent.style.display ="block";
        } 
    }

    var bottom_basemap_list = document.querySelectorAll(".bottom-basemap-card");
    for (var i = 0; i < bottom_basemap_list.length; i++) {
        bottom_basemap_list[i].addEventListener("click", function(){
            var elems = document.querySelector(".bottom-nav-basemap .active").classList.remove("active");
            let selected_basemap = this.getAttribute('data-layer');
            // console.log(selected_basemap);
            if(selected_basemap === "dark-v10"){
                basemap_layer.setUrl('https://api.mapbox.com/styles/v1/mapbox/dark-v10/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1Ijoia2FtYWxoMjciLCJhIjoiY2t3b2Roc2M3MDF2bDJ2cDY0ZmppdXl0MCJ9.Gn5rUJgaap_KDcnhyROMzQ'); 
                this.className += " active";
            }else if (selected_basemap === "streets-v11"){
                basemap_layer.setUrl('https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1Ijoia2FtYWxoMjciLCJhIjoiY2t3b2Roc2M3MDF2bDJ2cDY0ZmppdXl0MCJ9.Gn5rUJgaap_KDcnhyROMzQ');
                this.className += " active";
            }else if (selected_basemap === "satellite-streets-v12"){
                basemap_layer.setUrl('https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1Ijoia2FtYWxoMjciLCJhIjoiY2t3b2Roc2M3MDF2bDJ2cDY0ZmppdXl0MCJ9.Gn5rUJgaap_KDcnhyROMzQ');
                this.className += " active";
            }else if(selected_basemap === "satellite-v9"){
                basemap_layer.setUrl('https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/512/{z}/{x}/{y}?access_token=pk.eyJ1Ijoia2FtYWxoMjciLCJhIjoiY2t3b2Roc2M3MDF2bDJ2cDY0ZmppdXl0MCJ9.Gn5rUJgaap_KDcnhyROMzQ');
                this.className += " active";
            }else if(selected_basemap === "light-v10"){
                basemap_layer.setUrl('https://api.mapbox.com/styles/v1/mapbox/light-v10/tiles/512/{z}/{x}/{y}?access_token=pk.eyJ1Ijoia2FtYWxoMjciLCJhIjoiY2t3b2Roc2M3MDF2bDJ2cDY0ZmppdXl0MCJ9.Gn5rUJgaap_KDcnhyROMzQ');
                this.className += " active";
            }else if(selected_basemap === "outdoors-v11"){
                basemap_layer.setUrl('https://api.mapbox.com/styles/v1/mapbox/outdoors-v11/tiles/512/{z}/{x}/{y}?access_token=pk.eyJ1Ijoia2FtYWxoMjciLCJhIjoiY2t3b2Roc2M3MDF2bDJ2cDY0ZmppdXl0MCJ9.Gn5rUJgaap_KDcnhyROMzQ');
                this.className += " active";
            }else if(selected_basemap === "mb-galaxy"){
                basemap_layer.setUrl('https://api.mapbox.com/styles/v1/kamalh27/cl6d9l03u004o14paq58pbjmc/tiles/512/{z}/{x}/{y}?access_token=pk.eyJ1Ijoia2FtYWxoMjciLCJhIjoiY2t3b2Roc2M3MDF2bDJ2cDY0ZmppdXl0MCJ9.Gn5rUJgaap_KDcnhyROMzQ');
                this.className += " active";
            }else if(selected_basemap === "osm"){
                basemap_layer.setUrl('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'); 
                this.className += " active";
            }else if((selected_basemap === "street")){
                this.className += " active";
                basemap_layer.setUrl('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}');
            }else if(selected_basemap === "satellite"){
                this.className += " active";
                basemap_layer.setUrl('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}');
            }else if(selected_basemap === "terrain"){
                this.className += " active";
                basemap_layer.setUrl('https://server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}');
            }
            else if(selected_basemap === "topo"){
                this.className += " active";
                basemap_layer.setUrl('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png');
            }
            else if(selected_basemap === "dark"){
                this.className += " active";
                basemap_layer.setUrl('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png');
            }
            else if(selected_basemap === "gray"){
                this.className += " active";
                basemap_layer.setUrl('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}');
            }   
        })
    }
    /** End Basemap Panel */
});