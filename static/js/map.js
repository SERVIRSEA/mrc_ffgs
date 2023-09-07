document.addEventListener("DOMContentLoaded", function() {

    var openContentPanel = document.querySelector("#home");
    var closeContentPanel = document.querySelector("#close-home-content" );
    var sidebarContent = document.querySelector('#sidebar-content');

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
        
        // document.querySelector('.leaflet-control-scale-line').style.marginLeft = '300px';
    };
    closeContentPanel.onclick = function(){
        sidebarContent.style.display = "none";
        document.querySelector('.leaflet-left').style.marginLeft = '0px';
        // document.querySelector('.leaflet-control-scale-line').style.marginLeft = '0px';
    }
    // Define map center
    var MapOtions = {
        center: [19.9162, 102.9560],
        zoom: 5,
        zoomControl: false,
        minZoom: 5,
        // maxZoom: 14
    }
    // Create a map
    var map = L.map('map', MapOtions);

    // Set default basemap
    var basemap_layer = L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/dark-v10/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1Ijoia2FtYWxoMjciLCJhIjoiY2t3b2Roc2M3MDF2bDJ2cDY0ZmppdXl0MCJ9.Gn5rUJgaap_KDcnhyROMzQ', {
        tileSize: 256,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">Mapbox| OpenStreetMap</a> contributors'
    }).addTo(map);

    // Change zoom control postion to right
    L.control.zoom({
        position: 'topleft'
    }).addTo(map);

    // Add scale control to map
    var scale = L.control.scale({
        position:'bottomleft'
    }).addTo(map);

    var rightSidebarBtn = document.querySelector('#rightSidebar');
    var rightSidebarContent = document.querySelector('#rightSidebarContent');
    var rightSidebarCloseBtn  = document.querySelector('#close-sidebar-content-right');
    var popContent = document.querySelector("#popContent");
    var collapsePop = document.querySelector('#collapsePop');
    var expandPop = document.querySelector('#expandPop');
    var closePop = document.querySelector('#closePop');
    var risk = document.querySelector('#riskList');

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
        popContent.style.height = '55px';
        collapsePop.style.display = 'none';
        expandPop.style.display = 'block';
    }
    expandPop.onclick = function(){
        popContent.style.height = 'calc(100% - 105px)';
        collapsePop.style.display = 'block';
        expandPop.style.display = 'none';
    }
    closePop.onclick = function(){
        popContent.style.display = 'none';
    }

    risk.onclick = function(){
        popContent.style.display = 'block';
    }

    // Caches and URLs for statistical data
    const caches = {
        '6hrs': {},
        '12hrs': {},
        '24hrs': {}
    };
    const urls = {
        '6hrs': 'http://127.0.0.1:8000/get-alert-stat-6hrs/',
        '12hrs': 'http://127.0.0.1:8000/get-risk-stat-12hrs/',
        '24hrs': 'http://127.0.0.1:8000/get-risk-stat-24hrs/'
    };

    // Generic function to fetch data based on the provided duration
    async function getStats(duration) {
        try {
            if (Object.keys(caches[duration]).length !== 0) {
                return caches[duration];
            }
            const response = await fetch(urls[duration]);
            const data = await response.json();
            caches[duration] = data;
            return data;
        } catch (error) {
            console.error('Error:', error);
        }
    }

    // Update the table with statistical data
    async function updateTable(dataToProcess) {
        const parsed_data = JSON.parse(dataToProcess);

        const rightSidebar = document.querySelector("#rightSidebarContent");

        let container = document.getElementById('riskList');
    
        // If container doesn't exist, recreate it
        if (!container) {
            container = document.createElement('div');
            container.id = 'riskList';
            rightSidebar.appendChild(container);  // Append to appropriate parent element
        }
        
        while (container.firstChild) {
            container.removeChild(container.lastChild);
        }

        const errorMessage = document.querySelectorAll('#dataMsg');
    
        // If the array is empty or no data available
        if(!parsed_data || parsed_data.length === 0) {
            const errorMessage = document.createElement('p'); // Create an error message element
            errorMessage.id = 'dataMsg'; // Assign an id if needed
            errorMessage.innerHTML = "No alerts/risks found.";
            container.appendChild(errorMessage); 
    
            // Setting the cursor to not-allowed
            document.documentElement.style.cursor = 'not-allowed';
            return;
        } else {
            document.documentElement.style.cursor = 'auto'; // Reset the cursor to default
            errorMessage.innerHTML = "";
        }
        
        const sortOrder = {
            "High": 1,
            "Medium": 2,
            "Low": 3
        };

        const alertColors = {
            "High": "red",
            "Medium": "orange",
            "Low": "green"
        };
        
        const sortedData = parsed_data.sort((a, b) => {
            // Primary sorting by Alert_6Hrs
            if (sortOrder[a.Alert_6Hrs] !== sortOrder[b.Alert_6Hrs]) {
                return sortOrder[a.Alert_6Hrs] - sortOrder[b.Alert_6Hrs];
            }
            
            // Secondary sorting by ISO
            if (a.ISO < b.ISO) {
                return -1;
            }
            if (a.ISO > b.ISO) {
                return 1;
            }
            return 0;
        });

        sortedData.forEach(entry => {
            const rowDiv = document.createElement('div');
            rowDiv.className = "row mb-2";
        
            const circleDiv = document.createElement('div');
            circleDiv.className = "col-sm-3";
            const circle = document.createElement('p');
            circle.className = 'circle';
            circle.style.backgroundColor = alertColors[entry.Alert_6Hrs];
            circleDiv.appendChild(circle);
            
            const detailsDiv = document.createElement('div');
            detailsDiv.className = "col-sm-9";
            const riskHeader = document.createElement('h5');
            riskHeader.className = 'card-title fw-bold';
            riskHeader.textContent = `${entry.Alert_6Hrs} Risk`;
            detailsDiv.appendChild(riskHeader);
            const countryDetail = document.createElement('p');
            countryDetail.innerHTML = `Country: <span>${entry.ISO}</span><br>Subprovince: <span>${entry.NAME_2}</span>`;
            detailsDiv.appendChild(countryDetail);
            
            rowDiv.appendChild(circleDiv);
            rowDiv.appendChild(detailsDiv);
        
            container.appendChild(rowDiv);

            rowDiv.addEventListener('click', function() {
                displayDetail(entry);
                // console.log(entry);
            });

            function displayDetail(entry){
                const dataKeyToElementIdMap = {
                    "NAME_1": "province_name",
                    "NAME_2": "subprovince_name",
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

                const isoToCountryMap = {
                    "THA": "Thailand",
                    "VNM": "Vietnam",
                    "KHM": "Cambodia",
                    "LAO": "Laos"
                };
                
                const iso = entry.ISO;
                
                const country = isoToCountryMap[iso];
                if (country) {
                    document.querySelector("#country_name").innerHTML = country;
                } else {
                    document.querySelector("#country_name").innerHTML = "---";
                }
            }
        });
    }

    document.getElementById("btnradio06").addEventListener("click", async function() {
        const data = await getStats("6hrs");
        updateTable(data);
    });

    document.getElementById("btnradio12").addEventListener("click", async function() {
        const data = await getStats("12hrs");
        updateTable(data);
    });

    document.getElementById("btnradio24").addEventListener("click", async function() {
        const data = await getStats("24hrs");
        updateTable(data);
    });

    // Fetch and display initial 6-hour data on page load
    (async function init() {
        const data = await getStats('6hrs');
        updateTable(data);
    })();

    // function onEachFeature(feature, subpLayer) {
    //     var district = feature.properties.NAME_2;
    //     var province = feature.properties.NAME_1;
    //     var country = feature.properties.NAME_0;
    //     var f_0_15 = feature.properties.F_0_15;
    //     var f_15_65 = feature.properties.F_15_65;
    //     var f_above_65 = feature.properties.F__65;
    //     var f_total = f_0_15 + f_15_65 + f_above_65;
    //     var m_0_15 = feature.properties.M_0_15;
    //     var m_15_65 = feature.properties.M_15_65;
    //     var m_above_65 = feature.properties.M__65;    
    //     var m_total = m_0_15+m_15_65+m_above_65;
    //     var hospitals = feature.properties.Hospitals;
    //     var primary = feature.properties.Primary;
    //     var secondary = feature.properties.Secondary;
    //     var trunks = feature.properties.Trunks;
    //     var gdp = feature.properties.GDP_in_cur;
    //     var total_building = feature.properties.Bulding_nu;
    //     var cropland = feature.properties.Cropland_E;
        
    //     subpLayer.on('mouseover', function (e) {
    //         this.bindPopup(
    //             '<h4 class="pt-2 pb-2 fw-bold">'+district+', '+province+', '+country+'</h4>'+
    //             '<div class="table-responsive">'+
    //                 '<table class="table">'+
    //                     '<thead>'+
    //                         '<tr class="table-secondary">'+
    //                             '<th>'+"Population"+'</th>'+
    //                             '<th>'+"Female"+'</th>'+
    //                             '<th>'+"Male"+'</th>'+
    //                         '</tr>'+
    //                     '</thead>'+
    //                     '<tbody>' +
    //                         '<tr>'+
    //                             '<td>'+"Age 0-15"+'</td>'+
    //                             '<td>'+f_0_15+'</td>'+
    //                             '<td>'+m_0_15+'</td>'+
    //                         '</tr>'+
    //                         '<tr>'+
    //                             '<td>'+"Age 15-65"+'</td>'+
    //                             '<td>'+f_15_65+'</td>'+
    //                             '<td>'+m_15_65+'</td>'+
    //                         '</tr>'+
    //                         '<tr>'+
    //                             '<td>'+"Age >65"+'</td>'+
    //                             '<td>'+f_above_65+'</td>'+
    //                             '<td>'+m_above_65+'</td>'+
    //                         '</tr>'+
    //                         '<tr>'+
    //                             '<td>'+"Total"+'</td>'+
    //                             '<td>'+f_total+'</td>'+
    //                             '<td>'+m_total+'</td>'+
    //                         '</tr>'+
    //                     '</tbody>'+
    //                     '<thead>'+
    //                         '<tr class="table-secondary">'+
    //                             '<th>'+"Health Facilities"+'</th>'+
    //                             '<th class="text-center" colspan="2">'+"No."+'</th>'+
    //                         '</tr>'+
    //                     '</thead>'+
    //                     '<tbody>'+
    //                         '<tr>'+
    //                             '<td>'+ "Hospitals" +'</td>'+
    //                             '<td class="text-center" colspan="2">'+ hospitals +'</td>'+
    //                         '</tr>'+
    //                     '</tbody>'+
    //                     '<thead>'+
    //                         '<tr class="table-secondary">'+
    //                             '<th>'+"Roads"+'</th>'+
    //                             '<th class="text-center" colspan="2">'+"No."+'</th>'+
    //                         '</tr>'+
    //                     '</thead>'+
    //                     '<tbody>'+
    //                         '<tr>'+
    //                             '<td>'+ "Primary" +'</td>'+
    //                             '<td class="text-center" colspan="2">'+ primary +'</td>'+
    //                         '</tr>'+
    //                         '<tr>'+
    //                             '<td>'+ "Secondary" +'</td>'+
    //                             '<td class="text-center" colspan="2">'+ secondary +'</td>'+
    //                         '</tr>'+
    //                         '<tr>'+
    //                             '<td>'+ "Trunks" +'</td>'+
    //                             '<td class="text-center" colspan="2">'+ trunks +'</td>'+
    //                         '</tr>'+
    //                         '<tr class="table-secondary">'+
    //                             '<th>Economy</th>'+
    //                             '<th>'+""+'</th>'+
    //                             '<th>'+""+'</th>'+
    //                         '</tr>'+
    //                         '<tr>'+
    //                             '<td>GDP</td>'+
    //                             '<td class="text-center" colspan="2">'+gdp+'</td>'+
    //                         '</tr>'+
    //                         '<tr>'+
    //                             '<td>Number of Buildings</td>'+
    //                             '<td class="text-center" colspan="2">'+total_building+'</td>'+
    //                         '</tr>'+
    //                         '<tr>'+
    //                             '<td>Estimated Cropland Area</td>'+
    //                             '<td class="text-center" colspan="2">'+cropland+'</td>'+
    //                         '</tr>'+
    //                     '</tbody>'+
    //                 '</table>'+
    //             '</div>'
    //         )
    //     });
    // }

    const subProvinceCache = {};
    const subprovince_url  = '/static/data/subprovincesFFGS_MK.geojson';

    async function getsubProvinceData() {
        try {
            if (subProvinceCache[url]) {
                return subProvinceCache[url];
            }
            const response = await fetch(subprovince_url);
            const data = await response.json();
            subProvinceCache[subprovince_url] = data;
            return data;
        } catch (error) {
            console.error('Error:', error);
        }
    }

    var mrcBasinDataCache = {};
    const url = '/static/data/mekong_mrcffg_basins.geojson';

    async function getMRCBasinData() {
        try {
            if (mrcBasinDataCache[url]) {
                return mrcBasinDataCache[url];
            }
            const response = await fetch(url);
            const data = await response.json();
            mrcBasinDataCache[url] = data;
            return data;
        } catch (error) {
            console.error('Error:', error);
        }
    }

    let mrcffgDataCache = {};

    async function getMRCFFGData(param) {
        try {
            if (mrcffgDataCache[param]) {
                return mrcffgDataCache[param];
            }
            const mrcffg_url = '/get_mrcffg_value/?param=' + param;
            const response = await fetch(mrcffg_url);
            const data = await response.json();
            mrcffgDataCache[param] = data;
            return data;
        } catch (error) {
            console.error('Error:', error);
        }
    }

    var ffgsLayer = L.geoJSON();
    var subProvinceLayer = L.geoJSON().addTo(map);

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
            {min: 0.65, max: 0.9, color: colors.lightGreen, fillOpacity: 0.3},
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

    function getStyle(param, feature, data) {
        const ffgVal = data.find(x => x && x.BASIN === feature.properties.value)?.[param];
        // console.log(ffgVal)
        const defaultStyle = { color: colors.white, weight: 1, opacity: 1, fillOpacity: 0.5 };
        const paramStyles = styles[param];
        if (!paramStyles) return defaultStyle;
    
        for (let style of paramStyles) {
            if (ffgVal > style.min && ffgVal <= style.max) {
                return { ...defaultStyle, ...style };
            }
        }
        return defaultStyle;
    }

    async function updateSubProvinceMap(param){
        function determineStatsParam(param) {
            switch (param) {
                case "FFG06":
                    return '6hrs';
                case "FFR12":
                    return '12hrs';
                case "FFR24":
                    return '24hrs';
                default:
                    return null;  // or some default value if necessary
            }
        }
    
        const statsParam = determineStatsParam(param);
        if (!statsParam) {
            console.error('Invalid param provided.');
            return;
        }
    
        const data = await getStats(statsParam);
        const parsedData = JSON.parse(data);
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
                    return null;  // or some default value if necessary
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
                    return 'white';
            }
        }
    
        function defineStyle(param, feature){
            const fid = feature.properties.ID_2;
            const cat = getAlertValueById(param, fid);
            const color = getColorbyCategory(cat);
            const defaultStyle = { color: colors.white, weight: 1, opacity: 1, fillOpacity: 0.5 };
            return color ? {...defaultStyle, color} : defaultStyle; 
        }  
    
        subProvinceLayer.clearLayers(); 
        subProvinceLayer.addData(subProvinceData); 
        subProvinceLayer.setStyle(feature => defineStyle(param, feature)); 
    }
    
    updateSubProvinceMap("FFG06");
    // Get all radio buttons with the name 'btnradio'
    let radioButtons = document.querySelectorAll('input[name="btnradio"]');

    const radioMapping = {
        "btnradio06": "FFG06",
        "btnradio12": "FFR12",
        "btnradio24": "FFR24"
    };
    
    radioButtons.forEach(radioButton => {
        radioButton.addEventListener('change', function() {
            if (this.checked && radioMapping[this.id]) {
                updateSubProvinceMap(radioMapping[this.id]);
            }
        });
    });
    
    async function updateMap(param){
        const ffgData = await getMRCFFGData(param);
        const parsed_data = JSON.parse(ffgData);
        const basinData = await getMRCBasinData();
        ffgsLayer.clearLayers();
        ffgsLayer.addData(basinData); // Add new data
        ffgsLayer.setStyle(feature => getStyle(param, feature, parsed_data)); 
    }
    // updateMap('ASMT');

    document.querySelectorAll('input[name="ffpRadio"]').forEach((elem) => {
        elem.addEventListener("change", function() {
            updateMap(this.id);
        });
    });


    const subp_check = document.querySelector("#ffwSubp");
    subp_check.addEventListener("click", ()=> {
        if(subp_check.checked){
            map.addLayer(subProvinceLayer);
        } else {
            map.removeLayer(subProvinceLayer);
        }
    });

    const ffpBasin = document.querySelector('#ffpBasin');
    ffpBasin.addEventListener("click", ()=> {
        if(ffpBasin.checked){
            map.addLayer(ffgsLayer);
        } else {
            map.removeLayer(ffgsLayer);
        }
    });


var adm0;
fetch('/static/data/adm0.geojson')
.then(response => response.json())
.then(data => {
    adm0 = L.geoJSON(data, {
        style: {
            fillColor: '#9999ff',
            weight: 1,
            opacity: 1,
            color: 'white',
            dashArray: '3',
            fillOpacity: 0.1
        }
    });
})
.catch((error) => {
    console.log(error)
});

// Load geographic coverage area Geojson
var storm_boundingbox;
fetch('/static/data/storm_boundingbox.geojson')
.then(response => response.json())
.then(data => {
    storm_boundingbox = L.geoJSON(data, {
        style: {
            fillColor: '#9999ff',
            weight: 2,
            opacity: 1,
            color: 'white',
            dashArray: '3',
            fillOpacity: 0.1
       }
    });
})
.catch((error) => {
    console.log(error)
});

var subprovince_map;
fetch('/static/data/subprovincesFFGS_mekong.geojson')
.then(response => response.json())
.then(data => {
    subprovince_map = L.geoJSON(data, {
        style: {
            fillColor: '#9999ff',
            weight: 1,
            opacity: 1,
            color: 'gray',
            dashArray: '3',
            fillOpacity: 0.1
        }
    });
})
.catch((error) => {
    console.log(error)
});

var risk_subprovince;
fetch('/static/data/subprovincesFFGS_mekong.geojson')
.then(response => response.json())
.then(data => {
    risk_subprovince = L.geoJSON(data, {
        style: {
            fillColor: '#9999ff',
            weight: 1,
            opacity: 1,
            color: '#FFF',
            dashArray: '3',
            fillOpacity: 0.1
        }
    });
//   risk_subprovince.addTo(map);
})
.catch((error) => {
    console.log(error)
});

// Load main lakes Geojson
var mainlakes;
fetch('/static/data/mainlakes_FFGS.geojson')
.then(response => response.json())
.then(data => {
    mainlakes = L.geoJSON(data, {
        style: {
            fillColor: '#40E0D0',
            weight: 0,
            opacity: 0.1,
            color: 'white',
            dashArray: '3',
            fillOpacity: 1
        }
    });
})
.catch((error) => {
    console.log(error)
});

// Load river Geojson
var river;
fetch('/static/data/riverMK_FFGS.geojson')
.then(response => response.json())
.then(data => {
    river = L.geoJSON(data, {
        style: {
            fillColor: '#9999ff',
            weight: 2,
            opacity: 1,
            color: 'blue',
            fillOpacity: 0.1
        }
    });
})
.catch((error) => {
    console.log(error)
});

// Load mekong basin Geojson
var mekong_basin;
fetch('/static/data/mekong_basin_area.geojson')
.then(response => response.json())
.then(data => {
    mekong_basin = L.geoJSON(data, {
        style: {
            fillColor: '#2E86C1',
            weight: 2,
            opacity: 1,
            color: '#333',
            fillOpacity: 0.2
        }
    });
})
.catch((error) => {
    console.log(error)
});

// Load mekong BBox area Geojson
var mekong_bb;
fetch('/static/data/mekong_bb.geojson')
.then(response => response.json())
.then(data => {
    mekong_bb = L.geoJSON(data, {
        style: {
            fillColor: '#9999ff',
            weight: 1,
            opacity: 1,
            color: 'white',
            dashArray: '3',
            fillOpacity: 0.1
        }
    });
})
.catch((error) => {
    console.log(error)
});

// fetch('/static/')
// .then(response => response.json())
// .then(data => {});

// fetch('/static/')
// .then(response => response.json())
// .then(data => {});

var rainfall_cb = document.querySelector('#rainfallCB');
var mlakes_cb = document.querySelector('#lakesCB');
var river_cb = document.querySelector('#riverCB');
var mba_cb = document.querySelector('#mbaCB');
var subprov_cb = document.querySelector('#subprovinceCB');
var gc_cb = document.querySelector('#gcCB');
var lmbb_cb = document.querySelector('#lmbbCB');
var country_cb = document.querySelector('#countryCB');

var rainacc = document.querySelector('#rainacc-control-panel')

rainfall_cb.onclick = function() {
    if(this.checked) {
        var tdWmsLayer;
        rainacc.style.display = "block";
        var btnPlay = document.querySelector("#btn-play");
        var btnPrev = document.querySelector("#btn-prev");
        var btnNext = document.querySelector("#btn-next");
        var btnPause = document.querySelector("#btn-pause");
        
        var tdWmsRainLayer = L.tileLayer.wms("https://thredds-servir.adpc.net/thredds/wms/RAINSTORM/rainacc/Rain_accumulation_GSMAP_NOW.nc", {
            layers: 'rain',
            format: 'image/png',
            transparent: true,
            styles: 'boxfill/rainbow',
            opacity:1,
            version:'1.3.0',
            zIndex:100,
            colorscalerange:'0,150',
            bounds: [[0, 90], [22, 120]],
            logscale: false,
            abovemaxcolor:'extend',
            belowmincolor:'extend',
            numcolorbands: 150,
        });

        var timeDimension = new L.TimeDimension();
            map.timeDimension = timeDimension;

        var player = new L.TimeDimension.Player({
            loop: true,
            startOver: true
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
        });

        btnPause.onclick =  (function() {
            btnPause.style.display = "none";
            btnPlay.style.display = "block";
        });

        tdWmsLayer = L.timeDimension.layer.wms(tdWmsRainLayer, {
            updateTimeDimension: true,
            setDefaultTime: true,
            cache: 365,
            zIndex: 100,
        });
        tdWmsLayer.addTo(map);

        var firstLoad = 0;
        map.timeDimension.on('timeload', function(data) {
            var date = new Date(map.timeDimension.getCurrentTime());
            // console.log(date)
            // console.log(date.toUTCString())
            // console.log(date.toLocaleString('en-GB'));
            
            var utc_dt = date.toUTCString();
            var utcDate = new Date(utc_dt).toISOString().split('T')[0];
            var utcTime = new Date(utc_dt).getUTCHours();
            // console.log(utcDate)
            // console.log(new Date(utc_dt).getUTCHours())
            // document.querySelector("#date-text").html(moment(date).tz(zone).utc().format("YYYY/MM/DD"));
            // document.querySelector("#time-text").html(moment(date).tz(zone).utc().format('HH:mm'));
            document.querySelector("#date-text").innerHTML = utcDate;
            document.querySelector("#time-text").innerHTML = utcTime + ":00";

            firstLoad += 1;
        });
    } else {
        // map.removeLayer();
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
gc_cb.onclick = function() {
    if(this.checked) {
        map.addLayer(storm_boundingbox);
    } else {
        map.removeLayer(storm_boundingbox);
    }
}
lmbb_cb.onclick = function() {
    if(this.checked) {
        map.addLayer(mekong_bb);
    } else {
        map.removeLayer(mekong_bb);
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
    // basemap_list[i].onclick = function (){
    //     var elems = document.querySelector(".nav-basemap .active").classList.remove("active");
    //     console.log(elems)
        
    //     let selected_basemap = this.getAttribute('data-layer');
        
    //     //console.log(selected_basemap);
    //     if(selected_basemap === "osm"){
    //         basemap_layer.setUrl('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'); 
    //         this.className += " active";
    //     }else if((selected_basemap === "street")){
    //         this.className += " active";
    //         basemap_layer.setUrl('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}');
    //     }else if(selected_basemap === "satellite"){
    //         this.className += " active";
    //         basemap_layer.setUrl('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}');
    //     }else if(selected_basemap === "terrain"){
    //         this.className += " active";
    //         basemap_layer.setUrl('https://server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}');
    //     }
    //     else if(selected_basemap === "topo"){
    //         this.className += " active";
    //         basemap_layer.setUrl('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png');
    //     }
    //     else if(selected_basemap === "dark"){
    //         this.className += " active";
    //         basemap_layer.setUrl('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png');
    //     }
    //     else if(selected_basemap === "gray"){
    //         this.className += " active";
    //         basemap_layer.setUrl('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}');
    //     }     
    // }
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