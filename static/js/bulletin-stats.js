document.addEventListener("DOMContentLoaded", function() {
    const storms_url = 'get-storms/';
    const storms_by_country_url = 'get-storms-number-by-country/'
    
    async function getStorms() {
        try {
            const response = await fetch(storms_url);
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error:', error);
        }
    }

    async function getStormsByCountry() {
        try {
            const response = await fetch(storms_by_country_url);
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error:', error);
        }
    }

    async function generateGraph() {
        const data = await getStorms();
        const stormsData = JSON.parse(data);

        const data_by_country = await getStormsByCountry();
        const stormsCountryData = JSON.parse(data_by_country);

        let findEventsByCountry = (country) => {
            let countryData = stormsCountryData.find(item => item.country === country);
            return countryData ? countryData.events : 0;
        }

        let cambodiaEvent = findEventsByCountry("Cambodia");
        let laosEvent = findEventsByCountry("Laos");
        let thailandEvent = findEventsByCountry("Thailand");
        let vietnamEvent = findEventsByCountry("Vietnam");

        const totalEvents = cambodiaEvent + laosEvent + thailandEvent + vietnamEvent;

        document.querySelector("#cambodiaStorms").innerHTML = cambodiaEvent;
        document.querySelector("#laosStorms").innerHTML = laosEvent;
        document.querySelector("#thailandStorms").innerHTML = thailandEvent;
        document.querySelector("#vietnamStorms").innerHTML = vietnamEvent;
        
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
    generateGraph();

    /**
    * A cache object to store the 6 hour alert statistical data.
    */
    let alert6hrsDataCache = {};

    /**
    * A cache object to store the 12 hour risk statistical data.
    */
    let risk12hrsDataCache = {};

    /**
    * A cache object to store the 24 hour risk statistical data.
    */
    let risk24hrsDataCache = {};

    // URL endpoints for fetching statistical data
    const alert_stat_6hrs_data_url = 'get-alert-stat-6hrs/';
    const risk_stat_12hrs_data_url = 'get-risk-stat-12hrs/';
    const risk_stat_24hrs_data_url = 'get-risk-stat-24hrs/';

    /**
    * Fetches 6 hour alert statistical data from the server or retrieves it from the cache.
    * 
    * @async
    * @returns {Promise<object>} - The fetched statistical data.
    */

    async function getStat6Hrs() {
        try {
            if (Object.keys(alert6hrsDataCache).length !== 0) {
                return alert6hrsDataCache;
            }
            const response = await fetch(alert_stat_6hrs_data_url);
            const data = await response.json();
            alert6hrsDataCache = data;
            return data;
        } catch (error) {
            console.error('Error:', error);
        }
    }

    /**
    * Fetches 12 hour risk statistical data from the server or retrieves it from the cache.
    * 
    * @async
    * @returns {Promise<object>} - The fetched statistical data.
    */
    async function getStat12Hrs() {
        try {
            if (Object.keys(risk12hrsDataCache).length !== 0) {
                return risk12hrsDataCache;
            }
            const response = await fetch(risk_stat_12hrs_data_url);
            const data = await response.json();
            risk12hrsDataCache = data;
            return data;
        } catch (error) {
            console.error('Error:', error);
        }
    }

    /**
     * Fetches 24 hour risk statistical data from the server or retrieves it from the cache.
     * 
     * @async
     * @returns {Promise<object>} - The fetched statistical data.
    */
    async function getStat24Hrs() {
        try {
            if (Object.keys(risk24hrsDataCache).length !== 0) {
                return risk24hrsDataCache;
            }
            const response = await fetch(risk_stat_24hrs_data_url);
            const data = await response.json();
            risk24hrsDataCache = data;
            return data;
        } catch (error) {
            console.error('Error:', error);
        }
    }

    /**
     * Processes the fetched data and updates an HTML table with the processed data.
     * 
     * @async
     * @param {object} dataToProcess - The statistical data to be processed.
    */

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
    
        const parsed_data = JSON.parse(dataToProcess);
    
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
    
    /**
     * Event listener for fetching and displaying 6-hour alert statistical data.
     */
    document.getElementById("tab6hrs").addEventListener("click", async function() {
        const data = await getStat6Hrs();
        updateTable(data);
    });
    
    /**
     * Event listener for fetching and displaying 12-hour risk statistical data.
     */
    document.getElementById("tab12hrs").addEventListener("click", async function() {
        const data = await getStat12Hrs();
        updateTable(data);
    });
    
    /**
     * Event listener for fetching and displaying 24-hour risk statistical data.
     */
    document.getElementById("tab24hrs").addEventListener("click", async function() {
        const data = await getStat24Hrs();
        updateTable(data);
    });

    // Load initial data for 6hrs
    (async function() {
        const initialData = await getStat6Hrs();
        updateTable(initialData);
    })();

    async function updateCountryTable(){
        const data_6hrs = await getStat6Hrs();
        const parsed_data_6hrs = JSON.parse(data_6hrs);
        // console.log(parsed_data_6hrs);

        const data_12hrs = await getStat12Hrs();
        const parsed_data_12hrs = JSON.parse(data_12hrs);

        const data_24hrs = await getStat24Hrs();
        const parsed_data_24hrs = JSON.parse(data_24hrs);

        const CambodiaISO = "KHM";
        const LaosISO = "LAO";
        const ThailandISO = "THA";
        const VietnamISO = "VNM";

        const khmTable06 = document.getElementById('khmTable06');
        const khmTable12 = document.getElementById('khmTable12');
        const khmTable24 = document.getElementById('khmTable24');

        const laoTable06 = document.getElementById('laoTable06');
        const laoTable12 = document.getElementById('laoTable12');
        const laoTable24 = document.getElementById('laoTable24');

        const thaTable06 = document.getElementById('thaTable06');
        const thaTable12 = document.getElementById('thaTable12');
        const thaTable24 = document.getElementById('thaTable24');

        const vnmTable06 = document.getElementById('vnmTable06');
        const vnmTable12 = document.getElementById('vnmTable12');
        const vnmTable24 = document.getElementById('vnmTable24');

        const khmTable06tbody = document.createElement('tbody');
        const khmTable12tbody = document.createElement('tbody');
        const khmTable24tbody = document.createElement('tbody');

        const laoTable06tbody = document.createElement('tbody');
        const laoTable12tbody = document.createElement('tbody');
        const laoTable24tbody = document.createElement('tbody');

        const thaTable06tbody = document.createElement('tbody');
        const thaTable12tbody = document.createElement('tbody');
        const thaTable24tbody = document.createElement('tbody');

        const vnmTable06tbody = document.createElement('tbody');
        const vnmTable12tbody = document.createElement('tbody');
        const vnmTable24tbody = document.createElement('tbody');

        khmTable06.appendChild(khmTable06tbody);
        khmTable12.appendChild(khmTable12tbody);
        khmTable24.appendChild(khmTable24tbody);

        laoTable06.appendChild(laoTable06tbody);
        laoTable12.appendChild(laoTable12tbody);
        laoTable24.appendChild(laoTable24tbody);

        thaTable06.appendChild(thaTable06tbody);
        thaTable12.appendChild(thaTable12tbody);
        thaTable24.appendChild(thaTable24tbody);

        vnmTable06.appendChild(vnmTable06tbody);
        vnmTable12.appendChild(vnmTable12tbody);
        vnmTable24.appendChild(vnmTable24tbody);

        const lowColor = 'yellow';
        const moderateColor = 'orange';
        const highColor = 'pink';

        const filtered6HrsDataKHM = parsed_data_6hrs.filter(item => item.ISO === CambodiaISO);
        const filtered6HrsDataLAO = parsed_data_6hrs.filter(item => item.ISO === LaosISO);
        const filtered6HrsDataTHA = parsed_data_6hrs.filter(item => item.ISO === ThailandISO);
        const filtered6HrsDataVNM = parsed_data_6hrs.filter(item => item.ISO === VietnamISO);
        
        const filtered12HrsDataKHM = parsed_data_12hrs.filter(item => item.ISO === CambodiaISO);
        const filtered12HrsDataLAO = parsed_data_12hrs.filter(item => item.ISO === LaosISO);
        const filtered12HrsDataTHA = parsed_data_12hrs.filter(item => item.ISO === ThailandISO);
        const filtered12HrsDataVNM = parsed_data_12hrs.filter(item => item.ISO === VietnamISO);
        
        const filtered24HrsDataKHM = parsed_data_24hrs.filter(item => item.ISO === CambodiaISO);
        const filtered24HrsDataLAO = parsed_data_24hrs.filter(item => item.ISO === LaosISO);
        const filtered24HrsDataTHA = parsed_data_24hrs.filter(item => item.ISO === ThailandISO);
        const filtered24HrsDataVNM = parsed_data_24hrs.filter(item => item.ISO === VietnamISO);

        // ================= For Cambodia Table ================================>
        // 06 Hrs
        if (filtered6HrsDataKHM.length === 0) {
            const row = khmTable06tbody.insertRow();
            for (let i = 0; i < 9; i++) {
                const cell = row.insertCell(i);
                cell.innerHTML = '---';
            }
        } else {
            filtered6HrsDataKHM.forEach(item => {
                const row = khmTable06tbody.insertRow();
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
                cellLevel.innerHTML = item.Alert_6Hrs || '---';
                cellFemalePopulation.innerHTML = parseFloat(item.F1) + parseFloat(item.F2) + parseFloat(item.F3) || '---';
                cellMalePopulation.innerHTML = parseFloat(item.M1) + parseFloat(item.M2) + parseFloat(item.M3) || '---';
                cellRoad.innerHTML = (parseFloat(item.RTP1) + parseFloat(item.RTP2) + parseFloat(item.RTP3) + parseFloat(item.RTP4)).toFixed(2) || '---'; 
                cellHospital.innerHTML = parseFloat(item.Hospital) || '---'; 
                cellGDP.innerHTML = parseFloat(item.GDP) || '---';
                cellCropLands.innerHTML = parseFloat(item.crop_sqm) || '---'; 

                if (item.Alert_6Hrs === 'Low') {
                    cellLevel.style.backgroundColor = lowColor ;
                } else if(item.Alert_6Hrs === 'Moderate'){
                    cellLevel.style.backgroundColor = moderateColor;
                } else if(item.Alert_6Hrs === 'High'){
                    cellLevel.style.backgroundColor = highColor;
                } 
            });
        }

        // 12 Hrs
        if (filtered12HrsDataKHM.length === 0) {
            const row = khmTable12tbody.insertRow();
            for (let i = 0; i < 9; i++) {
                const cell = row.insertCell(i);
                cell.innerHTML = '---';
            }
        } else {
            filtered12HrsDataKHM.forEach(item => {
                const row = khmTable12tbody.insertRow();
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
                cellLevel.innerHTML = item.Risk_12Hrs || '---';
                cellFemalePopulation.innerHTML = parseFloat(item.F1) + parseFloat(item.F2) + parseFloat(item.F3) || '---';
                cellMalePopulation.innerHTML = parseFloat(item.M1) + parseFloat(item.M2) + parseFloat(item.M3) || '---';
                cellRoad.innerHTML = (parseFloat(item.RTP1) + parseFloat(item.RTP2) + parseFloat(item.RTP3) + parseFloat(item.RTP4)).toFixed(2) || '---'; 
                cellHospital.innerHTML = parseFloat(item.Hospital) || '---'; 
                cellGDP.innerHTML = parseFloat(item.GDP) || '---';
                cellCropLands.innerHTML = parseFloat(item.crop_sqm) || '---';  

                if (item.Risk_12Hrs === 'Low') {
                    cellLevel.style.backgroundColor = lowColor ;
                } else if(item.Risk_12Hrs === 'Moderate'){
                    cellLevel.style.backgroundColor = moderateColor;
                } else if(item.Risk_12Hrs === 'High'){
                    cellLevel.style.backgroundColor = highColor;
                } 
            });
        }

        // 24 Hrs
        if (filtered24HrsDataKHM.length === 0) {
            const row = khmTable24tbody.insertRow();
            for (let i = 0; i < 9; i++) {
                const cell = row.insertCell(i);
                cell.innerHTML = '---';
            }
        } else {
            filtered24HrsDataKHM.forEach(item => {
                const row = khmTable24tbody.insertRow();
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
                cellLevel.innerHTML = item.Risk_24Hrs || '---';
                cellFemalePopulation.innerHTML = parseFloat(item.F1) + parseFloat(item.F2) + parseFloat(item.F3) || '---';
                cellMalePopulation.innerHTML = parseFloat(item.M1) + parseFloat(item.M2) + parseFloat(item.M3) || '---';
                cellRoad.innerHTML = (parseFloat(item.RTP1) + parseFloat(item.RTP2) + parseFloat(item.RTP3) + parseFloat(item.RTP4)).toFixed(2) || '---'; 
                cellHospital.innerHTML = parseFloat(item.Hospital) || '---'; 
                cellGDP.innerHTML = parseFloat(item.GDP) || '---';
                cellCropLands.innerHTML = parseFloat(item.crop_sqm) || '---'; 

                if (item.Risk_24Hrs === 'Low') {
                    cellLevel.style.backgroundColor = lowColor ;
                } else if(item.Risk_24Hrs === 'Moderate'){
                    cellLevel.style.backgroundColor = moderateColor;
                } else if(item.Risk_24Hrs === 'High'){
                    cellLevel.style.backgroundColor = highColor;
                } 
            });
        }

        // ================= For Laos Table ================================>
        // 06 Hrs
        if (filtered6HrsDataLAO.length === 0) {
            const row = laoTable06tbody.insertRow();
            for (let i = 0; i < 9; i++) {
                const cell = row.insertCell(i);
                cell.innerHTML = '---';
            }
        } else {
            filtered6HrsDataLAO.forEach(item => {
                const row = laoTable06tbody.insertRow();
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
                cellLevel.innerHTML = item.Alert_6Hrs || '---';
                cellFemalePopulation.innerHTML = parseFloat(item.F1) + parseFloat(item.F2) + parseFloat(item.F3) || '---';
                cellMalePopulation.innerHTML = parseFloat(item.M1) + parseFloat(item.M2) + parseFloat(item.M3) || '---';
                cellRoad.innerHTML = (parseFloat(item.RTP1) + parseFloat(item.RTP2) + parseFloat(item.RTP3) + parseFloat(item.RTP4)).toFixed(2) || '---'; 
                cellHospital.innerHTML = parseFloat(item.Hospital) || '---'; 
                cellGDP.innerHTML = parseFloat(item.GDP) || '---';
                cellCropLands.innerHTML = parseFloat(item.crop_sqm) || '---'; 

                if (item.Alert_6Hrs === 'Low') {
                    cellLevel.style.backgroundColor = lowColor ;
                } else if(item.Alert_6Hrs === 'Moderate'){
                    cellLevel.style.backgroundColor = moderateColor;
                } else if(item.Alert_6Hrs === 'High'){
                    cellLevel.style.backgroundColor = highColor;
                } 
            });
        }

        // 12 Hrs
        if (filtered12HrsDataLAO.length === 0) {
            const row = laoTable12tbody.insertRow();
            for (let i = 0; i < 9; i++) {
                const cell = row.insertCell(i);
                cell.innerHTML = '---';
            }
        } else {
            filtered12HrsDataLAO.forEach(item => {
                const row = laoTable12tbody.insertRow();
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
                cellLevel.innerHTML = item.Category || '---';
                cellFemalePopulation.innerHTML = parseFloat(item.F1) + parseFloat(item.F2) + parseFloat(item.F3) || '---';
                cellMalePopulation.innerHTML = parseFloat(item.M1) + parseFloat(item.M2) + parseFloat(item.M3) || '---';
                cellRoad.innerHTML = (parseFloat(item.RTP1) + parseFloat(item.RTP2) + parseFloat(item.RTP3) + parseFloat(item.RTP4)).toFixed(2) || '---'; 
                cellHospital.innerHTML = parseFloat(item.Hospital) || '---'; 
                cellGDP.innerHTML = parseFloat(item.GDP) || '---';
                cellCropLands.innerHTML = parseFloat(item.crop_sqm) || '---'; 

                if (item.Risk_12Hrs === 'Low') {
                    cellLevel.style.backgroundColor = lowColor ;
                } else if(item.Risk_12Hrs === 'Moderate'){
                    cellLevel.style.backgroundColor = moderateColor;
                } else if(item.Risk_12Hrs === 'High'){
                    cellLevel.style.backgroundColor = highColor;
                } 
            });
        }

        // 24 Hrs
        if (filtered24HrsDataLAO.length === 0) {
            const row = laoTable24tbody.insertRow();
            for (let i = 0; i < 9; i++) {
                const cell = row.insertCell(i);
                cell.innerHTML = '---';
            }
        } else {
            filtered24HrsDataLAO.forEach(item => {
                const row = laoTable24tbody.insertRow();
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
                cellLevel.innerHTML = item.Risk_24Hrs || '---';
                cellFemalePopulation.innerHTML = parseFloat(item.F1) + parseFloat(item.F2) + parseFloat(item.F3) || '---';
                cellMalePopulation.innerHTML = parseFloat(item.M1) + parseFloat(item.M2) + parseFloat(item.M3) || '---';
                cellRoad.innerHTML = (parseFloat(item.RTP1) + parseFloat(item.RTP2) + parseFloat(item.RTP3) + parseFloat(item.RTP4)).toFixed(2) || '---'; 
                cellHospital.innerHTML = parseFloat(item.Hospital) || '---'; 
                cellGDP.innerHTML = parseFloat(item.GDP) || '---';
                cellCropLands.innerHTML = parseFloat(item.crop_sqm) || '---'; 

                if (item.Risk_24Hrs === 'Low') {
                    cellLevel.style.backgroundColor = lowColor ;
                } else if(item.Risk_24Hrs === 'Moderate'){
                    cellLevel.style.backgroundColor = moderateColor;
                } else if(item.Risk_24Hrs === 'High'){
                    cellLevel.style.backgroundColor = highColor;
                } 
            });
        }

        // ================= For Thailand Table ================================>
        // 06 Hrs
        if (filtered6HrsDataTHA.length === 0) {
            const row = thaTable06tbody.insertRow();
            for (let i = 0; i < 9; i++) {
                const cell = row.insertCell(i);
                cell.innerHTML = '---';
            }
        } else {
            filtered6HrsDataTHA.forEach(item => {
                const row = thaTable06tbody.insertRow();
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
                cellLevel.innerHTML = item.Alert_6Hrs || '---';
                cellFemalePopulation.innerHTML = parseFloat(item.F1) + parseFloat(item.F2) + parseFloat(item.F3) || '---';
                cellMalePopulation.innerHTML = parseFloat(item.M1) + parseFloat(item.M2) + parseFloat(item.M3) || '---';
                cellRoad.innerHTML = (parseFloat(item.RTP1) + parseFloat(item.RTP2) + parseFloat(item.RTP3) + parseFloat(item.RTP4)).toFixed(2) || '---'; 
                cellHospital.innerHTML = parseFloat(item.Hospital) || '---'; 
                cellGDP.innerHTML = parseFloat(item.GDP) || '---';
                cellCropLands.innerHTML = parseFloat(item.crop_sqm) || '---'; 

                if (item.Alert_6Hrs === 'Low') {
                    cellLevel.style.backgroundColor = lowColor ;
                } else if(item.Alert_6Hrs === 'Moderate'){
                    cellLevel.style.backgroundColor = moderateColor;
                } else if(item.Alert_6Hrs === 'High'){
                    cellLevel.style.backgroundColor = highColor;
                } 
            });
        }

        // 12 Hrs
        if (filtered12HrsDataTHA.length === 0) {
            const row = thaTable12tbody.insertRow();
            for (let i = 0; i < 9; i++) {
                const cell = row.insertCell(i);
                cell.innerHTML = '---';
            }
        } else {
            filtered12HrsDataTHA.forEach(item => {
                const row = thaTable12tbody.insertRow();
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
                cellLevel.innerHTML = item.Risk_12Hrs || '---';
                cellFemalePopulation.innerHTML = parseFloat(item.F1) + parseFloat(item.F2) + parseFloat(item.F3) || '---';
                cellMalePopulation.innerHTML = parseFloat(item.M1) + parseFloat(item.M2) + parseFloat(item.M3) || '---';
                cellRoad.innerHTML = (parseFloat(item.RTP1) + parseFloat(item.RTP2) + parseFloat(item.RTP3) + parseFloat(item.RTP4)).toFixed(2) || '---'; 
                cellHospital.innerHTML = parseFloat(item.Hospital) || '---'; 
                cellGDP.innerHTML = parseFloat(item.GDP) || '---';
                cellCropLands.innerHTML = parseFloat(item.crop_sqm) || '---'; 

                if (item.Risk_12Hrs === 'Low') {
                    cellLevel.style.backgroundColor = lowColor ;
                } else if(item.Risk_12Hrs === 'Moderate'){
                    cellLevel.style.backgroundColor = moderateColor;
                } else if(item.Risk_12Hrs === 'High'){
                    cellLevel.style.backgroundColor = highColor;
                } 
            });
        }

        // 24 Hrs
        if (filtered24HrsDataTHA.length === 0) {
            const row = thaTable24tbody.insertRow();
            for (let i = 0; i < 9; i++) {
                const cell = row.insertCell(i);
                cell.innerHTML = '---';
            }
        } else {
            filtered24HrsDataTHA.forEach(item => {
                const row = thaTable24tbody.insertRow();
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
                cellLevel.innerHTML = item.Risk_24Hrs || '---';
                cellFemalePopulation.innerHTML = parseFloat(item.F1) + parseFloat(item.F2) + parseFloat(item.F3) || '---';
                cellMalePopulation.innerHTML = parseFloat(item.M1) + parseFloat(item.M2) + parseFloat(item.M3) || '---';
                cellRoad.innerHTML = (parseFloat(item.RTP1) + parseFloat(item.RTP2) + parseFloat(item.RTP3) + parseFloat(item.RTP4)).toFixed(2) || '---'; 
                cellHospital.innerHTML = parseFloat(item.Hospital) || '---'; 
                cellGDP.innerHTML = parseFloat(item.GDP) || '---';
                cellCropLands.innerHTML = parseFloat(item.crop_sqm) || '---'; 

                if (item.Risk_24Hrs === 'Low') {
                    cellLevel.style.backgroundColor = lowColor ;
                } else if(item.Risk_24Hrs === 'Moderate'){
                    cellLevel.style.backgroundColor = moderateColor;
                } else if(item.Risk_24Hrs === 'High'){
                    cellLevel.style.backgroundColor = highColor;
                } 
            });
        }

        // ================= For Vietnam Table ================================>
        // 06 Hrs
        if (filtered6HrsDataVNM.length === 0) {
            const row = vnmTable06tbody.insertRow();
            for (let i = 0; i < 9; i++) {
                const cell = row.insertCell(i);
                cell.innerHTML = '---';
            }
        } else {
            filtered6HrsDataVNM.forEach(item => {
                const row = vnmTable06tbody.insertRow();
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
                cellLevel.innerHTML = item.Alert_6Hrs || '---';
                cellFemalePopulation.innerHTML = parseFloat(item.F1) + parseFloat(item.F2) + parseFloat(item.F3) || '---';
                cellMalePopulation.innerHTML = parseFloat(item.M1) + parseFloat(item.M2) + parseFloat(item.M3) || '---';
                cellRoad.innerHTML = (parseFloat(item.RTP1) + parseFloat(item.RTP2) + parseFloat(item.RTP3) + parseFloat(item.RTP4)).toFixed(2) || '---'; 
                cellHospital.innerHTML = parseFloat(item.Hospital) || '---'; 
                cellGDP.innerHTML = parseFloat(item.GDP) || '---';
                cellCropLands.innerHTML = parseFloat(item.crop_sqm) || '---'; 

                if (item.Alert_6Hrs === 'Low') {
                    cellLevel.style.backgroundColor = lowColor ;
                } else if(item.Alert_6Hrs === 'Moderate'){
                    cellLevel.style.backgroundColor = moderateColor;
                } else if(item.Alert_6Hrs === 'High'){
                    cellLevel.style.backgroundColor = highColor;
                } 
            });
        }

        // 12 Hrs
        if (filtered12HrsDataVNM.length === 0) {
            const row = vnmTable12tbody.insertRow();
            for (let i = 0; i < 9; i++) {
                const cell = row.insertCell(i);
                cell.innerHTML = '---';
            }
        } else {
            filtered12HrsDataVNM.forEach(item => {
                const row = vnmTable12tbody.insertRow();
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
                cellLevel.innerHTML = item.Risk_12Hrs || '---';
                cellFemalePopulation.innerHTML = parseFloat(item.F1) + parseFloat(item.F2) + parseFloat(item.F3) || '---';
                cellMalePopulation.innerHTML = parseFloat(item.M1) + parseFloat(item.M2) + parseFloat(item.M3) || '---';
                cellRoad.innerHTML = (parseFloat(item.RTP1) + parseFloat(item.RTP2) + parseFloat(item.RTP3) + parseFloat(item.RTP4)).toFixed(2) || '---'; 
                cellHospital.innerHTML = parseFloat(item.Hospital) || '---'; 
                cellGDP.innerHTML = parseFloat(item.GDP) || '---';
                cellCropLands.innerHTML = parseFloat(item.crop_sqm) || '---'; 

                if (item.Risk_12Hrs === 'Low') {
                    cellLevel.style.backgroundColor = lowColor ;
                } else if(item.Risk_12Hrs === 'Moderate'){
                    cellLevel.style.backgroundColor = moderateColor;
                } else if(item.Risk_12Hrs === 'High'){
                    cellLevel.style.backgroundColor = highColor;
                } 
            });
        }

        // 24 Hrs
        if (filtered24HrsDataVNM.length === 0) {
            const row = vnmTable24tbody.insertRow();
            for (let i = 0; i < 9; i++) {
                const cell = row.insertCell(i);
                cell.innerHTML = '---';
            }
        } else {
            filtered24HrsDataVNM.forEach(item => {
                const row = vnmTable24tbody.insertRow();
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
                cellLevel.innerHTML = item.Risk_24Hrs || '---';
                cellFemalePopulation.innerHTML = parseFloat(item.F1) + parseFloat(item.F2) + parseFloat(item.F3) || '---';
                cellMalePopulation.innerHTML = parseFloat(item.M1) + parseFloat(item.M2) + parseFloat(item.M3) || '---';
                cellRoad.innerHTML = (parseFloat(item.RTP1) + parseFloat(item.RTP2) + parseFloat(item.RTP3) + parseFloat(item.RTP4)).toFixed(2) || '---'; 
                cellHospital.innerHTML = parseFloat(item.Hospital) || '---'; 
                cellGDP.innerHTML = parseFloat(item.GDP) || '---';
                cellCropLands.innerHTML = parseFloat(item.crop_sqm) || '---';  

                if (item.Risk_24Hrs === 'Low') {
                    cellLevel.style.backgroundColor = lowColor ;
                } else if(item.Risk_24Hrs === 'Moderate'){
                    cellLevel.style.backgroundColor = moderateColor;
                } else if(item.Risk_24Hrs === 'High'){
                    cellLevel.style.backgroundColor = highColor;
                } 
            });
        }
    }
    updateCountryTable();
});