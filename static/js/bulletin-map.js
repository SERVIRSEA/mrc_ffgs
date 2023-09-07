document.addEventListener("DOMContentLoaded", function() {
    const MapOtions = {
        center: [15.9162, 102.9560],
        zoom: 5,
        zoomControl: false,
        scrollWheelZoom: false,
        minZoom: 5,
    }

    const basemapUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}';
    const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">Esri | OpenStreetMap</a> contributors';

    var mrcBasinDataCache = {};
    const url = '/static/data/mekong_mrcffg_basins.geojson';

    async function getMRCBasin() {
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

    const bulletin_map_data = {};
    const bulletin_map_data_url = 'http://127.0.0.1:8000/get-mrcffg-bulletin-map-data/';

    async function getBulletinMapData() {
        try {
            const date = "2023-09-04";
            const response = await fetch(bulletin_map_data_url);
            const data = await response.json();
            bulletin_map_data[date] = data;
            return data;
        } catch (error) {
            console.error('Error:', error);
        }
    }

    async function createMap(param) {
        const ffgData = await getBulletinMapData();
        const basinData = await getMRCBasin();
        let dataArray = JSON.parse(ffgData);
    
        const yellow = '#FFFF00';
        const lightGreen = '#90EE90';
        const lightBlue = '#ADD8E6';
        const blue = '#0000FF';
        const orange = '#FFA500';
        const red = '#FF0000';
        const deepSkyBlue = '#00BFFF';
        const green = '#008000';
        const violet = '#EE82EE';
        const white = '#FFFFFF';
        const weight = 1;
        const opacity = 1;
        const fillOpacity = 0.1;
    
        function getValue(basin_id, param) {
            try {
                const filterArr = dataArray.filter(x => x.BASIN == basin_id);
                if(filterArr.length > 0 && filterArr[0].hasOwnProperty(param)) {
                    return filterArr[0][param];
                }
            } catch (error) {
                console.error('Error:', error);
            }
            return null;
        }
    
        if(param == "ASMT") {
            L.geoJSON(basinData, {
                style: function(feature) {
                    const basin_id = feature.properties.value;
                    const ffgVal = getValue(basin_id, param);
                    if(ffgVal !== null) {
                        if(ffgVal > 0.01 && ffgVal <= 0.65) {
                            return { color: yellow, weight: weight, opacity: opacity, fillOpacity: fillOpacity };
                        } 
                        else if(ffgVal > 0.65 && ffgVal <= 0.9) {
                            return { color: lightGreen, weight: weight, opacity: opacity, fillOpacity: 0.3 };
                        } 
                        else if(ffgVal > 0.9 && ffgVal <= 1.0) {
                            return { color: blue, weight: weight, opacity: opacity, fillOpacity: fillOpacity };
                        } 
                        else {
                            return { color: white, weight: weight, opacity: opacity, fillOpacity: fillOpacity };
                        }  
                    } else {
                        return { color: white, weight: weight, opacity: opacity, fillOpacity: fillOpacity };  
                    }
                }
            }).addTo(asm6hrMap);
        } else if (param == "MAP24"){
            L.geoJSON(basinData, {
                style: function(feature) {
                    const basin_id = feature.properties.value;
                    const ffgVal = getValue(basin_id, param);
                    if(ffgVal !== null) {
                        if(ffgVal <= 10){
                            return { color: lightBlue, weight: weight, opacity: opacity, fillOpacity: fillOpacity };
                        }
                        else if(ffgVal > 10 && ffgVal <= 50){
                            return { color: blue, weight: weight, opacity: opacity, fillOpacity: fillOpacity };
                        }
                        else if(ffgVal > 50 && ffgVal <= 100){
                            return { color: deepSkyBlue, weight: weight, opacity: opacity, fillOpacity: fillOpacity };
                        }
                        else if(ffgVal > 100){
                            return { color: lightGreen, weight: weight, opacity: opacity, fillOpacity: fillOpacity };
                        }
                        else{
                            return { color: white, weight: weight, opacity: opacity, fillOpacity: fillOpacity };
                        }
                    } else {
                        return { color: white, weight: weight, opacity: opacity, fillOpacity: fillOpacity };  
                    }
                }
            }).addTo(map24hrMap);
        } else if (param == "FMAP06"){
            L.geoJSON(basinData, {
                style: function(feature) {
                    const basin_id = feature.properties.value;
                    const ffgVal = getValue(basin_id, param);
                    if(ffgVal !== null) {
                        if(ffgVal <= 7.5){
                            return { color: lightBlue, weight: weight, opacity: opacity, fillOpacity: fillOpacity };
                        }
                        else if(ffgVal > 7.5 && ffgVal <= 35){
                            return { color: blue, weight: weight, opacity: opacity, fillOpacity: fillOpacity };
                        }
                        else if(ffgVal > 35 && ffgVal <= 70){
                            return { color: deepSkyBlue, weight: weight, opacity: opacity, fillOpacity: fillOpacity };
                        }
                        else if(ffgVal > 70){
                            return { color: lightGreen, weight: weight, opacity: opacity, fillOpacity: fillOpacity };
                        }
                        else{
                            return { color: white, weight: weight, opacity: opacity, fillOpacity: fillOpacity };
                        }
                    } else {
                        return { color: white, weight: weight, opacity: opacity, fillOpacity: fillOpacity };  
                    }
                }
            }).addTo(fmap6hrMap);
        } else if (param == "FFG06"){
            L.geoJSON(basinData, {
                style: function(feature) {
                    const basin_id = feature.properties.value;
                    const ffgVal = getValue(basin_id, param);
                    if(ffgVal !== null) {
                        if(ffgVal <= 15){
                            return { color: violet, weight: weight, opacity: opacity, fillOpacity: fillOpacity };
                        }
                        else if(ffgVal > 15 && ffgVal <= 30){
                            return { color: red, weight: weight, opacity: opacity, fillOpacity: fillOpacity };
                        }
                        else if(ffgVal > 30 && ffgVal <= 60){
                            return { color: yellow, weight: weight, opacity: opacity, fillOpacity: fillOpacity };
                        }
                        else if(ffgVal > 60 && ffgVal <= 100){
                            return { color: lightGreen, weight: weight, opacity: opacity, fillOpacity: fillOpacity };
                        } 
                        else {
                            return { color: white, weight: weight, opacity: opacity, fillOpacity: fillOpacity };
                        }
                    } else {
                        return { color: white, weight: weight, opacity: opacity, fillOpacity: fillOpacity };  
                    }
                }
            }).addTo(ffg6hrMap);
        } else if (param == "FFFT06"){
            L.geoJSON(basinData, {
                style: function(feature) {
                    const basin_id = feature.properties.value;
                    const ffgVal = getValue(basin_id, param);
                    if(ffgVal !== null) {
                        if(ffgVal > 0.01 && ffgVal <= 10){
                            return { color: yellow, weight: weight, opacity: opacity, fillOpacity: fillOpacity };
                        }
                        else if(ffgVal > 10 && ffgVal <= 40){
                            return { color: orange, weight: weight, opacity: opacity, fillOpacity: fillOpacity };
                        }
                        else if(ffgVal > 40 && ffgVal <= 100){
                            return { color: red, weight: weight, opacity: opacity, fillOpacity: fillOpacity };
                        }
                        else {
                            return { color: white, weight: weight, opacity: opacity, fillOpacity: fillOpacity };
                        }
                    } else {
                        return { color: white, weight: weight, opacity: opacity, fillOpacity: fillOpacity };  
                    }
                }
            }).addTo(ffft6hrMap);
        } else if (param == "FFR12"){
            L.geoJSON(basinData, {
                style: function(feature) {
                    const basin_id = feature.properties.value;
                    const ffgVal = getValue(basin_id, param);
                    if(ffgVal !== null) {
                        if(ffgVal > 0.01 && ffgVal <= 0.2){
                            return { color: red, weight: weight, opacity: opacity, fillOpacity: fillOpacity };
                        }
                        else if(ffgVal > 0.2 && ffgVal <= 0.4){
                            return { color: orange, weight: weight, opacity: opacity, fillOpacity: fillOpacity };
                        }
                        else if(ffgVal > 0.4 && ffgVal <= 1){
                            return { color: yellow, weight: weight, opacity: opacity, fillOpacity: fillOpacity };
                        }
                        else {
                            return { color: white, weight: weight, opacity: opacity, fillOpacity: fillOpacity };
                        }
                    } else {
                        return { color: white, weight: weight, opacity: opacity, fillOpacity: fillOpacity };  
                    }
                }
            }).addTo(ffr12hrMap);
        } else if (param == "FFR24"){
            L.geoJSON(basinData, {
                style: function(feature) {
                    const basin_id = feature.properties.value;
                    const ffgVal = getValue(basin_id, param);
                    if(ffgVal !== null) {
                        if(ffgVal > 0.01 && ffgVal <= 0.2){
                            return { color: red, weight: weight, opacity: opacity, fillOpacity: fillOpacity };
                        }
                        else if(ffgVal > 0.2 && ffgVal <= 0.4){
                            return { color: orange, weight: weight, opacity: opacity, fillOpacity: fillOpacity };
                        }
                        else if(ffgVal > 0.4 && ffgVal <= 1){
                            return { color: yellow, weight: weight, opacity: opacity, fillOpacity: fillOpacity };
                        }
                        else {
                            return { color: white, weight: weight, opacity: opacity, fillOpacity: fillOpacity };
                        }
                    } else {
                        return { color: white, weight: weight, opacity: opacity, fillOpacity: fillOpacity };  
                    }
                }
            }).addTo(ffr24hrMap);
        }
        
    }
    
    const asm6hrMap = L.map('asm6hr', MapOtions);
    L.tileLayer(basemapUrl, {tileSize: 256, attribution: attribution}).addTo(asm6hrMap);

    const map24hrMap = L.map('map24hr', MapOtions);
    L.tileLayer(basemapUrl, {tileSize: 256, attribution: attribution}).addTo(map24hrMap);

    const fmap6hrMap = L.map('fmap6hr', MapOtions);
    L.tileLayer(basemapUrl, {tileSize: 256, attribution: attribution}).addTo(fmap6hrMap);
    
    const ffg6hrMap = L.map('ffg6hr', MapOtions);
    L.tileLayer(basemapUrl, {tileSize: 256, attribution: attribution}).addTo(ffg6hrMap);

    const ffft6hrMap = L.map('ffft6hr', MapOtions);
    L.tileLayer(basemapUrl, {tileSize: 256, attribution: attribution}).addTo(ffft6hrMap);


    const ffr12hrMap = L.map('ffr12hr', MapOtions);
    L.tileLayer(basemapUrl, {tileSize: 256, attribution: attribution}).addTo(ffr12hrMap);

    const ffr24hrMap = L.map('ffr24hr', MapOtions);
    L.tileLayer(basemapUrl, {tileSize: 256, attribution: attribution}).addTo(ffr24hrMap);

    // Call the function for different parameters:
    createMap("ASMT");
    createMap("MAP24");
    createMap("FMAP06");
    createMap("FFG06");
    createMap("FFFT06");
    createMap("FFR12");
    createMap("FFR24");
});